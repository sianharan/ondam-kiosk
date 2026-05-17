"use client";

/**
 * /articulation (8/10) — 명료화 (Articulation)
 *
 * Collins 인지적 도제 6단계 중 5번째. v2.3 + Phase 6 통합:
 *   - 3가지 질문을 도담이 음성으로 발화 (VoiceCoach)
 *   - 학습자는 마이크 버튼을 더블탭해 음성으로 답변 (Whisper 전사)
 *   - 전사 결과를 학습자에게 텍스트로도 보여주고 (확인용)
 *   - 다음 질문으로 자동 진행 → 마지막 질문 후 /reflection 으로
 *
 * 학술적 의의 (PROJECT_DESIGN.md 2.3 / 15.3 ② Articulation)
 *   - 학습자가 자신의 학습을 언어화 (Collins 2006)
 *   - Whisper 양방향 음성 인터페이스의 답변 수집 채널 (v2.3)
 *   - 답변 텍스트는 learningStore.articulationAnswers 에 누적 → Reflection 에서 Gemini 분석
 *
 * 사용자 친화 메모
 *   - 음성 답변이 어렵거나 권한 거부 학습자를 위해 [건너뛰기] 보조 버튼 제공
 *   - 한 질문당 답변은 한 번만 — 다시 말하기는 [다시 답하기] 버튼으로 명시적으로
 *   - Whisper 가 빈 결과를 돌려준 경우 별도 안내, 자동 진행하지 않음
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import {
  isWebSpeechSupported,
  recognizeWithWebSpeech,
} from "@/lib/stt/webSpeechFallback";
import { whisperService } from "@/lib/stt/whisperService";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

interface Question {
  /** 화면 표시용 짧은 라벨 */
  label: string;
  /** 도담이 음성으로 발화할 전체 문장 */
  voice: string;
  /** 학습자가 입력했을 때 텍스트 박스의 placeholder 격 안내 */
  hint: string;
}

const QUESTIONS: readonly Question[] = [
  {
    label: "오늘 어떤 메뉴를 주문하셨어요?",
    voice:
      "첫 번째 질문이에요. 오늘 어떤 메뉴를 주문하셨어요? 마이크 버튼을 두 번 두드린 다음 답해주세요.",
    hint: "메뉴 이름, 온도, 사이즈를 떠올려서 말해주세요.",
  },
  {
    label: "어떤 부분이 가장 쉬웠어요?",
    voice:
      "두 번째 질문이에요. 어떤 부분이 가장 쉬웠어요? 마이크 버튼을 두 번 두드린 다음 편하게 말해주세요.",
    hint: "카테고리, 메뉴, 옵션, 결제 중에서 떠올려 보세요.",
  },
  {
    label: "어떤 부분이 가장 어려웠어요?",
    voice:
      "마지막 질문이에요. 어떤 부분이 가장 어려웠어요? 마이크 버튼을 두 번 두드린 다음 솔직하게 말씀해주세요.",
    hint: "어려웠던 단계나 헷갈렸던 점을 떠올려 보세요.",
  },
] as const;

const MAX_RECORDING_MS = 15_000; // 답변은 호출 응답보다 길 수 있어 15초
const VAD_SILENCE_THRESHOLD = 8;
const VAD_SILENCE_DURATION_MS = 2_500;
const VAD_GRACE_MS = 2_000;

type RecorderStatus = "idle" | "preparing" | "recording" | "processing";

