"use client";

/**
 * /reflection (9/10) — 성찰 (Reflection)
 *
 * Collins 인지적 도제 6단계 중 6번째 (마지막). Phase 6:
 *   - Articulation 에서 학습자가 음성으로 답한 3가지를 받아
 *   - Gemini 2.5 Flash 에 분석 요청 (/api/gemini)
 *   - 결과(strengths / weaknesses / nextSteps)를 시각 + 음성으로 표시
 *   - [완료] 버튼으로 /complete 로
 *
 * 학술적 의의 (PROJECT_DESIGN.md 15.3 ③)
 *   - 학습자가 자기 수행을 메타인지적으로 분석 (Collins 2006)
 *   - GPT 가 자연어 대사를, Gemini 가 객관적 분석을 담당하는 멀티 모델 아키텍처
 *   - 본 페이지는 분석(=Gemini) 담당 — GPT 대사 변환은 향후 확장(15.3 ③ Step 2) 영역
 *
 * 폴백 (PROJECT_DESIGN 15.4)
 *   - Gemini 실패해도 라우트가 항상 strengths/nextSteps 폴백을 채워준다.
 *   - 답변이 모두 비어 있어도 학습 종료 흐름은 끊지 않는다.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import {
  PROGRESS_BUTTON_CLASS,
  STICKY_PROGRESS_FOOTER,
  VoiceButton,
} from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import {
  CATEGORY_LABEL,
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/kiosk-data/menu";
import { cn } from "@/lib/utils";
import {
  type ReflectionResult,
  useLearningStore,
} from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

type LoadState = "idle" | "loading" | "done" | "error";

export default function ReflectionPage() {
  const router = useRouter();
  const setStep = useLearningStore((s) => s.setStep);
  const articulationAnswers = useLearningStore((s) => s.articulationAnswers);
  const reflectionResult = useLearningStore((s) => s.reflectionResult);
  const setReflectionResult = useLearningStore((s) => s.setReflectionResult);
  const currentMode = useLearningStore((s) => s.currentMode);

  const selectedItem = useOrderStore((s) => s.selectedItem);
  const selectedTemperature = useOrderStore((s) => s.selectedTemperature);
  const selectedSize = useOrderStore((s) => s.selectedSize);
  const selectedExtras = useOrderStore((s) => s.selectedExtras);

  const { ready } = useRequireLearningSession();

  const [loadState, setLoadState] = React.useState<LoadState>(
    reflectionResult ? "done" : "idle",
  );
  const [errorDetail, setErrorDetail] = React.useState<string | null>(null);

  // 완료한 시나리오 텍스트 (Gemini 프롬프트 + 화면 보조 표시 공용)
  const completedScenario = React.useMemo(() => {
    if (!selectedItem) {
      return currentMode
        ? `${currentMode} 단계의 자유 주문`
        : "키오스크 학습 시나리오";
    }
    const tempText =
      selectedTemperature === "hot"
        ? "따뜻한"
        : selectedTemperature === "iced"
          ? "차가운"
          : "";
    const sizeText = SIZE_OPTIONS[selectedSize]?.label
      ? `${SIZE_OPTIONS[selectedSize].label} 사이즈`
      : "";
    const extrasText = selectedExtras
      .map((k) => EXTRA_OPTIONS[k].label)
      .join(", ");

    return [
      `${CATEGORY_LABEL[selectedItem.category]} 카테고리의`,
      tempText,
      selectedItem.name,
      sizeText,
      extrasText && `옵션: ${extrasText}`,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [
    currentMode,
    selectedExtras,
    selectedItem,
    selectedSize,
    selectedTemperature,
  ]);

  React.useEffect(() => {
    setStep(9);
  }, [setStep]);

  // 진입 시 분석 호출. 이미 결과가 있으면 (예: 뒤로갔다가 다시 들어옴) 건너뛴다.
  React.useEffect(() => {
    if (!ready) return;
    if (reflectionResult) {
      setLoadState("done");
      return;
    }
    let cancelled = false;

    async function runAnalysis() {
      setLoadState("loading");
      setErrorDetail(null);
      try {
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articulationAnswers,
            completedScenario,
          }),
        });
        const data = (await res.json()) as ReflectionResult & {
          error?: string;
        };
        if (cancelled) return;
        // 라우트가 항상 폴백 키를 채워 보내므로 정상/오류 모두 결과는 저장한다.
        setReflectionResult({
          strengths: data.strengths ?? [],
          weaknesses: data.weaknesses ?? [],
          nextSteps: data.nextSteps ?? [],
        });
        if (data.error) {
          setErrorDetail(data.error);
          setLoadState("error");
        } else {
          setLoadState("done");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[Reflection] Gemini 분석 호출 실패:", err);
        // 네트워크 실패 — 최후 폴백.
        setReflectionResult({
          strengths: ["오늘 학습에 끝까지 참여하셨어요."],
          weaknesses: [],
          nextSteps: ["다음에 또 함께 천천히 연습해봐요."],
        });
        setErrorDetail(err instanceof Error ? err.message : "네트워크 오류");
        setLoadState("error");
      }
    }

    void runAnalysis();
    return () => {
      cancelled = true;
    };
    // articulationAnswers / completedScenario 는 페이지 진입 시점에 고정되므로
    // 의도적으로 deps 에 ready 만 두어 재호출을 막는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const voiceSequence = React.useMemo<string[]>(() => {
    if (loadState === "loading" || loadState === "idle") {
      // 분석이 길어질 때 첫 문장 뒤 침묵을 메운다. 결과가 도착하면 voiceSequence 가
      // 결과 시퀀스로 바뀌며 VoiceCoach 가 곧바로 결과 발화로 이어간다(이 안심 멘트는 끊김).
      return [
        "지금부터 오늘 학습을 정리해드릴게요. 도담이 답변을 분석하고 있어요.",
        "조금만 더 기다려 주세요. 거의 다 됐어요.",
      ];
    }
    if (!reflectionResult) {
      return ["분석을 준비하고 있어요. 잠시만 기다려 주세요."];
    }

    const lines: string[] = [
      "오늘 학습을 함께 정리해드릴게요.",
    ];
    if (reflectionResult.strengths.length > 0) {
      lines.push("잘하신 점을 먼저 말씀드릴게요.");
      for (const s of reflectionResult.strengths) lines.push(s);
    }
    if (reflectionResult.weaknesses.length > 0) {
      lines.push("더 연습하면 좋은 점은 이렇게 보여요.");
      for (const w of reflectionResult.weaknesses) lines.push(w);
    }
    if (reflectionResult.nextSteps.length > 0) {
      lines.push("다음 단계 제안이에요.");
      for (const n of reflectionResult.nextSteps) lines.push(n);
    }
    lines.push("오늘 정말 수고하셨어요.");
    // 결과를 다 들은 뒤 다음 행동을 분명히 — 화면을 못 보는 학습자가 멈추지 않도록.
    lines.push(
      "다 들으셨으면, 화면 아래 완료 버튼을 두 번 두드려 마무리해 주세요.",
    );
    return lines;
  }, [loadState, reflectionResult]);

  if (!ready) return null;

  return (
    <KioskFrame currentStep={9} title="Reflection — 학습 정리">
      <ModeBanner
        eyebrow="성찰 단계 — Collins 6단계 (마지막)"
        headline="오늘 학습을 정리해드릴게요."
        detail="잘하신 점과 다음 단계를 알려드려요."
        tone="primary"
      />

      <VoiceCoach message={voiceSequence} sequenceGapMs={900} />

      {/* 학습자가 자기 답변을 한 번 더 확인할 수 있도록 미리보기 */}
      <section
        aria-label="내 답변 요약"
        className="mt-2 grid gap-3 rounded-2xl bg-background p-5 shadow-sm ring-1 ring-foreground/15 md:p-6"
      >
        <h3 className="text-xl font-bold text-foreground md:text-2xl">
          내 답변
        </h3>
        <AnswerLine label="주문한 메뉴" text={articulationAnswers[0]} />
        <AnswerLine label="가장 쉬웠던 부분" text={articulationAnswers[1]} />
        <AnswerLine label="가장 어려웠던 부분" text={articulationAnswers[2]} />
      </section>

      {(loadState === "loading" || loadState === "idle") && (
        <LoadingBlock />
      )}

      {loadState === "error" && errorDetail && (
        <div
          role="status"
          className="mt-6 rounded-2xl bg-amber-50 p-5 text-lg text-amber-900 shadow-sm ring-1 ring-amber-300 md:text-xl"
        >
          분석 중에 잠시 문제가 있었어요. 학습 정리는 도담이 준비한 기본 안내로
          보여드릴게요.
        </div>
      )}

      {reflectionResult && loadState !== "loading" && (
        <ResultBlocks result={reflectionResult} />
      )}

      {/* 본문(답변 요약 + 결과 카드 3개)이 길어 버튼이 화면 밖으로 밀리므로 sticky.
          다음 단계로 가는 진행 버튼이라 다른 화면과 같이 기본 주황 variant + 전폭으로 통일. */}
      <footer className={STICKY_PROGRESS_FOOTER}>
        <VoiceButton
          voiceLabel="완료 버튼이에요. 두 번 두드리면 마지막 완료 화면으로 가요."
          onActivate={() => router.push("/complete")}
          disabled={loadState === "loading"}
          className={PROGRESS_BUTTON_CLASS}
        >
          완료
        </VoiceButton>
      </footer>
    </KioskFrame>
  );
}

