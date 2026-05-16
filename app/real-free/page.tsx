"use client";

/**
 * /real-free (7/10) — Exploration ⭐
 *
 * PROJECT_DESIGN.md 4.2 / 5.2 #7.
 * 시나리오 정의권이 학습자에게 이양되는 단계.
 * 메뉴는 자유 선택 (도담 호출 시에만 도움).
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function RealFreePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);

  React.useEffect(() => {
    setMode("realFree");
    setStep(7);
    resetOrder();
  }, [setMode, setStep, resetOrder]);

  return (
    <KioskFrame currentStep={7} title="Real Free — 자유 주문">
      <ModeBanner
        eyebrow="Exploration 단계"
        headline="오늘은 어떤 음료를 드시고 싶으세요? 직접 골라보세요."
        detail="이번 주문은 학습자분이 메뉴부터 결제 수단까지 자유롭게 정하실 수 있어요."
        tone="primary"
      />
      <OrderFlow
        mode="realFree"
        nextLabel="Articulation"
        onAdvance={() => router.push("/articulation")}
      />
    </KioskFrame>
  );
}
