"use client";

/**
 * VoiceCoach — "도담" 자동 발화 + 시각적 표시 컴포넌트
 *
 * 동작
 *  - 마운트 시 message 를 ttsManager 큐에 넣어 순차 발화
 *  - 발화 시작 시 voiceStore.lastSequence 에 시퀀스를 저장 → ReplayButton 사용
 *  - voiceStore.isEnabled 가 false 이면 발화하지 않음
 *  - voiceStore.voice / speed / volume 을 매 호출 직전에 매니저에 적용
 *  - 언마운트 시 자동 stop — 페이지 이동 시 중복 발화 방지
 *
 * KS X 9211:2025
 *   - 5.2.2 d) 청각 대체     — 마운트 자동 발화 + 시각 상태 표시
 *   - 6.3.6   다시 듣기      — 내부 [다시 듣기] 버튼 + 헤더 ReplayButton 도 lastSequence 사용
 *   - 6.3.7   읽기 종료      — 내부 [멈추기] + 글로벌 StopSpeakingButton
 *   - 6.3.3   음량 조절      — volume 5단계 → VOLUME_TO_AUDIO 매핑 (청력 보호)
 */

import * as React from "react";

import { ttsManager } from "@/lib/tts/fallbackTTS";
import {
  VOLUME_TO_AUDIO,
  useVoiceStore,
} from "@/stores/voiceStore";
import { cn } from "@/lib/utils";

export interface VoiceCoachProps {
  /** 발화 메시지. string 한 줄 또는 string[] 순서대로(이전 발화 끝나고 다음). */
  message: string | readonly string[];
  /** 마운트 시 자동 발화 여부 (기본 true) */
  autoStart?: boolean;
  /** 시퀀스 사이 텀 — 호흡 단위로 끊어 듣게 (기본 600ms) */
  sequenceGapMs?: number;
  /** 전체 발화 종료 시 호출 */
  onComplete?: () => void;
  /** 시각적 표시 위치 (기본 bottom) */
  position?: "top" | "bottom";
  className?: string;
}

export function VoiceCoach({
  message,
  autoStart = true,
  sequenceGapMs = 600,
  onComplete,
  position = "bottom",
  className,
}: VoiceCoachProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);
  const isSpeaking = useVoiceStore((s) => s.isSpeaking);
  const setSpeaking = useVoiceStore((s) => s.setSpeaking);
  const setCurrentText = useVoiceStore((s) => s.setCurrentText);
  const setLastSequence = useVoiceStore((s) => s.setLastSequence);

  const generationRef = React.useRef(0);
  // 마지막 시퀀스는 store 에도 저장하지만 컴포넌트 내부에서도 재참조한다
  // (다시 듣기 후 새로 useEffect 가 도는 동안 store 의 lastSequence 가 비워질 수도 있으므로).
  const lastSequenceRef = React.useRef<string[]>([]);

  const lines = React.useMemo<string[]>(
    () => (Array.isArray(message) ? [...message] : [message as string]),
    [message],
  );

  const playSequence = React.useCallback(
    async (seq: string[]) => {
      if (!seq.length) return;
      lastSequenceRef.current = seq;
      setLastSequence(seq);

      generationRef.current += 1;
      const myGeneration = generationRef.current;

      ttsManager.setVoice(voice);
      ttsManager.setSpeed(speed);
      ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
      setSpeaking(true);

      try {
        for (let i = 0; i < seq.length; i += 1) {
          if (generationRef.current !== myGeneration) return;
          setCurrentText(seq[i]);
          try {
            await ttsManager.speak(seq[i]);
          } catch (err) {
            // 자동 마운트 발화에서 가장 흔한 실패: 첫 사용자 제스처 전 브라우저가
            // speechSynthesis 를 차단해 "not-allowed" 를 던지는 경우.  사용자가
            // 화면을 한 번이라도 만지면 다음 발화부터 정상 동작하므로 UI 를
            // 크래시시키지 않고 시퀀스만 조용히 끊는다.  KS X 9211 5.2.2 d) 의
            // 청각 대체는 화면 텍스트로도 동시에 노출되어 있어 정보 손실 없음.
            if (typeof console !== "undefined") {
              console.warn("[VoiceCoach] TTS 발화 실패, 음성 안내 건너뜀:", err);
            }
            break;
          }
          if (generationRef.current !== myGeneration) return;
          if (i < seq.length - 1 && sequenceGapMs > 0) {
            await new Promise<void>((resolve) =>
              setTimeout(resolve, sequenceGapMs),
            );
          }
        }
        if (generationRef.current === myGeneration) onComplete?.();
      } finally {
        if (generationRef.current === myGeneration) {
          setSpeaking(false);
          setCurrentText(null);
        }
      }
    },
    [
      onComplete,
      sequenceGapMs,
      setCurrentText,
      setLastSequence,
      setSpeaking,
      speed,
      voice,
      volume,
    ],
  );

  React.useEffect(() => {
    if (!autoStart) return;
    if (!isEnabled) return;

    ttsManager.stop();
    playSequence(lines);

    return () => {
      generationRef.current += 1;
      ttsManager.stop();
      setSpeaking(false);
      setCurrentText(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, autoStart, isEnabled]);

  const handleReplay = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.stop();
    playSequence(
      lastSequenceRef.current.length ? lastSequenceRef.current : lines,
    );
  }, [isEnabled, lines, playSequence]);

  const handleStop = React.useCallback(() => {
    generationRef.current += 1;
    ttsManager.stop();
    setSpeaking(false);
    setCurrentText(null);
  }, [setCurrentText, setSpeaking]);

  React.useEffect(() => {
    if (!isEnabled) handleStop();
  }, [isEnabled, handleStop]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={isSpeaking ? "도담이 안내하고 있어요" : "도담 음성 안내"}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-foreground/15 bg-background/95 px-4 py-2 shadow-sm",
        position === "top" ? "mb-4" : "mt-4",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground",
          isSpeaking && "animate-[pulse_1.2s_ease-in-out_infinite]",
        )}
      >
        🌿
      </div>

      <div className="flex flex-1 items-baseline gap-2">
        <span className="text-sm font-semibold text-primary">도담</span>
        <span className="text-sm leading-snug text-foreground/80 md:text-base">
          {isEnabled
            ? isSpeaking
              ? "안내 중"
              : "안내 끝 · 다시 듣기"
            : "음성 안내 꺼짐"}
        </span>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleReplay}
          disabled={!isEnabled}
          aria-label="안내 다시 듣기"
          className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          다시 듣기
        </button>
        <button
          type="button"
          onClick={handleStop}
          disabled={!isSpeaking}
          aria-label="안내 멈추기"
          className="rounded-xl bg-foreground/10 px-3 py-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-90 focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          멈추기
        </button>
      </div>
    </div>
  );
}
