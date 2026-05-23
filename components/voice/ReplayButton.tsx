"use client";

/**
 * ReplayButton — 다시 듣기 (KS X 9211:2025 6.3.6)
 *
 * 단일 터치: "다시 듣기 버튼이에요" 안내
 * 더블 탭  : 마지막 시퀀스(voiceStore.lastSequence) 또는 prop 으로 전달된 text 발화
 *
 * 두 가지 사용 방식
 *  1) prop 으로 text 를 주입: 페이지 고유 안내를 항상 그대로 재생
 *  2) prop 없이 사용: voiceStore.lastSequence 자동 재생 (KioskFrame 헤더용)
 */

import * as React from "react";

import { useDoubleTap } from "@/lib/interaction/doubleTap";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { useVoiceStore } from "@/stores/voiceStore";
import { cn } from "@/lib/utils";

export interface ReplayButtonProps {
  /** 명시적으로 재생할 텍스트(또는 시퀀스). 없으면 voiceStore.lastSequence 사용. */
  text?: string | readonly string[];
  /** 단일 탭 시 발화할 안내. 기본 "다시 듣기 버튼이에요. 두 번 두드리면 다시 들려드려요." */
  voiceLabel?: string;
  /** 헤더에 들어갈 작은 형태 / 본문에 들어갈 큰 형태 */
  position?: "header" | "inline";
  className?: string;
}

const DEFAULT_LABEL =
  "다시 듣기 버튼이에요. 두 번 두드리면 방금 안내를 다시 들려드려요.";

export function ReplayButton({
  text,
  voiceLabel = DEFAULT_LABEL,
  position = "header",
  className,
}: ReplayButtonProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const isSpeaking = useVoiceStore((s) => s.isSpeaking);
  const lastSequence = useVoiceStore((s) => s.lastSequence);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);

  const handleSingle = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    // 단일 탭 = "다시 듣기 버튼이에요" 안내. 즉각 반응 우선 → 로컬 Web Speech.
    // (더블 탭의 실제 재생(handleDouble)은 speak() 로 nova 음색 유지)
    ttsManager.speakQuick(voiceLabel);
  }, [isEnabled, voice, speed, voiceLabel]);

  const handleDouble = React.useCallback(() => {
    if (!isEnabled) return;
    const seq = Array.isArray(text)
      ? [...text]
      : typeof text === "string"
        ? [text]
        : lastSequence;
    if (!seq.length) return;
    ttsManager.stop();
    void (async () => {
      for (const line of seq) {
        await ttsManager.speak(line);
      }
    })();
  }, [isEnabled, text, lastSequence]);

  const { onClick, onKeyDown, onFocus } = useDoubleTap({
    onSingleTap: handleSingle,
    onDoubleTap: handleDouble,
  });

  const hasContent = text !== undefined || lastSequence.length > 0;
  const disabled = !isEnabled || !hasContent || isSpeaking;

  if (position === "header") {
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        disabled={disabled}
        aria-label={voiceLabel}
        title="다시 듣기 (두 번 두드리기)"
        className={cn(
          "inline-flex touch-manipulation items-center gap-1.5 rounded-xl bg-primary-foreground/15 px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:bg-primary-foreground/25",
          "focus:ring-4 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-40",
          className,
        )}
      >
        <span aria-hidden="true">🔁</span>
        <span>다시 듣기</span>
      </button>
    );
  }

  // inline (본문용 — 큰 버튼)
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      disabled={disabled}
      aria-label={voiceLabel}
      className={cn(
        "inline-flex touch-manipulation items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground shadow-md transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span aria-hidden="true">🔁</span>
      <span>다시 듣기</span>
    </button>
  );
}
