"use client";

/**
 * MicButton — 양방향 음성 인터페이스 진입 버튼 (Phase 4-AI)
 *
 * 동작 (KS X 9211:2025 7.6.6 선택/실행 분리 유지)
 *   - idle      단일 탭 → 안내 음성 ("마이크 버튼이에요...")
 *   - idle      더블 탭 → 청각 신호 ("네, 듣고 있어요") 후 녹음 시작
 *   - recording 클릭   → 녹음 종료 + 청각 신호 ("잘 들었어요. 잠시만요")
 *   - 처리 2초 초과    → 추가 청각 신호 ("도담이 생각하고 있어요")
 *   - 10초 자동 종료   → 학습자가 끝내는 걸 잊어도 무한 녹음 방지
 *   - VAD             → 무음 2초 자동 종료 (Grace 1.5초 후)
 *
 * 청각 피드백 3단계 (Phase 4-AI 디버깅, 시각장애인 UX 핵심)
 *   1) preparing 상태 — 녹음 시작 안내 ("네, 듣고 있어요")
 *      안내 발화가 await 로 끝난 뒤 녹음을 시작해야 마이크가 자기 안내를 녹음하지 않는다.
 *   2) processing 진입 — 녹음 종료 안내 ("잘 들었어요. 잠시만요")
 *      stopRecording() 으로 마이크를 먼저 끈 뒤 발화해야 발화 자체가 녹음에 포함되지 않는다.
 *   3) 처리 2초 초과 — 추가 안내 ("도담이 생각하고 있어요")
 *      processingTimer 로 GPT 응답 대기 중 침묵을 메운다. 응답 도착 시 clear.
 *
 * 의도 분기 (lib/llm/intentDetection)
 *   - 단순 의도(인사/긍정/부정) → 정적 응답으로 즉시 발화 (GPT 호출 없음)
 *   - 그 외                   → /api/gpt 호출 후 응답 발화
 *
 * 위치 (z-index 충돌 회피)
 *   - StopSpeakingButton: bottom-6 right-6 z-50 — 발화 중에만 표시
 *   - HintButton(floating): bottom-24 right-6 z-30 — 학습 페이지 한정
 *   - MicButton: bottom-24 right-6 z-30 또는 inline 위치
 *
 * 폴백
 *   - 마이크 권한 거부 / 사용 불가 → 안내 음성으로 그레이스풀 처리
 *   - Whisper 실패              → Web Speech 1회 재인식, 그래도 실패면 "다시 시도" 안내
 *   - GPT 실패                  → 라우트가 반환한 fallback 멘트 그대로 발화
 *
 * 음성 엔진 설정
 *   - VoiceButton 과 동일하게 voiceStore 의 voice/speed/volume 을 ttsManager 에 동기화
 *   - voiceStore.isEnabled === false 면 안내·응답 발화를 모두 생략 (시각만으로 동작)
 */

import * as React from "react";

import { useDoubleTap } from "@/lib/interaction/doubleTap";
import {
  detectIntent,
  getIntentResponse,
} from "@/lib/llm/intentDetection";
import {
  isWebSpeechSupported,
  recognizeWithWebSpeech,
} from "@/lib/stt/webSpeechFallback";
import { whisperService } from "@/lib/stt/whisperService";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { cn } from "@/lib/utils";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

const MAX_RECORDING_MS = 10_000;
/** VAD: 평균 진폭(0~255 정규화) 이 이 값 이하면 무음으로 간주. */
const VAD_SILENCE_THRESHOLD = 8;
/** 무음이 이 시간 이상 이어지면 자동 종료. */
const VAD_SILENCE_DURATION_MS = 2_000;
/** 녹음 직후 첫 N ms 는 무음이라도 종료하지 않는다 (학습자가 말을 시작할 여유). */
const VAD_GRACE_MS = 1_500;
/** processing 진입 후 이 시간이 지나도 응답이 없으면 추가 안내 발화. */
const PROCESSING_HINT_DELAY_MS = 2_000;