function AnswerLine({ label, text }: { label: string; text: string }) {
  const display = text.trim().length > 0 ? text : "(답변 없음)";
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/40 p-4">
      <span className="text-sm font-bold uppercase tracking-wider text-foreground/60">
        {label}
      </span>
      <span className="text-lg leading-relaxed text-foreground md:text-xl">
        {display}
      </span>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 flex items-center gap-4 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/15"
    >
      <span
        aria-hidden="true"
        className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"
      />
      <p className="text-xl text-foreground md:text-2xl">
        도담이 분석하고 있어요…
      </p>
    </div>
  );
}

function ResultBlocks({ result }: { result: ReflectionResult }) {
  return (
    <section
      aria-label="학습 분석 결과"
      className="mt-6 grid gap-4"
    >
      <ResultCard
        title="🌟 잘하셨어요"
        items={result.strengths}
        emptyText="끝까지 학습에 참여하신 것 자체가 가장 큰 성취예요."
        tone="positive"
      />
      <ResultCard
        title="💪 더 연습해볼까요"
        items={result.weaknesses}
        emptyText="특별히 어려웠던 부분은 보이지 않았어요. 자신감을 가지셔도 좋아요."
        tone="neutral"
      />
      <ResultCard
        title="🎯 다음 단계"
        items={result.nextSteps}
        emptyText="다음에도 같은 흐름으로 천천히 연습해 보세요."
        tone="accent"
      />
    </section>
  );
}

function ResultCard({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: "positive" | "neutral" | "accent";
}) {
  const hasItems = items.length > 0;
  return (
    <div
      className={cn(
        "rounded-2xl p-6 ring-1",
        tone === "positive" && "bg-emerald-50 ring-emerald-200",
        tone === "accent" && "bg-primary/5 ring-primary/20",
        tone === "neutral" && "bg-muted/40 ring-foreground/15",
      )}
    >
      <h3
        className={cn(
          "text-2xl font-bold md:text-3xl",
          tone === "positive" && "text-emerald-800",
          tone === "accent" && "text-primary",
          tone === "neutral" && "text-foreground",
        )}
      >
        {title}
      </h3>
      {hasItems ? (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((line, i) => (
            <li
              key={i}
              className="text-xl leading-relaxed text-foreground md:text-2xl"
            >
              • {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-lg leading-relaxed text-foreground/80 md:text-xl">
          {emptyText}
        </p>
      )}
    </div>
  );
}
