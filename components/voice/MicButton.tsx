"use client";

/**
 * MicButton — 양방향 음성 인터페이스 진입 버튼 (Phase 4-AI-A)
 *
 * 동작 (KS X 9211:2025 7.6.6 선택/실행 분리 유지)
 *   - idle 상태 단일 탭   → 안내 음성 ("마이크 버튼이에요...")
 *   - idle 상태 더블 탭   → 녹음 시작 (빨간 점 깜빡임)
 *   - recording 상태 클릭 → 녹음 종료 + Whisper 전사 + 의도 분기
 *   - 10초 자동 종료      → 학습자가 끝내는 걸 잊어도 무한 녹음 방지
 *
 * 의도 분기 (lib/llm/intentDetection)
 *   - 단순 의도(인사/긍정/부정) → 정적 응답으로 즉시 발화 (GPT 호출 없음)
 *   - 그 외                   → /api/gpt 호출 후 응답 발화
 *
 * 위치 (z-index 충돌 회피)
 *   - StopSpeakingButton: bottom-6 right-6 z-50 — 발화 중에만 표시
 *   - HintButton(floating): bottom-24 right-6 z-30 — 학습 페이지 한정
 *   - MicButton: bottom-24 right-6 z-30 (HintButton 미사용 페이지) 또는
 *     inline 위치를 부모가 지정
 *
 * 폴백
 *   - 마이크 권한 거부 / 사용 불가 → 안내 음성으로 그레이스풀 처리
 *   - Whisper 실패              → "다시 한 번 말씀해주세요"
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
import { whisperService } from "@/lib/stt/whisperService";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { cn } from "@/lib/utils";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

const MAX_RECORDING_MS = 10_000;

type Status = "idle" | "recording" | "processing";

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
  // status 를 최신값으로 보는 ref — setTimeout 콜백의 stale closure 방지
  const statusRef = React.useRef<Status>("idle");
  React.useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 마운트 시 권한 사전 확인. 첫 더블탭에서 권한 팝업이 한 번 더 뜰 수 있으나,
  // 본 사전 확인이 성공하면 그 이후엔 즉시 녹음 시작 가능.
  React.useEffect(() => {
    whisperService
      .requestMicAccess()
      .then(setMicGranted)
      .catch(() => setMicGranted(false));
  }, []);

  // 언마운트 시 진행 중 녹음 정리
  React.useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      if (statusRef.current === "recording") {
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

    setStatus("processing");

    let text = "";
    try {
      const blob = await whisperService.stopRecording();
      text = await whisperService.transcribe(blob);
    } catch (err) {
      console.error("[MicButton] 전사 실패:", err);
      await speak("잘 못 들었어요. 다시 한 번 말씀해주세요.");
      setStatus("idle");
      return;
    }

    if (!text) {
      await speak("잘 못 들었어요. 다시 한 번 말씀해주세요.");
      setStatus("idle");
      return;
    }

    const intent = detectIntent(text);
    const staticResponse = getIntentResponse(intent, context);
    if (staticResponse) {
      await speak(staticResponse);
      setStatus("idle");
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
      await speak(reply);
    } catch (err) {
      console.error("[MicButton] GPT 호출 실패:", err);
      await speak("지금은 답하기가 어려워요. 잠시 후 다시 말씀해주세요.");
    } finally {
      setStatus("idle");
    }
  }, [context, speak]);

  // ── 녹음 시작 ─────────────────────────────────────────────────
  const startRecording = React.useCallback(async () => {
    if (statusRef.current !== "idle") return;

    if (micGranted === false) {
      await speak(
        "마이크 권한이 필요해요. 브라우저 주소창 옆 마이크 아이콘을 눌러 허용해주세요.",
      );
      return;
    }

    // 진행 중 안내 음성을 끊어야 녹음이 자기 자신을 녹음하지 않는다.
    ttsManager.stop();

    try {
      await whisperService.startRecording();
    } catch (err) {
      console.error("[MicButton] 녹음 시작 실패:", err);
      setMicGranted(false);
      await speak(
        "마이크를 사용할 수 없어요. 브라우저 권한을 확인해주세요.",
      );
      return;
    }

    setStatus("recording");

    autoStopTimerRef.current = setTimeout(() => {
      void finishRecording();
    }, MAX_RECORDING_MS);
  }, [finishRecording, micGranted, speak]);

  // ── 단일 탭 / 더블 탭 분리 ────────────────────────────────────
  const handleSingleTap = React.useCallback(() => {
    if (statusRef.current === "recording") {
      // 녹음 중일 때는 단일 탭도 종료 (한 번만 두드려도 답을 주도록).
      void finishRecording();
      return;
    }
    if (statusRef.current === "processing") {
      // 처리 중에는 안내 음성을 생략 (응답이 곧 들어옴).
      return;
    }
    void speak(
      "마이크 버튼이에요. 두 번 두드리면 도담에게 말을 걸 수 있어요.",
    );
  }, [finishRecording, speak]);

  const handleDoubleTap = React.useCallback(() => {
    if (statusRef.current === "recording") {
      void finishRecording();
      return;
    }
    if (statusRef.current === "processing") return;
    void startRecording();
  }, [finishRecording, startRecording]);

  const { onClick, onKeyDown } = useDoubleTap({
    onSingleTap: handleSingleTap,
    onDoubleTap: handleDoubleTap,
  });

  const ariaLabel =
    status === "recording"
      ? "녹음 중이에요. 한 번 더 두드리면 끝나요."
      : status === "processing"
        ? "도담이 답을 준비하고 있어요."
        : "마이크 버튼이에요. 두 번 두드리면 도담에게 말을 걸 수 있어요.";

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      aria-live="polite"
      aria-pressed={status === "recording"}
      disabled={status === "processing"}
      data-status={status}
      className={cn(
        "flex items-center justify-center rounded-full shadow-lg transition-all",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/50",
        "disabled:cursor-not-allowed",
        position === "floating"
          ? "fixed bottom-24 right-6 z-30 h-16 w-16 md:h-20 md:w-20"
          : "h-14 w-14",
        status === "recording"
          ? "animate-pulse bg-red-500 text-white"
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
