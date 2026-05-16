"use client";

/**
 * /articulation (8/10) — 명료화 (Bronze)
 *
 * PROJECT_DESIGN.md 5.2 #8 / 2.3 Articulation.
 * 4개 질문을 순차로 제시. 학습자 답변은 받지 않는다 — 회상 자체가 학습.
 * (음성 녹음 + Whisper/Gemini 분석은 Phase 6.)
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
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

export default function ArticulationPage() {
  const router = useRouter();
  const setStep = useLearningStore((s) => s.setStep);
  const { ready } = useRequireLearningSession();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setStep(8);
  }, [setStep]);

  // 직접 접근 시 useRequireLearningSession 이 홈으로 보내는 동안 빈 화면
  if (!ready) return null;

  const isLast = index === QUESTIONS.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.push("/reflection");
    } else {
      setIndex((i) => i + 1);
    }
  };

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

        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
          <p className="text-xl text-foreground md:text-2xl">
            💭 {RECALL_HINTS[index]}
          </p>
        </div>

        {/* 진행 표시 (점) */}
        <ol
          aria-label="질문 진행 상태"
          className="flex items-center gap-2"
        >
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
          <button
            type="button"
            onClick={handleNext}
            aria-label={
              isLast
                ? "마지막 질문이 끝났어요. 분석 결과 화면으로 이동합니다"
                : `다음 질문으로 이동`
            }
            className="rounded-2xl bg-accent px-10 py-5 text-2xl font-bold text-accent-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none"
          >
            {isLast ? "분석 보러 가기" : "다음 질문"}
          </button>
        </footer>
      </section>
    </KioskFrame>
  );
}
