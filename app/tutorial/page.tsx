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
import { KioskDiagram, type DiagramArea } from "@/components/kiosk/KioskDiagram";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { MicButton } from "@/components/voice/MicButton";
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

  // AutoDemo 현재 단계가 설명하는 영역 → 오른쪽 KioskDiagram 강조 동기화.
  // stepKey 는 펄스 리셋용(같은 영역이 연속돼도 단계 전환을 느끼게).
  const [demoFocus, setDemoFocus] = React.useState<{
    area: DiagramArea | null;
    stepKey: string;
  }>({ area: null, stepKey: "" });

  // 안정된 콜백 — AutoDemo 의 emit effect 가 매 렌더 재실행되지 않도록.
  const handleActiveAreaChange = React.useCallback(
    (area: DiagramArea | null, stepKey: string) => {
      setDemoFocus({ area, stepKey });
    },
    [],
  );

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
    <>
      <KioskFrame currentStep={config.step} title={config.title}>
        <ModeBanner
          eyebrow={`${config.philosophy} 단계`}
          headline="도담이 먼저 아메리카노 주문 과정을 보여드릴게요."
          detail="편하게 들으면서 흐름을 익혀보세요."
          helpLevel={config.helpLevel}
        />
        {config.enableAutoDemo ? (
          // 데스크톱: 왼쪽 시연(대본·단계) + 오른쪽 다이어그램. 좁은 화면: 세로 스택.
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <AutoDemo
              onComplete={goPractice}
              onSkip={goPractice}
              onActiveAreaChange={handleActiveAreaChange}
            />
            {/* 음성 채널(나레이션)이 정보를 전달하므로 다이어그램은 시각 보조 —
                스크린리더 중복을 피해 aria-hidden. 단계별 강조가 대본과 동기화된다. */}
            <aside
              aria-hidden="true"
              className="flex justify-center md:sticky md:top-4 md:justify-start"
            >
              <KioskDiagram
                activeArea={demoFocus.area}
                pulseKey={demoFocus.stepKey}
              />
            </aside>
          </div>
        ) : (
          <OrderFlow
            mode="tutorial"
            nextLabel="Practice"
            modeIntro={VOICE_SCRIPTS.tutorial.intro}
            onAdvance={goPractice}
          />
        )}
      </KioskFrame>
      {/* AutoDemo(시연 자동 재생) 중에는 학습 흐름 중단 방지를 위해 마이크 비노출.
          시연이 끝나 OrderFlow 로 진입했거나, 시연이 비활성화된 변형 모드에서만 노출. */}
      {!config.enableAutoDemo && (
        <MicButton context="tutorial" position="floating" />
      )}
    </>
  );
}
