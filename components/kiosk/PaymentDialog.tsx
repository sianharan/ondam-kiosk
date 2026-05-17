"use client";

/**
 * PaymentDialog — 결제 시뮬레이션 다이얼로그
 *
 * Phase 7 음성 안내 강화
 *   - select      : "결제 단계예요. 어떤 방식으로…" 진입 멘트 → "결제 수단을 선택해주세요"
 *                   각 수단 voiceLabel 단일 탭 청취 + 두 번 탭으로 선택
 *   - instruction : 수단별 선택 직후 "OO로 결제할게요…" 발화 + 단말기 안내
 *   - processing  : "잠시만요… 결제가 진행 중이에요" 자동 발화
 *   - complete    : "결제가 완료되었어요" 짧은 마무리 — 영수증 화면은 다이얼로그 외부.
 *
 * Tutorial(autoSimulate)은 AutoDemo 에서 PaymentDialog 를 거치지 않으므로
 * 본 다이얼로그는 Practice/Challenge/RealGuided/RealFree 4개 모드가 공유.
 * 모드별 차별화는 ⟨mode⟩ prop 으로 들어와 진입 멘트와 즉시 피드백을 다르게 한다.
 *
 * ⚠️ 시뮬레이션 전용. 실제 결제 시스템 연동 금지.
 */

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { playPaymentApprovalChime } from "@/lib/audio/paymentSounds";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import {
  PAYMENT_OPTIONS,
  type LearningMode,
  type PaymentMethod,
} from "@/lib/kiosk-data/payment";
import {
  generateFeedback,
  shouldSpeakFeedback,
} from "@/lib/learning/feedbackEngine";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { useOrderStore } from "@/stores/orderStore";
import { cn } from "@/lib/utils";

type Stage = "select" | "instruction" | "processing" | "complete";

const PROCESSING_DURATION_MS = 3000;
/**
 * 승인 효과음 재생 시점 (processing 진입 후 1.5초).
 * VoiceCoach 진입 안내(`processingStart`)가 약 1초 내외이므로
 * 그 뒤에 톤이 떨어지도록 배치 — 안내 음성과 겹치지 않게.
 */
const APPROVAL_CHIME_DELAY_MS = 1500;
const FAKE_ORDER_NUMBER = 47;

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  card: "카드",
  "mobile-pay": "모바일 페이",
  coupon: "쿠폰",
};

const CHOSEN_VOICE: Record<PaymentMethod, string> = {
  card: VOICE_SCRIPTS.payment.chose.card,
  "mobile-pay": VOICE_SCRIPTS.payment.chose.mobilePay,
  coupon: VOICE_SCRIPTS.payment.chose.coupon,
};

export interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  availablePayments: PaymentMethod[];
  /**
   * Phase 7 — 모드별 진입 멘트, 즉시 피드백, 영수증 흐름 차별화.
   * 미지정 시 기본 진입 멘트만 발화 (하위호환).
   */
  mode?: LearningMode;
}

