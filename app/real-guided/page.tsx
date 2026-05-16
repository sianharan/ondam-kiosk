"use client";

/**
 * /real-guided (6/10) — Fading 완성
 *
 * PROJECT_DESIGN.md 4.2 Real Guided.
 * 실세계 소음(60dB)·도움 최소화는 Phase 4·5 에서 구현.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function RealGuidedPage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);

  React.useEffect(() => {
    setMode("realGuided");
    setStep(6);
    resetOrder();
  }, [setMode, setStep, resetOrder]);

  return (
    <KioskFrame currentStep={6} title="Real Guided — 실전 1단계">
      <ModeBanner
        eyebrow="Fading 완성 단계"
        headline="이번엔 카페 소음도 들리는 환경이에요."
        detail="정해진 시나리오로 한 번 더 연습해 봐요. 도담은 호출하실 때만 도와드려요."
      />
      <OrderFlow
        mode="realGuided"
        nextLabel="Real Free"
        onAdvance={() => router.push("/real-free")}
      />
    </KioskFrame>
  );
}
