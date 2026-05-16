"use client";

/**
 * VoiceCoach — "도담" 자동 발화 + 시각적 표시 컴포넌트
 *
 * PROJECT_DESIGN.md 5.2.2 d) 청각적 대체 콘텐츠 의무를 화면 진입 시점에 자동 충족.
 *
 * 동작
 *  - 마운트 시 message 를 speechManager 큐에 넣어 발화
 *  - voiceStore.isEnabled 가 false 이면 발화하지 않음 (UI 표시도 비활성)
 *  - voiceStore.rate / volume 을 매 호출 직전에 매니저에 적용
 *  - 언마운트 시 자동 stop — 페이지 이동 시 중복 발화 방지
 *
 * 추가 기능
 *  - 6.3.6 다시 듣기 / 6.3.7 읽기 종료 버튼 내장
 *  - 발화 중 도담 아이콘에 가벼운 펄스 애니메이션 (CSS, 3Hz 미만)
 */

import * as React from "react";

import { speechManager } from "@/lib/tts/webSpeech";
import { useVoiceStore } from "@/stores/voiceStore";
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
  /** 시각적 표시 위치 (기본 bottom). 화면 상단에 두고 싶으면 "top" */
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
  const rate = useVoiceStore((s) => s.rate);
  const volume = useVoiceStore((s) => s.volume);
  const isSpeaking = useVoiceStore((s) => s.isSpeaking);
  const setSpeaking = useVoiceStore((s) => s.setSpeaking);
  const setCurrentText = useVoiceStore((s) => s.setCurrentText);

  // 마지막에 발화한 시퀀스 — "다시 듣기" 용
  const lastSequenceRef = React.useRef<string[]>([]);

  const lines = React.useMemo<string[]>(
    () => (Array.isArray(message) ? [...message] : [message as string]),
    [message],
  );

  // 발화 핵심 로직. cancelled flag 로 race 안전하게.
  const playSequence = React.useCallback(
    async (seq: string[]) => {
      if (!seq.length) return;
      lastSequenceRef.current = seq;

      speechManager.setRate(rate);
      speechManager.setVolume(volume);

      setSpeaking(true);
      let cancelled = false;
      const cleanup = () => {
        cancelled = true;
      };
      // 호출자가 도중에 stop 했을 때를 위해 unmount 전 cleanup 을 외부에서 호출 가능하게.
      (playSequence as unknown as { _cleanup?: () => void })._cleanup = cleanup;

      try {
        for (let i = 0; i < seq.length; i += 1) {
          if (cancelled) break;
          setCurrentText(seq[i]);
          await speechManager.speak(seq[i]);
          if (cancelled) break;
          if (i < seq.length - 1 && sequenceGapMs > 0) {
            await new Promise<void>((resolve) =>
              setTimeout(resolve, sequenceGapMs),
            );
          }
        }
      } finally {
        setSpeaking(false);
        setCurrentText(null);
        if (!cancelled) onComplete?.();
      }
    },
    [onComplete, rate, sequenceGapMs, setCurrentText, setSpeaking, volume],
  );

  // 자동 발화: lines 또는 isEnabled 변경 시 새로 시작.
  React.useEffect(() => {
    if (!autoStart) return;
    if (!isEnabled) return;

    // 새 메시지로 들어왔으면 이전 발화 비우고 시작
    speechManager.stop();
    playSequence(lines);

    return () => {
      // 페이지 이동/언마운트 시 중복 발화 방지
      speechManager.stop();
      setSpeaking(false);
      setCurrentText(null);
    };
    // playSequence 는 deps 가 stable 하지 않으므로 lines/autoStart/isEnabled 기준으로만 트리거.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, autoStart, isEnabled]);

  const handleReplay = React.useCallback(() => {
    if (!isEnabled) return;
    speechManager.stop();
    playSequence(
      lastSequenceRef.current.length ? lastSequenceRef.current : lines,
    );
  }, [isEnabled, lines, playSequence]);

  const handleStop = React.useCallback(() => {
    speechManager.stop();
    setSpeaking(false);
    setCurrentText(null);
  }, [setCurrentText, setSpeaking]);

  // isEnabled 가 꺼지면 즉시 멈춤
  React.useEffect(() => {
    if (!isEnabled) handleStop();
  }, [isEnabled, handleStop]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={
        isSpeaking ? "도담이 안내하고 있어요" : "도담 음성 안내"
      }
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-foreground/15 bg-background/95 px-4 py-3 shadow-sm",
        position === "top" ? "mb-4" : "mt-4",
        className,
      )}
    >
      {/* 도담 아바타 — 발화 중에는 펄스 */}
      <div
        aria-hidden="true"
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-2xl text-accent-foreground",
          isSpeaking && "animate-[pulse_1.2s_ease-in-out_infinite]",
        )}
      >
        🌿
      </div>

      <div className="flex flex-1 flex-col">
        <span className="text-sm font-semibold text-accent">도담</span>
        <span className="text-base leading-snug text-foreground md:text-lg">
          {isEnabled
            ? isSpeaking
              ? "지금 안내하고 있어요…"
              : "안내가 끝났어요. 다시 듣기로 들으실 수 있어요."
            : "음성 안내가 꺼져 있어요."}
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
