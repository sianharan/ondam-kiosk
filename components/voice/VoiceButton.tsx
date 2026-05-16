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
 * 사용 예
 *   <VoiceButton
 *     voiceLabel="시작하기 버튼이에요. 두 번 두드리면 다음 단계로 넘어가요."
 *     onActivate={() => router.push("/spatial-map")}
 *   >
 *     시작하기
 *   </VoiceButton>
 */

import * as React from "react";

import { useDoubleTap } from "@/lib/interaction/doubleTap";
import { speechManager } from "@/lib/tts/webSpeech";
import { useVoiceStore } from "@/stores/voiceStore";
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
  secondary:
    "bg-primary text-primary-foreground shadow-md hover:opacity-95",
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
  const rate = useVoiceStore((s) => s.rate);
  const volume = useVoiceStore((s) => s.volume);

  const handleSingleTap = React.useCallback(() => {
    if (!isEnabled) return;
    speechManager.setRate(rate);
    speechManager.setVolume(volume);
    // 안내 발화는 즉시 (앞 안내 끊고) 새로 — 더 직관적.
    void speechManager.speak(voiceLabel, { interrupt: true });
  }, [isEnabled, rate, volume, voiceLabel]);

  const handleDoubleTap = React.useCallback(() => {
    // 실행 전 안내 음성을 끊어 다음 화면 음성과 충돌하지 않도록.
    speechManager.stop();
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
      aria-describedby={undefined}
      data-voice-label={voiceLabel}
      className={cn(
        "rounded-2xl px-10 py-5 text-2xl font-bold transition-all",
        "focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
