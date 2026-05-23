"use client";

/**
 * /practice (4/10) — Coaching 모드
 *
 * Phase 3-B: 진입 안내 + 5분 시간 제한 + 20초 전 연장 경고 (KS X 9211 8.2.2).
 * Phase 4-A: 학습자의 매 선택(카테고리/메뉴/온도/사이즈/결제)마다 즉시 피드백.
 *   - feedbackEngine.generateFeedback 으로 모드별 멘트 생성
 *   - shouldSpeakFeedback('practice') === true (immediate)
 *   - ttsManager.speak 로 발화 — VoiceCoach 큐 뒤에 자연스럽게 붙음
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
import { CATEGORY_LABEL } from "@/lib/kiosk-data/menu";
import {
  generateFeedback,
  shouldSpeakFeedback,
} from "@/lib/learning/feedbackEngine";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

const PAYMENT_LABEL: Record<string, string> = {
  card: "카드",
  "mobile-pay": "모바일 페이",
  coupon: "쿠폰",
};

export default function PracticePage() {
  const router = useRouter();
  const setMode = useLearningStore((s) => s.setMode);
  const setStep = useLearningStore((s) => s.setStep);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  const config = getModeConfig("practice");

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
    setStep(config.step);
    resetOrder();
  }, [ready, setMode, setStep, resetOrder, config.step]);

  // ── 모드별 즉시 피드백 (Coaching) ─────────────────────────
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const selectedItem = useOrderStore((s) => s.selectedItem);
  const selectedTemperature = useOrderStore((s) => s.selectedTemperature);
  const selectedSize = useOrderStore((s) => s.selectedSize);
  const selectedPayment = useOrderStore((s) => s.selectedPayment);

  // 첫 마운트(이전 모드 잔여 상태) + resetOrder 직후 잡음을 막기 위해
  // 한 ref 에 다섯 필드 묶어서 직전 스냅샷 보관.  setItem 처럼 한 번에 여러
  // 필드가 바뀌는 경우, "어느 한 단계만" 음성으로 짚어 주려고 else-if 체인 사용.
  const prevRef = React.useRef({
    category: selectedCategory,
    itemId: selectedItem?.id ?? null,
    temperature: selectedTemperature,
    size: selectedSize,
    payment: selectedPayment,
  });

  React.useEffect(() => {
    if (!ready) return;
    if (!shouldSpeakFeedback("practice")) return;

    const prev = prevRef.current;
    const currItemId = selectedItem?.id ?? null;
    const itemChanged = currItemId !== prev.itemId;

    let feedback: string | null = null;

    if (selectedCategory && selectedCategory !== prev.category) {
      feedback = generateFeedback(
        {
          type: "category_selected",
          category: CATEGORY_LABEL[selectedCategory],
        },
        "practice",
      );
    } else if (selectedItem && itemChanged) {
      feedback = generateFeedback(
        { type: "menu_selected", itemName: selectedItem.name },
        "practice",
      );
    } else if (
      selectedTemperature &&
      selectedTemperature !== prev.temperature &&
      !itemChanged
    ) {
      // setItem 이 단일 온도 메뉴에 대해 자동으로 온도를 잡아주는 케이스는
      // 메뉴 피드백에 이미 포함되므로(itemChanged 분기) 여기서는 사용자가
      // 옵션 패널에서 명시적으로 고른 경우만 짚어 준다.
      const tempLabel =
        selectedTemperature === "hot" ? "따뜻하게" : "차갑게";
      feedback = generateFeedback(
        { type: "option_selected", option: tempLabel },
        "practice",
      );
    } else if (selectedSize !== prev.size && !itemChanged) {
      const sizeLabel = selectedSize === "tall" ? "톨 사이즈" : "그란데 사이즈";
      feedback = generateFeedback(
        { type: "option_selected", option: sizeLabel },
        "practice",
      );
    } else if (selectedPayment && selectedPayment !== prev.payment) {
      feedback = generateFeedback(
        {
          type: "payment_selected",
          method: PAYMENT_LABEL[selectedPayment] ?? selectedPayment,
        },
        "practice",
      );
    }

    if (feedback) {
      void ttsManager.speak(feedback);
    }

    prevRef.current = {
      category: selectedCategory,
      itemId: currItemId,
      temperature: selectedTemperature,
      size: selectedSize,
      payment: selectedPayment,
    };
  }, [
    ready,
    selectedCategory,
    selectedItem,
    selectedTemperature,
    selectedSize,
    selectedPayment,
  ]);

  if (!ready) return null;

  return (
    <>
      <KioskFrame currentStep={config.step} title={config.title}>
        <ModeBanner
          eyebrow={`${config.philosophy} 단계`}
          headline="이번엔 직접 주문해 보세요."
          detail="천천히 골라도 괜찮아요 · 5분"
          helpLevel={config.helpLevel}
        />
        <OrderFlow
          mode="practice"
          nextLabel="Challenge"
          modeIntro={VOICE_SCRIPTS.practice.intro}
          onAdvance={advance}
        />
      </KioskFrame>
      <TimeoutWarning
        open={warningOpen}
        onExtend={() => extend(60_000)}
        onProceed={advance}
        onClose={() => setWarningOpen(false)}
      />
      <MicButton context="practice" position="floating" />
    </>
  );
}
