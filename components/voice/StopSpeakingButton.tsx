"use client";

/**
 * StopSpeakingButton — 발화 즉시 중단 (KS X 9211:2025 6.3.7)
 *
 * isSpeaking 일 때만 화면 하단 우측에 floating 으로 떠 있고,
 * 클릭/탭 시 즉시 ttsManager.stop() — 단일/더블 분기 없이 single tap 으로 실행한다.
 * (멈춤은 학습 진행을 끊지 않는 "안전 행동" 이므로 7.6.6 의 더블탭 의무에서 제외)
 *
 * 안내 멘트 (단일 탭 전)은 의미가 없으므로 click 즉시 stop.
 * 키보드: Esc 단축키도 동일 동작.
 */

import * as React from "react";

import { ttsManager } from "@/lib/tts/fallbackTTS";
import { useVoiceStore } from "@/stores/voiceStore";
import { cn } from "@/lib/utils";

const STOP_LABEL =
  "도담의 말을 멈추기. 화면을 누르거나 ESC 키를 눌러도 멈춰요.";

export interface StopSpeakingButtonProps {
  className?: string;
}

export function StopSpeakingButton({ className }: StopSpeakingButtonProps) {
  const isSpeaking = useVoiceStore((s) => s.isSpeaking);
  const setSpeaking = useVoiceStore((s) => s.setSpeaking);
  const setCurrentText = useVoiceStore((s) => s.setCurrentText);

  const handleStop = React.useCallback(() => {
    ttsManager.stop();
    setSpeaking(false);
    setCurrentText(null);
  }, [setSpeaking, setCurrentText]);

  // ESC 단축키 — 시각 사용자 보조용
  React.useEffect(() => {
    if (!isSpeaking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleStop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSpeaking, handleStop]);

  if (!isSpeaking) return null;

  return (
    <button
      type="button"
      onClick={handleStop}
      aria-label={STOP_LABEL}
      title="멈추기 (ESC)"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-base font-semibold text-background shadow-lg",
        "hover:bg-foreground/90",
        "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
        className,
      )}
    >
      <span aria-hidden="true">⏹</span>
      <span>멈추기</span>
    </button>
  );
}
