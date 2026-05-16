"use client";

/**
 * /articulation (8/10) — 명료화 (Bronze)
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 articulation.intro 자동 발화
 *   - 질문 인덱스 변경 시 해당 질문 + 회상 안내 자동 발화
 *   - [다음 질문] / [분석 보러 가기] VoiceButton (단일=안내, 더블=실행)
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { useLearningStore } from "@/stores/learningStore";

const QUESTIONS: string[] = [
  "방금 어떤 음료를 주문하셨나요?",
  "카테고리는 어떻게 찾으셨어요?",
  "옵션 선택할 때 어디가 가장 어려웠나요?",
  "오늘 주문, 어떠셨나요?",
];

const RECALL_HINTS: string[] = [
  "메뉴 이름, 온도, 사이즈를 천천히 떠올려 보세요.",
  "처음 누른 버튼이 어디에 있었는지 떠올려 보세요.",
  "기억나는 순서대로 자유롭게 떠올려 보세요.",
  "기분이나 어려웠던 점을 솔직하게 떠올려 보세요.",
];

const QUESTION_VOICE: string[] = [
  VOICE_SCRIPTS.articulation.q1,
  VOICE_SCRIPTS.articulation.q2,
  VOICE_SCRIPTS.articulation.q3,
  VOICE_SCRIPTS.articulation.q4,
];

export default function ArticulationPage() {
  const router = useRouter();
  const setStep = useLearningStore((s) => s.setStep);
  const { ready } = useRequireLearningSession();
  const [index, setIndex] = React.useState(0);
  const [isFirst, setIsFirst] = React.useState(true);

  React.useEffect(() => {
    setStep(8);
  }, [setStep]);

  if (!ready) return null;

  const isLast = index === QUESTIONS.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.push("/reflection");
    } else {
      setIsFirst(false);
      setIndex((i) => i + 1);
    }
  };

  // 처음 진입: intro + q1 / 그 외: 해당 질문만
  const sequence = isFirst
    ? [VOICE_SCRIPTS.articulation.intro, QUESTION_VOICE[index], "잠시 생각해보세요."]
    : [QUESTION_VOICE[index], "잠시 생각해보세요."];

  return (
    <KioskFrame currentStep={8} title="Articulation — 돌아보기">
      <ModeBanner
        eyebrow="명료화 단계 (Bronze)"
        headline="방금 한 주문을 한 번 돌아볼게요."
        detail="답을 소리 내어 말하지 않아도 괜찮아요. 마음속으로 천천히 떠올려 보세요."
        tone="primary"
      />

      <section
        className="flex flex-col gap-6 animate-in fade-in duration-500"
        key={index}
        aria-live="polite"
      >
        <p className="text-lg text-foreground/60 md:text-xl">
          질문 {index + 1} / {QUESTIONS.length}
        </p>

        <h2 className="text-3xl font-bold leading-snug text-foreground md:text-4xl">
          Q{index + 1}. {QUESTIONS[index]}
        </h2>

        {/* 질문이 바뀔 때마다 새 VoiceCoach 가 마운트되어 발화 */}
        <VoiceCoach message={sequence} sequenceGapMs={1500} />

        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
          <p className="text-xl text-foreground md:text-2xl">
            💭 {RECALL_HINTS[index]}
          </p>
        </div>

        <ol aria-label="질문 진행 상태" className="flex items-center gap-2">
          {QUESTIONS.map((_, i) => (
            <li
              key={i}
              aria-current={i === index ? "step" : undefined}
              className={
                i === index
                  ? "h-3 w-10 rounded-full bg-accent"
                  : i < index
                    ? "h-3 w-3 rounded-full bg-accent/60"
                    : "h-3 w-3 rounded-full bg-foreground/20"
              }
            />
          ))}
        </ol>

        <footer className="flex justify-end pt-2">
          <VoiceButton
            voiceLabel={
              isLast
                ? "분석 보러 가기 버튼이에요. 두 번 두드리면 결과 화면으로 가요."
                : "다음 질문 버튼이에요. 두 번 두드리면 다음 질문으로 넘어가요."
            }
            onActivate={handleNext}
          >
            {isLast ? "분석 보러 가기" : "다음 질문"}
          </VoiceButton>
        </footer>
      </section>
    </KioskFrame>
  );
}
