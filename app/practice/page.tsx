"use client";

/**
 * /practice (4/10) — Coaching 모드
 *
 * Phase 3-B: 진입 안내 + 5분 시간 제한 + 20초 전 연장 경고 (KS X 9211 8.2.2).
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

export default function PracticePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const [warningOpen, setWarningOpen] = React.useState(false);

  const advance = React.useCallback(() => {
    router.push("/challenge");
  }, [router]);

  const { extend } = useTimeout({
    timeoutMs: MODE_TIMEOUTS.practice,
    onWarning: () => setWarningOpen(true),
    onExpire: advance,
  });

  React.useEffect(() => {
    if (!ready) return;
    setMode("practice");
    setStep(4);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder]);

  if (!ready) return null;

  return (
    <>
      <KioskFrame currentStep={4} title="Practice — 직접 해보기">
        <ModeBanner
          eyebrow="Coaching 단계"
          headline="이번엔 직접 주문해 보세요."
          detail="도담이 옆에서 도와드려요. 천천히 골라도 괜찮아요. (5분 제한)"
        />
        <VoiceCoach message={VOICE_SCRIPTS.practice.intro} />
        <OrderFlow
          mode="practice"
          nextLabel="Challenge"
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
