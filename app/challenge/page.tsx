"use client";

/**
 * /challenge (5/10) — Scaffolding & Fading
 *
 * Phase 4-B: 자동 안내가 줄어든 만큼 학습자 주도성을 위해 HintButton 도입.
 *   - 진입 안내는 짧게 (modeIntro = challengeIntro)
 *   - 카테고리/메뉴 화면은 'normal' verbosity 로 ENTRY_SEQUENCE 유지하되,
 *     OptionPanel/CartSidebar 의 짧은 자동 안내도 그대로 (normal)
 *   - 15초 동안 학습자 행동이 없을 때 HintButton 노출, 사용 시 stage 별 힌트 발화
 *   - 4분 시간 제한 + 20초 전 연장 경고 유지 (KS X 9211 8.2.2)
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { HintButton } from "@/components/kiosk/HintButton";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import {
  OrderFlow,
  type OrderFlowStage,
} from "@/components/kiosk/OrderFlow";
import { MicButton } from "@/components/voice/MicButton";
import { TimeoutWarning } from "@/components/voice/TimeoutWarning";
import { MODE_TIMEOUTS, useTimeout } from "@/lib/interaction/timeoutManager";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

const CHALLENGE_INTRO =
  "이번엔 도움을 줄여볼게요. 도담의 안내가 줄어들 거예요. 막히면 힌트 버튼을 눌러주세요.";

const CHALLENGE_HINTS: Record<OrderFlowStage, string> = {
  category: "메뉴 카테고리에서 원하시는 것을 두 번 두드리면 돼요.",
  menu: "메뉴 카드를 한 번 두드리면 설명, 두 번이면 선택이에요.",
  options:
    "온도와 사이즈를 선택해주세요. 잘 모르겠으면 톨로 시작하시면 돼요.",
  cart: "장바구니가 맞으면 결제하기 버튼을 두 번 두드려주세요.",
  payment: "원하시는 결제 수단을 두 번 두드려 선택해주세요.",
  receipt: "",
};

export default function ChallengePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const config = getModeConfig("challenge");

  const [warningOpen, setWarningOpen] = React.useState(false);
  const [stage, setStage] = React.useState<OrderFlowStage>("category");

  const advance = React.useCallback(
    () => router.push("/real-guided"),
    [router],
  );

  const { extend } = useTimeout({
    timeoutMs: MODE_TIMEOUTS.challenge,
    onWarning: () => setWarningOpen(true),
    onExpire: advance,
  });

  React.useEffect(() => {
    if (!ready) return;
    setMode("challenge");
    setStep(config.step);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder, config.step]);

  if (!ready) return null;

  const showHint = stage !== "receipt" && CHALLENGE_HINTS[stage].length > 0;

  return (
    <>
      <KioskFrame currentStep={config.step} title={config.title}>
        <ModeBanner
          eyebrow={`${config.philosophy} 단계`}
          headline="도담의 도움이 줄어들어요. 스스로 해보세요."
          detail="결제 수단도 한 가지 늘어났어요. 카드와 모바일 페이 중에서 골라보세요. (4분 제한)"
          helpLevel={config.helpLevel}
        />
        <OrderFlow
          mode="challenge"
          nextLabel="Real Guided"
          modeIntro={CHALLENGE_INTRO}
          onAdvance={advance}
          onStageChange={setStage}
        />
        {showHint && (
          <div className="mt-6">
            <HintButton
              hintText={CHALLENGE_HINTS[stage]}
              appearAfterMs={15_000}
              position="inline"
            />
          </div>
        )}
      </KioskFrame>
      <TimeoutWarning
        open={warningOpen}
        onExtend={() => extend(60_000)}
        onProceed={advance}
        onClose={() => setWarningOpen(false)}
      />
      {/* HintButton(inline) 과 별개로 음성 호출 채널을 항상 열어둔다 —
          학습자가 시각·청각 두 방식을 자유롭게 선택. */}
      <MicButton context="challenge" position="floating" />
    </>
  );
}
