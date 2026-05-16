"use client";

/**
 * /real-guided (6/10) — Fading 완성
 *
 * Phase 3-B: 진입 안내 + 3분 시간 제한.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { TimeoutWarning } from "@/components/voice/TimeoutWarning";
import { MODE_TIMEOUTS, useTimeout } from "@/lib/interaction/timeoutManager";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function RealGuidedPage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const [warningOpen, setWarningOpen] = React.useState(false);
  const advance = React.useCallback(() => router.push("/real-free"), [router]);

  const { extend } = useTimeout({
    timeoutMs: MODE_TIMEOUTS.realGuided,
    onWarning: () => setWarningOpen(true),
    onExpire: advance,
  });

  React.useEffect(() => {
    if (!ready) return;
    setMode("realGuided");
    setStep(6);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder]);

  if (!ready) return null;

  return (
    <>
      <KioskFrame currentStep={6} title="Real Guided — 실전 1단계">
        <ModeBanner
          eyebrow="Fading 완성 단계"
          headline="이번엔 카페 소음도 들리는 환경이에요."
          detail="정해진 시나리오로 한 번 더 연습해 봐요. 도담은 호출하실 때만 도와드려요. (3분 제한)"
        />
        <VoiceCoach
          message={[VOICE_SCRIPTS.realGuided.intro, VOICE_SCRIPTS.realGuided.ambient]}
          sequenceGapMs={800}
        />
        <OrderFlow
          mode="realGuided"
          nextLabel="Real Free"
          onAdvance={advance}
        />
      </KioskFrame>
      <TimeoutWarning
        open={warningOpen}
        onExtend={() => extend(60_000)}
        onProceed={advance}
        onClose={() => setWarningOpen(false)}
      />
    </>
  );
}