export function PaymentDialog({
  open,
  onClose,
  availablePayments,
  mode,
}: PaymentDialogProps) {
  const setPayment = useOrderStore((s) => s.setPayment);
  const startPayment = useOrderStore((s) => s.startPayment);
  const completePayment = useOrderStore((s) => s.completePayment);
  const isProcessing = useOrderStore((s) => s.isPaymentInProgress);

  const [stage, setStage] = React.useState<Stage>("select");
  const [chosen, setChosen] = React.useState<PaymentMethod | null>(null);
  const [progress, setProgress] = React.useState(0);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStage("select");
      setChosen(null);
      setProgress(0);
    }
  }

  React.useEffect(() => {
    if (stage !== "processing") return;

    const tickMs = 100;
    const steps = PROCESSING_DURATION_MS / tickMs;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 1;
      setProgress(Math.min(100, Math.round((elapsed / steps) * 100)));
    }, tickMs);

    // KS X 9211:2025 5.2.2 d) — 진행 상태를 청각 대체로 알리는 승인 효과음.
    // VoiceCoach 안내 음성이 우선이므로 음량 0.5로 한 단 낮춰 재생.
    const chime = setTimeout(() => {
      playPaymentApprovalChime({ volume: 0.5 });
    }, APPROVAL_CHIME_DELAY_MS);

    const done = setTimeout(() => {
      completePayment(FAKE_ORDER_NUMBER);
      setStage("complete");
    }, PROCESSING_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(chime);
      clearTimeout(done);
    };
  }, [stage, completePayment]);

  const visiblePayments = PAYMENT_OPTIONS.filter((p) =>
    availablePayments.includes(p.id),
  );

  const chosenOption = chosen
    ? PAYMENT_OPTIONS.find((p) => p.id === chosen)
    : null;

  const handlePick = (method: PaymentMethod) => {
    setChosen(method);
    setPayment(method);
    setStage("instruction");

    // Phase 7 — Practice(Coaching) 모드는 결제 수단 선택에도 즉시 칭찬 피드백.
    // Challenge/RealGuided/RealFree 는 silent/delayed 라 generateFeedback 이 null 반환.
    if (mode && shouldSpeakFeedback(mode)) {
      const feedback = generateFeedback(
        { type: "payment_selected", method: PAYMENT_LABEL[method] },
        mode,
      );
      if (feedback) {
        // VoiceCoach 가 곧 자동 발화할 안내문보다 먼저 짧게 칭찬을 끼워 넣는다.
        void ttsManager.speak(feedback);
      }
    }
  };

  const handleStart = () => {
    startPayment();
    setProgress(0);
    setStage("processing");
  };

  const handleDone = () => {
    onClose();
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (stage === "processing") return;
    onClose();
  };

  // 진입 멘트 — 결제 수단 개수에 따라 짧은 버전/긴 버전 선택. 모드와 무관하게
  // 결제 화면은 안전상 항상 음성 안내가 들린다 (Real Guided/Free 도 동일).
  const openLine =
    visiblePayments.length >= 3
      ? VOICE_SCRIPTS.payment.open
      : VOICE_SCRIPTS.payment.openShort;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={stage !== "processing" && stage !== "complete"}
        className="sm:max-w-xl"
      >
        {stage === "select" && (
          <SelectStage
            visiblePayments={visiblePayments}
            onPick={handlePick}
            openLine={openLine}
          />
        )}

        {stage === "instruction" && chosenOption && (
          <InstructionStage
            option={chosenOption}
            onStart={handleStart}
            onBack={() => setStage("select")}
          />
        )}

        {stage === "processing" && (
          <ProcessingStage progress={progress} isProcessing={isProcessing} />
        )}

        {stage === "complete" && (
          <CompleteStage
            orderNumber={FAKE_ORDER_NUMBER}
            onDone={handleDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Stage 1: 결제 수단 선택 ─────────────────────────────────
interface SelectStageProps {
  visiblePayments: typeof PAYMENT_OPTIONS;
  onPick: (method: PaymentMethod) => void;
  /** 결제 단계 진입 안내 — 결제 수단 개수에 따라 다름 */
  openLine: string;
}

function SelectStage({ visiblePayments, onPick, openLine }: SelectStageProps) {
  return (
    <div className="flex flex-col gap-5 p-2">
      <div>
        <DialogTitle className="text-2xl font-bold text-foreground md:text-3xl">
          결제 수단을 골라주세요
        </DialogTitle>
        <DialogDescription className="mt-2 text-lg text-foreground/70 md:text-xl">
          원하시는 결제 방법을 한 가지 선택해주세요.
        </DialogDescription>
      </div>

      <VoiceCoach message={[openLine, VOICE_SCRIPTS.payment.selectMethod]} />

      <div
        role="radiogroup"
        aria-label="결제 수단 선택"
        className="flex flex-col gap-3"
      >
        {visiblePayments.map((opt) => (
          <VoiceButton
            key={opt.id}
            voiceLabel={`${opt.voiceLabel} 결제 버튼이에요. ${opt.voiceInstruction} 두 번 두드리면 이 결제 수단을 골라요.`}
            onActivate={() => onPick(opt.id)}
            variant="ghost"
            className="!px-5 !py-5 text-left !text-2xl md:!text-[1.75rem]"
            ariaLabel={`${opt.voiceLabel}. ${opt.voiceInstruction}`}
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="font-bold text-foreground">{opt.label}</span>
              <span aria-hidden="true" className="text-2xl text-primary">
                →
              </span>
            </span>
          </VoiceButton>
        ))}
      </div>
    </div>
  );
}

// ── Stage 2: 안내 메시지 ────────────────────────────────────
interface InstructionStageProps {
  option: (typeof PAYMENT_OPTIONS)[number];
  onStart: () => void;
  onBack: () => void;
}

function InstructionStage({
  option,
  onStart,
  onBack,
}: InstructionStageProps) {
  return (
    <div className="flex flex-col gap-5 p-2">
      <div>
        <DialogTitle className="text-2xl font-bold text-foreground md:text-3xl">
          {option.label}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {option.voiceInstruction}
        </DialogDescription>
      </div>

      <VoiceCoach
        message={[CHOSEN_VOICE[option.id], option.voiceInstruction]}
      />

      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl bg-accent/10 p-6 ring-1 ring-accent/30"
      >
        <p className="text-xl leading-relaxed text-foreground md:text-2xl">
          {option.voiceInstruction}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:justify-end">
        <VoiceButton
          voiceLabel="결제 수단을 다시 고르고 싶을 때 누르는 버튼이에요. 두 번 두드리면 결제 수단 선택 화면으로 돌아가요."
          onActivate={onBack}
          variant="ghost"
          className="!px-5 !py-3 !text-lg"
        >
          다시 선택
        </VoiceButton>
        <VoiceButton
          voiceLabel="결제 시작 버튼이에요. 두 번 두드리면 결제를 진행해요."
          onActivate={onStart}
          className="!px-8 !py-4"
        >
          결제 시작
        </VoiceButton>
      </div>
    </div>
  );
}

// ── Stage 3: 결제 중 ───────────────────────────────────────
interface ProcessingStageProps {
  progress: number;
  isProcessing: boolean;
}

function ProcessingStage({ progress, isProcessing }: ProcessingStageProps) {
  return (
    <div className="flex flex-col items-center gap-5 p-2 py-4">
      <DialogTitle className="text-2xl font-bold text-foreground md:text-3xl">
        결제 중...
      </DialogTitle>
      <DialogDescription className="sr-only">
        결제를 처리하고 있어요. 잠시만 기다려주세요.
      </DialogDescription>

      <VoiceCoach
        message={[
          VOICE_SCRIPTS.payment.processingStart,
          VOICE_SCRIPTS.payment.processing,
        ]}
      />

      <p
        className="text-xl text-foreground/80 md:text-2xl"
        aria-live="polite"
      >
        잠시만 기다려주세요. {Math.round(progress)} 퍼센트 진행되었어요.
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="결제 진행률"
        className="h-4 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full bg-accent transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="sr-only">{isProcessing ? "결제 진행 중" : "대기 중"}</p>
    </div>
  );
}

// ── Stage 4: 완료 ──────────────────────────────────────────
interface CompleteStageProps {
  orderNumber: number;
  onDone: () => void;
}

function CompleteStage({ orderNumber, onDone }: CompleteStageProps) {
  return (
    <div className="flex flex-col items-center gap-5 p-2 py-4 text-center">
      <DialogTitle className="text-3xl font-bold text-primary md:text-4xl">
        결제 완료!
      </DialogTitle>
      <DialogDescription className="sr-only">
        결제가 완료되었어요. 주문번호 {orderNumber} 번입니다.
      </DialogDescription>

      {/* 짧은 마무리 멘트만 — 큰 주문번호 발화는 영수증 화면(ReceiptScreen)이 담당.
          여기서 길게 발화하면 다이얼로그 닫힘 직후 영수증 음성과 겹친다. */}
      <VoiceCoach message={VOICE_SCRIPTS.payment.processingDone} />

      <div
        role="status"
        aria-live="assertive"
        className={cn(
          "rounded-2xl bg-accent/15 px-8 py-6 ring-1 ring-accent/30",
        )}
      >
        <p className="text-xl text-foreground/80 md:text-2xl">주문번호</p>
        <p className="text-5xl font-bold text-primary md:text-6xl">
          {orderNumber}번
        </p>
      </div>

      <p className="text-lg text-foreground/70 md:text-xl">
        잠시 후 영수증 화면을 보여드릴게요.
      </p>

      <VoiceButton
        voiceLabel="영수증 보기 버튼이에요. 두 번 두드리면 주문번호가 큰 글씨로 보이는 영수증 화면으로 넘어가요."
        onActivate={onDone}
        variant="secondary"
        className="mt-2 !px-8 !py-4"
      >
        영수증 보기
      </VoiceButton>
    </div>
  );
}
