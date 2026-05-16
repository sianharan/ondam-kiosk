"use client";

/**
 * PaymentDialog — 결제 시뮬레이션 다이얼로그 (shadcn/Base UI Dialog)
 *
 * PROJECT_DESIGN.md 5.2 #3 결제 단계 + 7.2 PAYMENT_OPTIONS 기반.
 *
 * 4단계 흐름:
 *   1) select      — 결제 수단 선택 (availablePayments 만 노출)
 *   2) instruction — 수단별 안내 메시지 표시
 *   3) processing  — "결제 중..." (3초, 프로그레스 바)
 *   4) complete    — "결제 완료. 주문번호 47번" → onClose
 *
 * 모드별 결제 수단 제한은 PROJECT_DESIGN 7.2 PAYMENT_BY_MODE 를 통해
 * 부모(페이지)에서 availablePayments 로 주입한다.
 *
 * ⚠️ 본 다이얼로그는 시뮬레이션 전용. 실제 결제 시스템 연동 금지.
 */

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
  /** 다이얼로그 종료 (외부 닫기 + 완료 자동 닫기 공용) */
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
  const [progress, setProgress] = React.useState(0); // 0~100

  // open 이 닫혔다가 다시 열리면 처음부터 — React 공식 "Adjusting state on prop
  // change" 패턴 (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStage("select");
      setChosen(null);
      setProgress(0);
    }
  }

  // ── processing 진입 시 3초 타이머 + 100ms 단위 프로그레스 ──
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

  // 외부에서 닫기 시도: processing 중에는 막고, 나머지는 허용
  const handleOpenChange = (next: boolean) => {
    if (next) return; // 이미 열려있음
    if (stage === "processing") return; // 진행 중에는 닫기 금지
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

      <div
        role="radiogroup"
        aria-label="결제 수단 선택"
        className="flex flex-col gap-3"
      >
        {visiblePayments.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={false}
            aria-label={`${opt.voiceLabel}. ${opt.voiceInstruction}`}
            onClick={() => onPick(opt.id)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border-2 border-foreground/15 bg-background p-5 text-left transition-all",
              "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
            )}
          >
            <span className="text-2xl font-bold text-foreground md:text-[1.75rem]">
              {opt.label}
            </span>
            <span aria-hidden="true" className="text-2xl text-primary">
              →
            </span>
          </button>
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

function InstructionStage({ option, onStart, onBack }: InstructionStageProps) {
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
        <button
          type="button"
          onClick={onBack}
          aria-label="결제 수단 다시 선택하기"
          className="rounded-xl bg-muted px-5 py-3 text-lg font-medium text-foreground/80 ring-1 ring-foreground/10 hover:bg-muted/80 focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
        >
          다시 선택
        </button>
        <button
          type="button"
          onClick={onStart}
          aria-label="결제 시작. 결제가 진행됩니다"
          className={cn(
            "rounded-2xl bg-accent px-8 py-4 text-2xl font-bold text-accent-foreground shadow-md transition-all",
            "hover:-translate-y-0.5 hover:shadow-lg",
            "focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none",
          )}
        >
          결제 시작
        </button>
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

      <div
        role="status"
        aria-live="assertive"
        className="rounded-2xl bg-accent/15 px-8 py-6 ring-1 ring-accent/30"
      >
        <p className="text-xl text-foreground/80 md:text-2xl">주문번호</p>
        <p className="text-5xl font-bold text-primary md:text-6xl">
          {orderNumber}번
        </p>
      </div>

      <p className="text-lg text-foreground/70 md:text-xl">
        음료가 준비되면 알려드릴게요.
      </p>

      <button
        type="button"
        onClick={onDone}
        aria-label="확인하고 다이얼로그 닫기"
        className={cn(
          "mt-2 rounded-2xl bg-primary px-8 py-4 text-2xl font-bold text-primary-foreground shadow-md transition-all",
          "hover:-translate-y-0.5 hover:shadow-lg",
          "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
        )}
      >
        확인
      </button>
    </div>
  );
}