export default function ArticulationPage() {
  const router = useRouter();
  const setStep = useLearningStore((s) => s.setStep);
  const setArticulationAnswer = useLearningStore((s) => s.setArticulationAnswer);
  const articulationAnswers = useLearningStore((s) => s.articulationAnswers);
  const isVoiceEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const { ready } = useRequireLearningSession();

  const [index, setIndex] = React.useState<0 | 1 | 2>(0);
  const [status, setStatus] = React.useState<RecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [micGranted, setMicGranted] = React.useState<boolean | null>(null);

  const autoStopRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadRafRef = React.useRef<number | null>(null);
  const statusRef = React.useRef<RecorderStatus>("idle");

  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const setStatusSync = React.useCallback((next: RecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  React.useEffect(() => {
    setStep(8);
  }, [setStep]);

  React.useEffect(() => {
    whisperService
      .requestMicAccess()
      .then(setMicGranted)
      .catch(() => setMicGranted(false));
  }, []);

  React.useEffect(() => {
    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (vadRafRef.current !== null) cancelAnimationFrame(vadRafRef.current);
      if (
        statusRef.current === "recording" ||
        statusRef.current === "preparing"
      ) {
        whisperService.cancelRecording();
      }
    };
  }, []);

  const speak = React.useCallback(
    async (text: string) => {
      if (!isVoiceEnabled) return;
      ttsManager.setVoice(voice);
      ttsManager.setSpeed(speed);
      ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
      try {
        await ttsManager.speak(text, { interrupt: true });
      } catch (err) {
        console.warn("[Articulation] 발화 실패:", err);
      }
    },
    [isVoiceEnabled, voice, speed, volume],
  );

  const currentQuestion = QUESTIONS[index];
  const currentAnswer = articulationAnswers[index];
  const isLast = index === QUESTIONS.length - 1;

  // 진입 멘트 + 질문 음성. 질문이 바뀌면 새 VoiceCoach 가 마운트되어 재발화.
  const voiceSequence = React.useMemo<string[]>(() => {
    if (index === 0) {
      return [
        "잠시 함께 돌아볼게요. 방금 한 주문을 떠올리면서, 세 가지 질문에 음성으로 답해주세요. 정답은 없어요.",
        currentQuestion.voice,
      ];
    }
    return [currentQuestion.voice];
  }, [index, currentQuestion.voice]);

  const finishRecording = React.useCallback(async () => {
    if (statusRef.current !== "recording") return;

    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }

    setStatusSync("processing");

    let blob: Blob | null = null;
    try {
      blob = await whisperService.stopRecording();
    } catch (err) {
      console.warn("[Articulation] 녹음 종료 실패:", err);
    }

    await speak("잘 들었어요. 잠시만요.");

    let text = "";
    let whisperFailed = false;
    if (blob && blob.size > 0) {
      try {
        text = await whisperService.transcribe(blob);
      } catch (err) {
        console.warn(
          "[Articulation] Whisper 실패, Web Speech 폴백 시도:",
          err,
        );
        whisperFailed = true;
      }
    } else {
      whisperFailed = true;
    }

    if ((!text || whisperFailed) && isWebSpeechSupported()) {
      try {
        await speak("한 번 더 짧게 말씀해주세요.");
        text = await recognizeWithWebSpeech({ timeoutMs: 6_000 });
      } catch (err) {
        console.warn("[Articulation] Web Speech 폴백 실패:", err);
      }
    }

    if (!text) {
      setErrorMessage(
        "답변을 듣지 못했어요. 마이크 버튼을 다시 두 번 두드린 뒤 또박또박 말씀해주세요.",
      );
      await speak("답변을 듣지 못했어요. 다시 한 번 시도해주세요.");
      setStatusSync("idle");
      return;
    }

    setErrorMessage(null);
    setArticulationAnswer(index, text);

    // 답변 확인 발화 — 학습자가 자기 답이 잘 잡혔는지 들을 수 있도록.
    await speak(`이렇게 들었어요. ${text}`);

    // Phase 6 Step 4 — GPT 후속 코칭. 학습 흐름이 끊기지 않도록 실패 시 정적 폴백.
    // 라우트가 항상 line 을 채워주므로 200 외 응답에서도 발화는 시도한다.
    try {
      const res = await fetch("/api/coach-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: text,
          questionIndex: index,
          questionLabel: QUESTIONS[index].label,
        }),
      });
      const data = (await res.json()) as { line?: string };
      if (data.line) await speak(data.line);
    } catch (err) {
      console.warn("[Articulation] coach-line 실패, 정적 멘트로 대체:", err);
      await speak("잘 들었어요. 다음 질문으로 함께 가볼게요.");
    }

    setStatusSync("idle");
  }, [index, setArticulationAnswer, setStatusSync, speak]);

  const startRecording = React.useCallback(async () => {
    if (statusRef.current !== "idle") return;
    setErrorMessage(null);

    if (micGranted === false) {
      await speak(
        "마이크 권한이 필요해요. 브라우저 주소창 옆 마이크 아이콘을 눌러 허용해주세요.",
      );
      return;
    }

    ttsManager.stop();
    setStatusSync("preparing");
    await speak("네, 듣고 있어요.");

    if ((statusRef.current as RecorderStatus) !== "preparing") return;

    let analyser: AnalyserNode | null = null;
    try {
      const handles = await whisperService.startRecording();
      analyser = handles.analyser;
    } catch (err) {
      console.error("[Articulation] 녹음 시작 실패:", err);
      setMicGranted(false);
      setStatusSync("idle");
      await speak(
        "마이크를 사용할 수 없어요. 브라우저 권한을 확인해주세요.",
      );
      return;
    }

    setStatusSync("recording");

    autoStopRef.current = setTimeout(() => {
      void finishRecording();
    }, MAX_RECORDING_MS);

    if (analyser) {
      const startedAt = performance.now();
      let lastSoundAt = startedAt;
      const bufferLength = analyser.frequencyBinCount;
      const buffer = new Uint8Array(bufferLength);

      const tick = () => {
        if (statusRef.current !== "recording") {
          vadRafRef.current = null;
          return;
        }
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < bufferLength; i += 1) sum += buffer[i];
        const avg = sum / bufferLength;

        const now = performance.now();
        if (avg > VAD_SILENCE_THRESHOLD) lastSoundAt = now;

        const elapsed = now - startedAt;
        const silentFor = now - lastSoundAt;
        if (elapsed >= VAD_GRACE_MS && silentFor >= VAD_SILENCE_DURATION_MS) {
          vadRafRef.current = null;
          void finishRecording();
          return;
        }
        vadRafRef.current = requestAnimationFrame(tick);
      };
      vadRafRef.current = requestAnimationFrame(tick);
    }
  }, [finishRecording, micGranted, setStatusSync, speak]);

  const handleNextQuestion = React.useCallback(() => {
    if (isLast) {
      router.push("/reflection");
      return;
    }
    setErrorMessage(null);
    setStatusSync("idle");
    setIndex((i) => (Math.min(i + 1, 2) as 0 | 1 | 2));
  }, [isLast, router, setStatusSync]);

  const handleRetry = React.useCallback(() => {
    setArticulationAnswer(index, "");
    setErrorMessage(null);
    void startRecording();
  }, [index, setArticulationAnswer, startRecording]);

  const handleSkip = React.useCallback(() => {
    // 답변 없이도 흐름은 끊지 않는다 — 빈 문자열로 표시하고 다음으로.
    setArticulationAnswer(index, "(답변 건너뜀)");
    handleNextQuestion();
  }, [handleNextQuestion, index, setArticulationAnswer]);

  if (!ready) return null;

  const hasAnswer = currentAnswer.trim().length > 0;
  const isBusy = status === "preparing" || status === "processing";
  const isRecording = status === "recording";

  return (
    <KioskFrame currentStep={8} title="Articulation — 음성으로 돌아보기">
      <ModeBanner
        eyebrow="명료화 단계 — Collins 5단계"
        headline="방금 한 주문을 음성으로 함께 돌아봐요."
        detail="마이크 버튼을 두 번 두드린 뒤 편하게 답해주세요. 정답은 없어요."
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
          Q{index + 1}. {currentQuestion.label}
        </h2>

        <VoiceCoach message={voiceSequence} sequenceGapMs={800} />

        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
          <p className="text-xl text-foreground md:text-2xl">
            💭 {currentQuestion.hint}
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

        {/* ── 마이크 입력 영역 ──────────────────────────────────── */}
        <div
          className="flex flex-col items-center gap-4 rounded-2xl border border-foreground/15 bg-background p-6"
          role="group"
          aria-label="음성 답변 입력 영역"
        >
          <RecordButton
            status={status}
            disabled={isBusy}
            onActivate={() => {
              if (isRecording) {
                void finishRecording();
              } else {
                void startRecording();
              }
            }}
          />

          <p
            className="text-lg text-foreground/70 md:text-xl"
            aria-live="polite"
          >
            {status === "preparing" && "도담이 들을 준비를 하고 있어요…"}
            {status === "recording" && "듣고 있어요. 답변이 끝나면 한 번 더 두드리세요."}
            {status === "processing" && "답변을 정리하고 있어요…"}
            {status === "idle" && !hasAnswer && "마이크 버튼을 두 번 두드려 답해주세요."}
            {status === "idle" && hasAnswer && "답변이 잘 들렸어요. 다음 질문으로 넘어가세요."}
          </p>

          {hasAnswer && (
            <div
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4"
              aria-label="내 답변"
            >
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                내 답변
              </p>
              <p className="mt-1 text-xl leading-relaxed text-foreground md:text-2xl">
                {currentAnswer}
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="w-full rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900 md:text-xl"
            >
              {errorMessage}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
          <VoiceButton
            voiceLabel="건너뛰기 버튼이에요. 두 번 두드리면 답변 없이 다음 질문으로 가요."
            onActivate={handleSkip}
            variant="ghost"
            disabled={isBusy}
          >
            건너뛰기
          </VoiceButton>

          <div className="flex flex-col gap-3 sm:flex-row">
            {hasAnswer && (
              <VoiceButton
                voiceLabel="다시 답하기 버튼이에요. 두 번 두드리면 이 질문에 다시 음성으로 답할 수 있어요."
                onActivate={handleRetry}
                variant="ghost"
                disabled={isBusy}
              >
                다시 답하기
              </VoiceButton>
            )}

            <VoiceButton
              voiceLabel={
                isLast
                  ? "분석 보러 가기 버튼이에요. 두 번 두드리면 도담이 답변을 분석한 결과를 보여드려요."
                  : "다음 질문 버튼이에요. 두 번 두드리면 다음 질문으로 넘어가요."
              }
              onActivate={handleNextQuestion}
              disabled={isBusy || !hasAnswer}
            >
              {isLast ? "분석 보러 가기" : "다음 질문"}
            </VoiceButton>
          </div>
        </footer>
      </section>
    </KioskFrame>
  );
}

/** Articulation 전용 마이크 버튼 — MicButton 과 달리 답변을 store 로 직접 저장. */
function RecordButton({
  status,
  disabled,
  onActivate,
}: {
  status: RecorderStatus;
  disabled: boolean;
  onActivate: () => void;
}) {
  const handleClick = React.useCallback(() => {
    onActivate();
  }, [onActivate]);

  const ariaLabel =
    status === "preparing"
      ? "도담이 들을 준비를 하고 있어요."
      : status === "recording"
        ? "녹음 중이에요. 한 번 더 두드리면 답변이 끝나요."
        : status === "processing"
          ? "답변을 정리하고 있어요."
          : "음성 답변 마이크 버튼이에요. 두 번 두드리면 녹음이 시작돼요.";

  // VoiceButton 의 단일/더블 패턴을 그대로 따른다 — 한 번 두드리면 안내, 두 번이면 실행.
  // 단, 녹음 중에는 한 번만 두드려도 종료하는 게 학습자 친화적이라
  // 자체 useDoubleTap 대신 간단한 클릭 카운터를 직접 둔다.
  const clickCountRef = React.useRef(0);
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClickWithDoubleTap = React.useCallback(() => {
    if (status === "recording") {
      // 녹음 중 단일 탭은 즉시 종료.
      handleClick();
      return;
    }
    clickCountRef.current += 1;
    if (clickCountRef.current === 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;
      handleClick();
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 350);
  }, [handleClick, status]);

  return (
    <button
      type="button"
      onClick={onClickWithDoubleTap}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={status === "recording"}
      data-status={status}
      className={cn(
        "flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition-all md:h-28 md:w-28",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/50",
        "disabled:cursor-not-allowed disabled:opacity-60",
        status === "recording"
          ? "animate-pulse bg-red-500 text-white"
          : status === "preparing"
            ? "bg-accent text-accent-foreground"
            : status === "processing"
              ? "bg-foreground/40 text-white"
              : "bg-primary text-primary-foreground hover:opacity-95",
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="h-10 w-10 md:h-12 md:w-12"
      >
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </button>
  );
}
