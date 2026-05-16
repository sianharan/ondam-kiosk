"use client";

/**
 * /tutorial (3/10) — Modeling 모드
 *
 * Phase 3-B: VoiceCoach 진입 안내 (도담의 따라하기 멘트). 시간 제한은 무제한.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function TutorialPage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);

  React.useEffect(() => {
    setMode("tutorial");
    setStep(3);
    resetOrder();
  }, [setMode, setStep, resetOrder]);

  return (
    <KioskFrame currentStep={3} title="Tutorial — 함께 배워보기">
      <ModeBanner
        eyebrow="Modeling 단계"
        headline="도담이 먼저 아메리카노 주문 과정을 보여드릴게요."
        detail="지금은 따라보기 단계예요. 천천히 한 번 클릭으로 흐름을 익혀봐요."
      />
      <VoiceCoach message={VOICE_SCRIPTS.tutorial.intro} />
      <OrderFlow
        mode="tutorial"
        nextLabel="Practice"
        onAdvance={() => router.push("/practice")}
      />
    </KioskFrame>
  );
}
