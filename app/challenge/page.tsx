"use client";

/**
 * /challenge (5/10) — Scaffolding & Fading
 *
 * Phase 3-B: 진입 안내 + 4분 시간 제한.
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

export default function ChallengePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const [warningOpen, setWarningOpen] = React.useState(false);
  const advance = React.useCallback(() => router.push("/real-guided"), [router]);

  const { extend } = useTimeout({
    timeoutMs: MODE_TIMEOUTS.challenge,
    onWarning: () => setWarningOpen(true),
    onExpire: advance,
  });

  React.useEffect(() => {
    if (!ready) return;
    setMode("challenge");
    setStep(5);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder]);

  if (!ready) return null;

  return (
    <>
      <KioskFrame currentStep={5} title="Challenge — 도전해보기">
        <ModeBanner
          eyebrow="Scaffolding & Fading 단계"
          headline="도담의 도움이 줄어들어요. 스스로 해보세요."
          detail="결제 수단도 한 가지 늘어났어요. 카드와 모바일 페이 중에서 골라보세요. (4분 제한)"
        />
        <VoiceCoach message={VOICE_SCRIPTS.challenge.intro} />
        <OrderFlow
          mode="challenge"
          nextLabel="Real Guided"
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
