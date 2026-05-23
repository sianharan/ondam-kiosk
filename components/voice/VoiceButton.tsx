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
import { usePrefetchVoiceLabels } from "@/lib/tts/usePrefetchVoiceLabels";
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

/**
 * 화면 하단 "다음 단계로" 단일 진행 버튼의 공통 크기.
 * 저시력 사용자가 어느 화면에서나 같은 위치·크기로 진행 버튼을 찾도록 통일한다:
 * 전폭(w-full) + 최소 64px 높이(min-h-16). 색은 호출부의 variant(기본 primary=주황) 유지.
 */
export const PROGRESS_BUTTON_CLASS = "w-full min-h-16 text-2xl md:text-3xl";

/**
 * 본문이 길어 진행 버튼이 화면 밖으로 밀리는 화면(spatial-map·영수증 등)용 sticky 푸터.
 * 스크롤 위치와 무관하게 버튼을 항상 본문 하단에 고정해 저시력 사용자가 찾기 쉽게 한다.
 * KioskFrame main 안에 두는 것을 전제로 한다(불투명 배경으로 뒤 콘텐츠를 가림).
 */
export const STICKY_PROGRESS_FOOTER =
  "sticky bottom-0 z-10 w-full mt-4 border-t border-foreground/10 bg-background pt-4 pb-2";

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

  // 라벨 오디오를 마운트 시 미리 받아 두면(prefetch), Tab/단일 탭 시 nova 가 캐시
  // 적중으로 즉시 재생된다. (음색은 nova 유지)
  usePrefetchVoiceLabels(React.useMemo(() => [voiceLabel], [voiceLabel]));

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

  const { onClick, onKeyDown, onFocus } = useDoubleTap({
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
      onFocus={onFocus}
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
