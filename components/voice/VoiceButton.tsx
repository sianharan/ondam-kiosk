"use client";

/**
 * VoiceButton — voiceLabel 자동 부착 + 단일/더블 탭 분리 버튼
 *
 * KS X 9211:2025 7.6.6  "선택과 실행 분리"
 *   - 단일 터치 → voiceLabel 발화 (어떤 버튼인지 안내)
 *   - 더블 탭   → onActivate 실행
 *   - 접근성: aria-label = voiceLabel, focus-visible ring-4
 *   - 키보드: Enter / Space 도 동일한 단일/더블 규칙 (doubleTap 훅)
 *
 * 발화 엔진은 ttsManager (OpenAI nova → 폴백 Web Speech).
 */

import * as React from "react";

import { useDoubleTap } from "@/lib/interaction/doubleTap";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

export interface VoiceButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "aria-label"
  > {
  /** 단일 탭 시 발화할 안내 문구. aria-label 로도 자동 부착. */
  voiceLabel: string;
  /** 더블 탭 시 실행할 액션 */
  onActivate: () => void;
  /** 시각적 버튼 내용 */
  children: React.ReactNode;
  variant?: Variant;
  /** 명시적으로 다른 aria-label 을 주고 싶을 때 (보통은 voiceLabel 그대로) */
  ariaLabel?: string;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg",
  secondary: "bg-primary text-primary-foreground shadow-md hover:opacity-95",
  ghost:
    "bg-transparent text-foreground ring-1 ring-foreground/20 hover:bg-foreground/5",
};

export function VoiceButton({
  voiceLabel,
  onActivate,
  children,
  variant = "primary",
  ariaLabel,
  className,
  disabled,
  type = "button",
  ...rest
}: VoiceButtonProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const handleSingleTap = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
    void ttsManager.speak(voiceLabel, { interrupt: true });
  }, [isEnabled, voice, speed, volume, voiceLabel]);

  const handleDoubleTap = React.useCallback(() => {
    // 실행 전 안내 음성을 끊어 다음 화면 음성과 충돌하지 않도록.
    ttsManager.stop();
    onActivate();
  }, [onActivate]);

  const { onClick, onKeyDown } = useDoubleTap({
    onSingleTap: handleSingleTap,
    onDoubleTap: handleDoubleTap,
  });

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel ?? voiceLabel}
      data-voice-label={voiceLabel}
      className={cn(
        "touch-manipulation rounded-2xl px-10 py-5 text-2xl font-bold transition-all",
        "focus:ring-4 focus:ring-primary focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
