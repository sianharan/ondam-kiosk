"use client";

/**
 * /real-guided (6/10) — Fading 완성
 *
 * Phase 4-B: voiceVerbosity = 'minimal'.  진입 시 짧은 멘트 하나만 발화하고,
 * 그 이후 카테고리/메뉴/옵션/장바구니 화면의 자동 음성 안내는 전부 생략된다.
 * 학습자는 단일 탭으로 voiceLabel 을 들을 수 있고, 헤더 [다시 듣기] 버튼으로
 * 가장 최근 안내를 다시 들을 수 있다 (KS X 9211 6.3.6).
 *
 *   - PaymentDialog 는 모든 모드에서 안전을 위해 음성 유지 (결제 수단 안내)
 *   - 카페 소음 인지 멘트는 modeIntro 에 한 줄로 합쳐 들려준다
 *   - 3분 시간 제한 + 20초 전 연장 경고 (KS X 9211 8.2.2)
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { MicButton } from "@/components/voice/MicButton";
import { TimeoutWarning } from "@/components/voice/TimeoutWarning";
import { MODE_TIMEOUTS, useTimeout } from "@/lib/interaction/timeoutManager";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

const REAL_GUIDED_INTRO =
  "지금부터는 진짜 카페처럼 해볼게요. 곧 카페 소음이 들리고, 뒤에 다른 손님도 몇 분 계실 수 있어요. 그래도 괜찮아요. 서두르지 않아도 돼요. 천천히 하셔도 아무 문제 없어요. 제가 끝까지 같이 있을게요.";

export default function RealGuidedPage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const config = getModeConfig("realGuided");

  const [warningOpen, setWarningOpen] = React.useState(false);
  const advance = React.useCallback(
    () => router.push("/real-free"),
    [router],
  );

  const { extend } = useTimeout({
    timeoutMs: MODE_TIMEOUTS.realGuided,
    onWarning: () => setWarningOpen(true),
    onExpire: advance,
  });

  React.useEffect(() => {
    if (!ready) return;
    setMode("realGuided");
    setStep(config.step);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder, config.step]);

  if (!ready) return null;

  return (
    <>
      <KioskFrame currentStep={config.step} title={config.title}>
        <ModeBanner
          eyebrow={`${config.philosophy} 단계`}
          headline="이번엔 카페 소음도 들리는 환경이에요."
          detail="도담은 부르실 때만 도와드려요 · 3분"
          helpLevel={config.helpLevel}
        />
        <OrderFlow
          mode="realGuided"
          nextLabel="Real Free"
          modeIntro={REAL_GUIDED_INTRO}
          onAdvance={advance}
        />
      </KioskFrame>
      <TimeoutWarning
        open={warningOpen}
        onExtend={() => extend(60_000)}
        onProceed={advance}
        onClose={() => setWarningOpen(false)}
      />
      {/* Fading 단계 — 도담의 자동 안내는 줄이되, 학습자 호출 채널은 항상 열어둔다. */}
      <MicButton context="real-guided" position="floating" />
    </>
  );
}