/**
 * preparing — 안내 멘트("네, 듣고 있어요") 발화 중. 곧 녹음이 시작될 전이 상태.
 *   anti-loop: 안내 발화가 끝나기 전 또 다른 더블 탭이 들어와도 무시.
 */
type Status = "idle" | "preparing" | "recording" | "processing";

interface MicButtonProps {
  /** 현재 학습 단계 식별자. GPT 라우트로 그대로 전달되어 맥락 가중치로 사용됨. */
  context?: string;
  /** floating: 화면 우측 하단 고정 / inline: 부모 레이아웃이 위치 결정 */
  position?: "floating" | "inline";
  className?: string;
}

export function MicButton({
  context,
  position = "floating",
  className,
}: MicButtonProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const [status, setStatus] = React.useState<Status>("idle");
  const [micGranted, setMicGranted] = React.useState<boolean | null>(null);

  const autoStopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // VAD: 매 프레임 평균 진폭을 측정해 SILENCE_DURATION_MS 이상 조용하면 종료.
  const vadRafRef = React.useRef<number | null>(null);
  // 처리 지연 추가 안내 타이머 — 응답 도착 시 clear.
  const processingHintTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  // status 를 최신값으로 보는 ref — setTimeout/RAF/await 콜백의 stale closure 방지.
  // 주의: setStatus 만으론 statusRef 가 즉시 갱신되지 않는다(useEffect 는 다음 렌더 후 실행).
  // 따라서 await 직전 같은 동기 지점에서 비교가 필요한 경우 반드시 setStatusSync 를 쓴다.
  const statusRef = React.useRef<Status>("idle");
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const setStatusSync = React.useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // 마운트 시 권한 사전 확인. 첫 더블탭에서 권한 팝업이 한 번 더 뜰 수 있으나,
  // 본 사전 확인이 성공하면 그 이후엔 즉시 녹음 시작 가능.
  React.useEffect(() => {
    whisperService
      .requestMicAccess()
      .then(setMicGranted)
      .catch(() => setMicGranted(false));
  }, []);

  // 언마운트 시 진행 중 녹음·VAD 루프·처리 안내 타이머 정리
  React.useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      if (vadRafRef.current !== null) {
        cancelAnimationFrame(vadRafRef.current);
        vadRafRef.current = null;
      }
      if (processingHintTimerRef.current) {
        clearTimeout(processingHintTimerRef.current);
        processingHintTimerRef.current = null;
      }
      if (
        statusRef.current === "recording" ||
        statusRef.current === "preparing"
      ) {
        whisperService.cancelRecording();
      }
    };
  }, []);

  // ── 음성 발화 헬퍼: voiceStore 설정 반영 ─────────────────────
  const speak = React.useCallback(
    async (text: string) => {
      if (!isEnabled) return;
      ttsManager.setVoice(voice);
      ttsManager.setSpeed(speed);
      ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
      try {
        await ttsManager.speak(text, { interrupt: true });
      } catch (err) {
        console.warn("[MicButton] 발화 실패:", err);
      }
    },
    [isEnabled, voice, speed, volume],
  );

  // ── 녹음 종료 + 후속 처리 (전사/의도/응답) ────────────────────
  const finishRecording = React.useCallback(async () => {
    if (statusRef.current !== "recording") return;

    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }

    setStatusSync("processing");

    // 마이크를 먼저 끈다 — 그래야 직후 안내 발화가 자기 자신을 녹음하지 않는다.
    // (사용자 지시 코드의 순서는 자기-녹음 위험이 있어 의도적으로 반전.)
    let blob: Blob | null = null;
    try {
      blob = await whisperService.stopRecording();
    } catch (err) {
      console.warn("[MicButton] 녹음 종료 실패:", err);
    }

    // [청각 피드백 2단] 녹음 종료 즉시 — "잘 들었어요. 잠시만요"
    // await 로 끝까지 들려준 뒤 전사·GPT 를 호출 — 학습자가 응답을 차분히 기다릴 수 있음.
    await speak("잘 들었어요. 잠시만요.");

    // [청각 피드백 3단] 2초가 지나도 응답이 안 오면 추가 안내. 응답 도착 시 clear.
    processingHintTimerRef.current = setTimeout(() => {
      void speak("도담이 생각하고 있어요.");
    }, PROCESSING_HINT_DELAY_MS);

    const clearProcessingHint = () => {
      if (processingHintTimerRef.current) {
        clearTimeout(processingHintTimerRef.current);
        processingHintTimerRef.current = null;
      }
    };

    let text = "";
    let whisperFailed = false;
    if (blob) {
      try {
        text = await whisperService.transcribe(blob);
      } catch (err) {
        console.warn(
          "[MicButton] Whisper 전사 실패, Web Speech 폴백 시도:",
          err,
        );
        whisperFailed = true;
      }
    } else {
      whisperFailed = true;
    }

    // 폴백: Whisper 가 실패했거나 빈 결과면 Web Speech 로 1회 재인식 시도.
    // Web Speech 는 새 마이크 세션이 필요하므로 학습자에게 짧게 안내한 뒤 호출.
    if ((!text || whisperFailed) && isWebSpeechSupported()) {
      clearProcessingHint();
      try {
        await speak("한 번 더 짧게 말씀해주세요.");
        text = await recognizeWithWebSpeech({ timeoutMs: 6_000 });
      } catch (err) {
        console.error("[MicButton] Web Speech 폴백도 실패:", err);
      }
    }

    if (!text) {
      clearProcessingHint();
      await speak("잘 못 들었어요. 다시 한 번 말씀해주세요.");
      setStatusSync("idle");
      return;
    }

    const intent = detectIntent(text);
    const staticResponse = getIntentResponse(intent, context);
    if (staticResponse) {
      clearProcessingHint();
      await speak(staticResponse);
      setStatusSync("idle");
      return;
    }

    // GPT 호출 — 응답 라우트는 실패해도 fallback 멘트를 response 필드에 채워준다.
    try {
      const res = await fetch("/api/gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: text, context: context ?? "" }),
      });
      const data = (await res.json()) as { response?: string; error?: string };
      const reply =
        data.response?.trim() ||
        "지금은 답하기가 어려워요. 잠시 후 다시 말씀해주세요.";
      clearProcessingHint();
      await speak(reply);
    } catch (err) {
      console.error("[MicButton] GPT 호출 실패:", err);
      clearProcessingHint();
      await speak("지금은 답하기가 어려워요. 잠시 후 다시 말씀해주세요.");
    } finally {
      clearProcessingHint();
      setStatusSync("idle");
    }
  }, [context, setStatusSync, speak]);

  // ── 녹음 시작 ─────────────────────────────────────────────────
  const startRecording = React.useCallback(async () => {
    if (statusRef.current !== "idle") return;

    if (micGranted === false) {
      await speak(
        "마이크 권한이 필요해요. 브라우저 주소창 옆 마이크 아이콘을 눌러 허용해주세요.",
      );
      return;
    }

    // 진행 중 안내 음성을 끊는다 — 직후 발화할 "네, 듣고 있어요" 가 즉시 들리도록.
    ttsManager.stop();

    // [청각 피드백 1단] 녹음 시작 안내. 발화가 await 로 완전히 끝난 뒤 녹음을 시작해야
    // 마이크가 자기 안내 음성을 녹음하지 않는다. 안내 발화 동안 중복 더블탭은 무시.
    setStatusSync("preparing");
    await speak("네, 듣고 있어요.");

    // 안내 발화 도중에 외부에서 status 가 바뀌었으면(언마운트 / cancelRecording) 중단.
    // 함수 시작의 가드(idle 체크)로 narrow 된 타입이 await 너머에 살아남아 비교가
    // 충돌하므로, Status 로 다시 단언해 union 전체를 복원한다.
    if ((statusRef.current as Status) !== "preparing") return;

    let analyser: AnalyserNode | null = null;
    try {
      const handles = await whisperService.startRecording();
      analyser = handles.analyser;
    } catch (err) {
      console.error("[MicButton] 녹음 시작 실패:", err);
      setMicGranted(false);
      setStatusSync("idle");
      await speak(
        "마이크를 사용할 수 없어요. 브라우저 권한을 확인해주세요.",
      );
      return;
    }

    setStatusSync("recording");

    // 최대 시간 안전망 — VAD 가 동작 안 해도 결국 종료.
    autoStopTimerRef.current = setTimeout(() => {
      void finishRecording();
    }, MAX_RECORDING_MS);

    // VAD 루프 — analyser 가 없으면 생략 (최대 시간 종료만 의존).
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
        if (avg > VAD_SILENCE_THRESHOLD) {
          lastSoundAt = now;
        }

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

  // ── 단일 탭 / 더블 탭 분리 ────────────────────────────────────
  const handleSingleTap = React.useCallback(() => {
    if (statusRef.current === "recording") {
      // 녹음 중일 때는 단일 탭도 종료 (한 번만 두드려도 답을 주도록).
      void finishRecording();
      return;
    }
    if (
      statusRef.current === "processing" ||
      statusRef.current === "preparing"
    ) {
      // 처리/준비 중에는 안내 음성을 생략 (각각의 청각 신호가 이미 진행 중).
      return;
    }
    void speak(
      "도담이에요. 두 번 두드려 무엇이든 물어보세요. 안내는 해드리지만, 선택과 결제는 직접 해주셔야 해요.",
    );
  }, [finishRecording, speak]);

  const handleDoubleTap = React.useCallback(() => {
    if (statusRef.current === "recording") {
      void finishRecording();
      return;
    }
    if (
      statusRef.current === "processing" ||
      statusRef.current === "preparing"
    ) {
      return;
    }
    void startRecording();
  }, [finishRecording, startRecording]);

  const { onClick, onKeyDown, onFocus } = useDoubleTap({
    onSingleTap: handleSingleTap,
    onDoubleTap: handleDoubleTap,
  });

  const ariaLabel =
    status === "preparing"
      ? "도담이 들을 준비를 하고 있어요."
      : status === "recording"
        ? "녹음 중이에요. 한 번 더 두드리면 끝나요."
        : status === "processing"
          ? "도담이 답을 준비하고 있어요."
          : "도담이에요. 두 번 두드려 무엇이든 물어보세요. 안내는 해드리지만, 선택과 결제는 직접 해주셔야 해요.";

  const isBusy = status === "preparing" || status === "processing";

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      aria-label={ariaLabel}
      aria-live="polite"
      aria-pressed={status === "recording"}
      disabled={isBusy}
      data-status={status}
      className={cn(
        "flex touch-manipulation items-center justify-center rounded-full shadow-lg transition-all",
        "focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "disabled:cursor-not-allowed",
        position === "floating"
          ? "fixed bottom-24 right-6 z-30 h-16 w-16 md:h-20 md:w-20"
          : "h-14 w-14",
        status === "recording"
          ? "animate-pulse bg-red-500 text-white"
          : status === "preparing"
            ? "bg-accent text-accent-foreground"
            : status === "processing"
              ? "bg-foreground/40 text-white"
              : "bg-primary text-primary-foreground hover:opacity-95",
        className,
      )}
    >
      <span className="relative flex items-center justify-center">
        <MicIcon />
        {status === "recording" ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-block h-3 w-3 animate-pulse rounded-full bg-red-200 ring-2 ring-red-700"
          />
        ) : null}
      </span>
      <span className="sr-only">{ariaLabel}</span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-7 w-7 md:h-9 md:w-9"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}
