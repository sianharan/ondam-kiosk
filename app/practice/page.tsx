"use client";

/**
 * /practice (4/10) — Coaching 모드
 *
 * PROJECT_DESIGN.md 4.2 Practice(Coaching).
 * AI 도움 80% (Phase 4 에서 구현).
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function PracticePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);

  React.useEffect(() => {
    setMode("practice");
    setStep(4);
    resetOrder();
  }, [setMode, setStep, resetOrder]);

  return (
    <KioskFrame currentStep={4} title="Practice — 직접 해보기">
      <ModeBanner
        eyebrow="Coaching 단계"
        headline="이번엔 직접 주문해 보세요."
        detail="도담이 옆에서 도와드려요. 천천히 골라도 괜찮아요."
      />
      <OrderFlow
        mode="practice"
        nextLabel="Challenge"
        onAdvance={() => router.push("/challenge")}
      />
    </KioskFrame>
  );
}
