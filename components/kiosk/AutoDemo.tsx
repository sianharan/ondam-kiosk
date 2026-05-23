"use client";

/**
 * AutoDemo — Tutorial(Modeling) 자동 시연 컴포넌트
 *
 * Collins 의 Modeling 단계: "전문가가 과제 수행 및 사고 과정을 외부로 소리 내어
 * 시연"(PROJECT_DESIGN 2.3 #1).  본 컴포넌트는 도담이 아메리카노 따뜻하게 한 잔을
 * 주문하는 전 과정을 학습자 입력 없이 자동으로 진행하면서, 매 단계 사고 과정을
 * 음성으로 외현화한다.
 *
 * 동작 흐름
 *   3초 대기 → 음성 안내 + orderStore 상태 변경 → 다음 단계로
 *
 *   1. 카테고리 (커피)
 *   2. 메뉴 (아메리카노)
 *   3. 온도 (따뜻하게)
 *   4. 사이즈 (톨)
 *   5. 결제 진입 (onCheckout 콜백)
 *   6. 결제 수단 (카드)
 *   7. 완료 (주문번호 발화) → onComplete 콜백
 *
 * 학습자는 [건너뛰기] 버튼으로 시연을 중단하고 다음 단계로 갈 수 있다
 * (학습 자율성 — Collins Sociology 차원).
 *
 * 시각 사용자는 우측 단계 인디케이터와 라이브 주문 카드로 흐름을 따라가고,
 * 시각장애 학습자는 음성으로만 따라간다 (KS X 9211 5.2.2 d).
 */

import * as React from "react";

import { getMenuItem, type MenuItem } from "@/lib/kiosk-data/menu";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/stores/orderStore";
import { useVoiceStore } from "@/stores/voiceStore";

type StepKey =
  | "category"
  | "menu"
  | "temperature"
  | "size"
  | "checkout"
  | "payment"
  | "complete";

interface DemoStep {
  key: StepKey;
  label: string;
  narration: string;
  /** 발화 끝난 뒤 store 변경 — speak resolve 후 호출 */
  apply: () => void;
}

const STEP_DELAY_MS = 3000;
const DEMO_ORDER_NUMBER = 47;

export interface AutoDemoProps {
  /** 어떤 시나리오를 시연할지 식별자 — 현재는 'S1-americano-hot' 만 지원 */
  scenarioId?: string;
  /** 시연 단계 사이 간격 (기본 3초) */
  stepDelayMs?: number;
  /** 학습자가 [건너뛰기] 눌렀을 때.  부모는 onComplete 와 동일 처리해도 OK */
  onSkip?: () => void;
  /** 마지막 단계까지 완료되면 자동 호출 */
  onComplete: () => void;
}

