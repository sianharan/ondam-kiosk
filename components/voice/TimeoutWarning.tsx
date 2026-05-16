"use client";

/**
 * TimeoutWarning — 시간 만료 20초 전 모달 (KS X 9211:2025 8.2.2)
 *
 * useTimeout 의 onWarning 콜백에서 setOpen(true) 하면 표시된다.
 * - 자동으로 nova 음성으로 경고 발화
 * - "더 시간 주세요" → onExtend(60_000) 호출 + 닫힘
 * - "지금 다음으로" → onProceed() 호출 + 닫힘
 *
 * 닫는 행위는 무조건 명시적 — 외부 클릭으로 닫히지 않는다 (학습자 안전).
 */

import * as React from "react";

import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useVoiceStore } from "@/stores/voiceStore";
import { cn } from "@/lib/utils";

export interface TimeoutWarningProps {
  open: boolean;
  /** 학습자가 시간을 더 요청. 호출 측에서 useTimeout 의 extend() 호출 */
  onExtend: () => void;
  /** 학습자가 즉시 다음으로 진행 — 보통 useTimeout 의 onExpire 와 같은 처리 */
  onProceed: () => void;
  /** 모달이 사라질 때 자동으로 호출 — open 상태를 부모가 관리 */
  onClose: () => void;
}

export function TimeoutWarning({
  open,
  onExtend,
  onProceed,
  onClose,
}: TimeoutWarningProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);

  // 모달이 열리는 순간 nova 음성으로 경고 발화
  React.useEffect(() => {
    if (!open || !isEnabled) return;
    void ttsManager.speak(VOICE_SCRIPTS.system.timeoutWarning, {
      interrupt: true,
    });
    return () => {
      // 닫힐 때 경고 발화도 끊는다 (다음 화면 발화와 충돌 방지)
      ttsManager.stop();
    };
  }, [open, isEnabled]);

  if (!open) return null;

  const handleExtend = () => {
    onExtend();
    if (isEnabled) {
      void ttsManager.speak(VOICE_SCRIPTS.system.timeoutExtended, {
        interrupt: true,
      });
    }
    onClose();
  };

  const handleProceed = () => {
    onProceed();
    onClose();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="timeout-warning-title"
      aria-describedby="timeout-warning-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 animate-in fade-in duration-200"
    >
      <div
        className={cn(
          "flex w-full max-w-lg flex-col gap-5 rounded-3xl bg-background p-7 shadow-2xl ring-1 ring-foreground/15",
        )}
      >
        <h2
          id="timeout-warning-title"
          className="text-3xl font-bold text-accent md:text-4xl"
        >
          잠시만요!
        </h2>

        <p
          id="timeout-warning-desc"
          className="text-xl leading-relaxed text-foreground md:text-2xl"
        >
          {VOICE_SCRIPTS.system.timeoutWarning}
        </p>

        <div className="flex flex-col gap-3 pt-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={handleProceed}
            aria-label="지금 다음 단계로 진행하기"
            className="rounded-2xl bg-muted px-6 py-4 text-xl font-semibold text-foreground ring-1 ring-foreground/15 hover:bg-muted/80 focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none md:text-2xl"
          >
            지금 다음으로
          </button>
          <button
            type="button"
            onClick={handleExtend}
            aria-label="시간 60초 연장하기"
            className="rounded-2xl bg-accent px-6 py-4 text-xl font-bold text-accent-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none md:text-2xl"
          >
            더 시간 주세요 (+60초)
          </button>
        </div>
      </div>
    </div>
  );
}
