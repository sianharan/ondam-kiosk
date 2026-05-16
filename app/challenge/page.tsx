"use client";

/**
 * /challenge (5/10) — Scaffolding & Fading
 *
 * PROJECT_DESIGN.md 4.2 Challenge.
 * AI 도움 40% — 학습자가 막힐 때만 (Phase 4).
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function ChallengePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);

  React.useEffect(() => {
    setMode("challenge");
    setStep(5);
    resetOrder();
  }, [setMode, setStep, resetOrder]);

  return (
    <KioskFrame currentStep={5} title="Challenge — 도전해보기">
      <ModeBanner
        eyebrow="Scaffolding & Fading 단계"
        headline="도담의 도움이 줄어들어요. 스스로 해보세요."
        detail="결제 수단도 한 가지 늘어났어요. 카드와 모바일 페이 중에서 골라보세요."
      />
      <OrderFlow
        mode="challenge"
        nextLabel="Real Guided"
        onAdvance={() => router.push("/real-guided")}
      />
    </KioskFrame>
  );
}