export function AutoDemo({
  scenarioId = "S1-americano-hot",
  stepDelayMs = STEP_DELAY_MS,
  onSkip,
  onComplete,
}: AutoDemoProps) {
  const setCategory = useOrderStore((s) => s.setCategory);
  const setItem = useOrderStore((s) => s.setItem);
  const setTemperature = useOrderStore((s) => s.setTemperature);
  const setSize = useOrderStore((s) => s.setSize);
  const setPayment = useOrderStore((s) => s.setPayment);
  const completePayment = useOrderStore((s) => s.completePayment);

  const isVoiceEnabled = useVoiceStore((s) => s.isEnabled);

  const [stepIndex, setStepIndex] = React.useState(0);
  const [stepStatus, setStepStatus] = React.useState<"waiting" | "speaking" | "applied">(
    "waiting",
  );

  const americano = React.useMemo<MenuItem | undefined>(
    () => getMenuItem("americano"),
    [],
  );

  // ── 시나리오 정의 ─────────────────────────────────────────
  const steps = React.useMemo<DemoStep[]>(() => {
    if (!americano) return [];
    return [
      {
        key: "category",
        label: "카테고리 선택",
        narration:
          "먼저 메뉴 카테고리에서 커피를 골라볼게요. 화면 왼쪽 위 커피 카테고리예요.",
        apply: () => setCategory("coffee"),
      },
      {
        key: "menu",
        label: "메뉴 선택",
        narration:
          "이번엔 아메리카노를 선택할게요. 커피 메뉴 맨 위에 보통 있어요.",
        apply: () => setItem(americano),
      },
      {
        key: "temperature",
        label: "온도 선택",
        narration:
          "따뜻하게 마실 거라 따뜻하게를 선택할게요.",
        apply: () => setTemperature("hot"),
      },
      {
        key: "size",
        label: "사이즈 선택",
        narration: "사이즈는 톨로 할게요.",
        apply: () => setSize("tall"),
      },
      {
        key: "checkout",
        label: "결제 화면",
        narration: "이제 결제하기를 눌러볼게요.",
        // 결제 진입 자체는 별도 store 변경이 필요 없다. 다음 단계에서 setPayment.
        apply: () => {},
      },
      {
        key: "payment",
        label: "결제 수단",
        narration: "카드로 결제할게요. 카드를 단말기 아래쪽 투입구에 꽂아주세요.",
        apply: () => setPayment("card"),
      },
      {
        key: "complete",
        label: "주문 완료",
        narration: `결제가 완료되었어요. 주문번호 ${DEMO_ORDER_NUMBER}번이에요.`,
        apply: () => completePayment(DEMO_ORDER_NUMBER),
      },
    ];
  }, [americano, setCategory, setItem, setTemperature, setSize, setPayment, completePayment]);

  // ── 시연 진행 — 한 단계씩 await ───────────────────────────
  // generation 으로 unmount/재마운트 시 이전 setTimeout 이 store 를 건드리지 않게.
  const generationRef = React.useRef(0);
  const cancelledRef = React.useRef(false);

  React.useEffect(() => {
    generationRef.current += 1;
    cancelledRef.current = false;
    const myGen = generationRef.current;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const runStep = async (idx: number) => {
      if (cancelledRef.current || generationRef.current !== myGen) return;
      if (idx >= steps.length) {
        onComplete();
        return;
      }

      const step = steps[idx];
      setStepIndex(idx);
      setStepStatus("waiting");

      // 1) STEP_DELAY 동안 시각 사용자에게 "준비" 상태 보여주기.
      await new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, stepDelayMs);
      });
      if (cancelledRef.current || generationRef.current !== myGen) return;

      // 2) 발화 — 음성 안내 켜진 학습자에게만.  꺼져 있어도 시연 자체는 진행한다.
      setStepStatus("speaking");
      if (isVoiceEnabled) {
        try {
          await ttsManager.speak(step.narration);
        } catch {
          // TTS 실패해도 시연 흐름은 끊지 않는다 — 시각 + aria-live 로 보완됨.
        }
      }
      if (cancelledRef.current || generationRef.current !== myGen) return;

      // 3) store 적용 (시각 사용자에게는 이 시점에 화면이 변한 것처럼 보임)
      step.apply();
      setStepStatus("applied");

      // 4) 다음 단계 — 짧은 호흡 후
      await new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, 500);
      });
      if (cancelledRef.current || generationRef.current !== myGen) return;

      void runStep(idx + 1);
    };

    void runStep(0);

    return () => {
      cancelledRef.current = true;
      generationRef.current += 1;
      if (timeoutId) clearTimeout(timeoutId);
      ttsManager.stop();
    };
    // steps / stepDelayMs / isVoiceEnabled / onComplete 가 바뀌면 처음부터.
  }, [steps, stepDelayMs, isVoiceEnabled, onComplete]);

  const handleSkip = React.useCallback(() => {
    cancelledRef.current = true;
    generationRef.current += 1;
    ttsManager.stop();
    if (onSkip) onSkip();
    else onComplete();
  }, [onComplete, onSkip]);

  if (!americano) {
    return (
      <p className="text-xl text-foreground/70" role="alert">
        시연에 필요한 메뉴 데이터가 없어요. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  const currentStep = steps[stepIndex] ?? steps[steps.length - 1];

  return (
    <section
      className="flex flex-col gap-5 rounded-2xl border border-foreground/15 bg-background/95 p-6 shadow-sm md:p-8"
      aria-labelledby="auto-demo-title"
      data-scenario={scenarioId}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="auto-demo-title"
            className="text-card-body font-bold text-primary"
          >
            도담이 보여드리는 시연
          </h2>
          <p className="mt-1 text-support text-foreground/70">
            지금은 도담이 먼저 아메리카노 주문 과정을 보여드릴게요. 편하게
            들어주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          aria-label="시연 건너뛰고 직접 해보기로 이동"
          className="shrink-0 rounded-xl bg-secondary px-4 py-2 text-support font-semibold text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none"
        >
          건너뛰기
        </button>
      </header>

      {/* 단계 인디케이터 — 시각 사용자 */}
      <ol className="flex flex-col gap-2" aria-label="시연 진행 단계">
        {steps.map((step, idx) => {
          const isPast = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2",
                isCurrent && "bg-primary/10 ring-1 ring-primary/30",
                isPast && "opacity-60",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  isPast
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground/10 text-foreground/60",
                )}
              >
                {isPast ? "✓" : idx + 1}
              </span>
              <span
                className={cn(
                  "text-support",
                  isCurrent ? "font-semibold text-foreground" : "text-foreground/70",
                )}
              >
                {step.label}
              </span>
              {isCurrent && stepStatus === "speaking" && (
                <span className="ml-auto text-support text-primary">
                  안내 중…
                </span>
              )}
              {isCurrent && stepStatus === "waiting" && (
                <span className="ml-auto text-support text-foreground/50">
                  잠시 후 진행…
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* 현재 발화 — aria-live 로 화면 리더에도 전달 */}
      <div
        className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/20"
        role="status"
        aria-live="polite"
      >
        <span className="text-support font-semibold text-primary">도담</span>
        <p className="mt-1 text-xl leading-snug text-foreground md:text-2xl">
          {currentStep?.narration}
        </p>
      </div>
    </section>
  );
}
