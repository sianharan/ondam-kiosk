"use client";

/**
 * /real-free (7/10) — Exploration ⭐
 *
 * Phase 4-B: voiceVerbosity = 'silent'.  학습자에게 시나리오 정의권이 완전히
 * 이양되는 단계 — 도담은 진입 멘트 한 줄만 들려준 뒤 모든 자동 안내를 멈춘다.
 *
 *   - 카테고리/메뉴/옵션/장바구니 화면의 VoiceCoach 패널은 마운트되지 않음
 *   - 옵션 선택 시의 짧은 피드백("따뜻하게 골랐어요." 등) 도 silent
 *   - 결제 다이얼로그(PaymentDialog) 는 모든 모드에서 음성 안내 유지(안전)
 *   - 시간 제한 없음 (MODE_CONFIGS.realFree.timeoutMs = null)
 *
 * 단일 탭(voiceLabel), 헤더 [다시 듣기], [도움] 호출은 학습자 주도이므로 그대로
 * 작동한다 — 자율 ≠ 정보 차단.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { OrderFlow } from "@/components/kiosk/OrderFlow";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

const REAL_FREE_INTRO =
  "오늘은 어떤 음료를 드시고 싶으세요? 직접 골라보세요. 도담은 옆에서 조용히 응원할게요.";

export default function RealFreePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const config = getModeConfig("realFree");

  React.useEffect(() => {
    if (!ready) return;
    setMode("realFree");
    setStep(config.step);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder, config.step]);

  if (!ready) return null;

  return (
    <KioskFrame currentStep={config.step} title={config.title}>
      <ModeBanner
        eyebrow={`${config.philosophy} 단계`}
        headline="오늘은 어떤 음료를 드시고 싶으세요? 직접 골라보세요."
        detail="이번 주문은 학습자분이 메뉴부터 결제 수단까지 자유롭게 정하실 수 있어요."
        tone="primary"
        helpLevel={config.helpLevel}
      />
      <OrderFlow
        mode="realFree"
        nextLabel="Articulation"
        modeIntro={REAL_FREE_INTRO}
        onAdvance={() => router.push("/articulation")}
      />
    </KioskFrame>
  );
}
