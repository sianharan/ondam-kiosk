"use client";

/**
 * /tutorial (3/10) — Modeling 모드
 *
 * Phase 4-A 변경: enableAutoDemo === true 일 때, 학습자 입력 없이 도담이
 * 아메리카노 주문 과정을 자동으로 시연(Modeling)한다.  시연이 끝나면 자동으로
 * /practice 로 넘어가 Coaching 단계가 시작된다.
 *
 * 시간 제한 없음(MODE_CONFIGS.tutorial.timeoutMs = null) — Modeling 은 학습자가
 * 충분히 따라잡을 시간을 주는 것이 핵심이다.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { AutoDemo } from "@/components/kiosk/AutoDemo";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function TutorialPage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const config = getModeConfig("tutorial");

  const goPractice = React.useCallback(() => {
    router.push("/practice");
  }, [router]);

  React.useEffect(() => {
    if (!ready) return;
    setMode("tutorial");
    setStep(config.step);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder, config.step]);

  if (!ready) return null;

  return (
    <KioskFrame currentStep={config.step} title={config.title}>
      <ModeBanner
        eyebrow={`${config.philosophy} 단계`}
        headline="도담이 먼저 아메리카노 주문 과정을 보여드릴게요."
        detail="지금은 도담이 시연해드릴게요. 천천히 들으면서 흐름을 익혀봐요."
        helpLevel={config.helpLevel}
      />
      {config.enableAutoDemo ? (
        <AutoDemo onComplete={goPractice} onSkip={goPractice} />
      ) : (
        <OrderFlow
          mode="tutorial"
          nextLabel="Practice"
          modeIntro={VOICE_SCRIPTS.tutorial.intro}
          onAdvance={goPractice}
        />
      )}
    </KioskFrame>
  );
}
