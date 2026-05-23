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
 *   1초 대기 → 음성 안내(발화가 끝날 때까지) → orderStore 상태 변경 → 다음 단계로
 *   (음성 OFF 인 학습자는 발화 대신 단계마다 최소 머무름 시간을 둔다)
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
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

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

// 발화 전 짧은 "준비" 대기. 대본이 길어 3초 고정 대기는 어색하므로 1초로 단축.
const STEP_DELAY_MS = 1000;
// 음성 안내가 꺼진 학습자용: 발화가 없으니 단계가 순식간에 지나가지 않도록
// 단계마다 최소한 화면에 머무는 시간(저시력 학습자가 인디케이터·주문 카드를 눈으로 따라갈 여유).
const SILENT_STEP_HOLD_MS = 2000;
const DEMO_ORDER_NUMBER = 47;

export interface AutoDemoProps {
  /** 어떤 시나리오를 시연할지 식별자 — 현재는 'S1-americano-hot' 만 지원 */
  scenarioId?: string;
  /** 발화 전 "준비" 대기 (기본 1초) */
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
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  // 최신 음성 설정을 ref 로 — 발화 직전에 읽되, 설정 변경이 시연 진행 effect 를
  // 재시작시키지 않게(주 effect deps 에서 제외).
  const settingsRef = React.useRef({ voice, speed, volume });
  React.useEffect(() => {
    settingsRef.current = { voice, speed, volume };
  }, [voice, speed, volume]);

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
          "처음 보는 키오스크에선, 저는 먼저 전체를 들어봐요. 음료 종류가 맨 위에 네 개 있어요. 커피, 에이드, 티, 디저트요. 틀려도 되돌릴 수 있으니 편하게요. 아메리카노는 커피니까, 커피를 두 번 두드릴게요.",
        apply: () => setCategory("coffee"),
      },
      {
        key: "menu",
        label: "메뉴 선택",
        narration:
          "커피 안으로 들어왔어요. 이제 화면 가운데에 커피 메뉴들이 위에서 아래로 펼쳐져요. 아메리카노는 보통 맨 위에 있어요. 한 번 두드리면 설명을 들려주고, 두 번 두드리면 골라져요. 아메리카노를 두 번 두드릴게요.",
        apply: () => setItem(americano),
      },
      {
        key: "temperature",
        label: "온도 선택",
        narration:
          "메뉴를 고르면 옵션이 나와요. 먼저 온도예요. 따뜻하게와 차갑게 둘 중 하나죠. 아메리카노는 둘 다 되는데, 저는 오늘 따뜻한 걸로 할게요. 따뜻하게를 두 번 두드릴게요.",
        apply: () => setTemperature("hot"),
      },
      {
        key: "size",
        label: "사이즈 선택",
        narration:
          "다음은 사이즈예요. 톨과 그란데가 있어요. 그란데는 오백 원이 더 붙어요. 저는 기본인 톨로 할게요. 톨을 두 번 두드릴게요.",
        apply: () => setSize("tall"),
      },
      {
        key: "checkout",
        label: "결제 화면",
        narration:
          "고를 건 다 골랐어요. 이제 거의 끝났어요. 화면 아래쪽에 결제하기 버튼이 있어요. 그걸 두 번 두드려 결제로 넘어갈게요.",
        // 결제 진입 자체는 별도 store 변경이 필요 없다. 다음 단계에서 setPayment.
        apply: () => {},
      },
      {
        key: "payment",
        label: "결제 수단",
        narration:
          "결제 방법을 고르는 곳이에요. 카드, 모바일페이가 있어요. 저는 카드로 할게요. 카드를 두 번 두드린 다음, 카드를 화면 아래 오른쪽 투입구에 천천히 꽂으면 돼요.",
        apply: () => setPayment("card"),
      },
      {
        key: "complete",
        label: "주문 완료",
        narration: `결제가 끝났어요. 주문번호는 ${DEMO_ORDER_NUMBER}번이에요. 음료가 준비되면 ${DEMO_ORDER_NUMBER}번으로 불러줘요. 자, 이렇게 한 잔이 완성됐어요. 처음엔 낯설어도, 한 번 흐름을 들어두면 다음엔 훨씬 쉬워요. 이제 직접 해보실 거예요.`,
        apply: () => completePayment(DEMO_ORDER_NUMBER),
      },
    ];
  }, [americano, setCategory, setItem, setTemperature, setSize, setPayment, completePayment]);

  // 나레이션 오디오를 마운트 시 미리 받아 둔다(nova).  특히 가장 긴 첫 단계가
  // fetch 지연으로 첫 재생 시점이 자동재생 허용 창을 넘겨 차단되는 문제를 예방 —
  // 미리 캐시에 있으면 1초 대기 직후 즉시 재생된다. (음성 OFF 면 의미 없어 생략)
  React.useEffect(() => {
    if (!isVoiceEnabled || steps.length === 0) return;
    ttsManager.prefetch(
      steps.map((s) => s.narration),
      { voice, speed },
    );
  }, [steps, isVoiceEnabled, voice, speed]);

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

      // 2) 발화 — 음성 안내 켜진 학습자에게만.  발화가 끝날 때까지 await 하므로
      //    대본 길이에 맞춰 자연스럽게 다음 단계로 넘어간다.
      //    음성이 꺼진 학습자는 발화가 없으니, 단계가 순식간에 지나가지 않도록
      //    최소 머무름 시간을 둔다 (저시력 학습자가 화면을 눈으로 따라갈 여유).
      setStepStatus("speaking");
      if (isVoiceEnabled) {
        // 학습자가 고른 음성/속도/음량을 반영 (prefetch 와 같은 키로 캐시 적중).
        const { voice: v, speed: sp, volume: vol } = settingsRef.current;
        ttsManager.setVoice(v);
        ttsManager.setSpeed(sp);
        ttsManager.setVolume(VOLUME_TO_AUDIO[vol]);
        try {
          await ttsManager.speak(step.narration);
        } catch {
          // TTS 실패해도 시연 흐름은 끊지 않는다 — 시각 + aria-live 로 보완됨.
        }
      } else {
        await new Promise<void>((resolve) => {
          timeoutId = setTimeout(resolve, SILENT_STEP_HOLD_MS);
        });
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
