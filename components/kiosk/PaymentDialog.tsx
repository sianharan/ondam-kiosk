"use client";

/**
 * PaymentDialog — 결제 시뮬레이션 다이얼로그
 *
 * Phase 3-B 음성 통합
 *   - select      : "결제 수단을 선택해주세요" 자동 발화 + 각 수단 VoiceButton
 *   - instruction : 수단별 안내 자동 발화 + "결제 시작" VoiceButton
 *   - processing  : "결제를 처리하고 있어요" 1회 발화
 *   - complete    : "결제 완료. 주문번호 47번" 자동 발화 + "확인" VoiceButton
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
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import {
  PAYMENT_OPTIONS,
  type PaymentMethod,
} from "@/lib/kiosk-data/payment";
import { useOrderStore } from "@/stores/orderStore";
import { cn } from "@/lib/utils";

type Stage = "select" | "instruction" | "processing" | "complete";

const PROCESSING_DURATION_MS = 3000;
const FAKE_ORDER_NUMBER = 47;

export interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  availablePayments: PaymentMethod[];
}

export function PaymentDialog({
  open,
  onClose,
  availablePayments,
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

    const done = setTimeout(() => {
      completePayment(FAKE_ORDER_NUMBER);
      setStage("complete");
    }, PROCESSING_DURATION_MS);

    return () => {
      clearInterval(interval);
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
}

function SelectStage({ visiblePayments, onPick }: SelectStageProps) {
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

      <VoiceCoach message={VOICE_SCRIPTS.payment.selectMethod} />

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

      <VoiceCoach message={option.voiceInstruction} />

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

      <VoiceCoach message={VOICE_SCRIPTS.payment.processing} />

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

      <VoiceCoach message={VOICE_SCRIPTS.payment.complete(orderNumber)} />

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
        음료가 준비되면 알려드릴게요.
      </p>

      <VoiceButton
        voiceLabel="확인 버튼이에요. 두 번 두드리면 결제 화면이 닫혀요."
        onActivate={onDone}
        variant="secondary"
        className="mt-2 !px-8 !py-4"
      >
        확인
      </VoiceButton>
    </div>
  );
}
