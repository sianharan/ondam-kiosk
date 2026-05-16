"use client";

/**
 * VoiceSettingsPanel — 화면 우측 상단 음성 설정
 *
 * KS X 9211:2025 충족
 *   - 8.3.2 충분한 시간 제공: 학습자가 속도(0.8 ~ 1.5)를 선택
 *   - 6.3.3 사용 후 음량 65dBA 이하 자동 초기화: resetToDefault 호출 지점은 세션 종료 시
 *   - 음소거 토글로 발화 즉시 중단
 *
 * 디자인
 *   - 키오스크 프레임 헤더 오른쪽에 떠 있는 작은 패널 (절대 위치)
 *   - 속도 4단계 라디오 버튼 + 음소거 토글
 *   - 단순 클릭(더블탭 X) — 설정은 KS X 9211 7.6.6 적용 대상이 아닌 보조 UI
 */

import * as React from "react";

import { speechManager } from "@/lib/tts/webSpeech";
import {
  VOICE_RATE_OPTIONS,
  useVoiceStore,
  type VoiceRate,
} from "@/stores/voiceStore";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { cn } from "@/lib/utils";

export interface VoiceSettingsPanelProps {
  className?: string;
}

export function VoiceSettingsPanel({ className }: VoiceSettingsPanelProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const rate = useVoiceStore((s) => s.rate);
  const toggle = useVoiceStore((s) => s.toggle);
  const setRate = useVoiceStore((s) => s.setRate);

  const [open, setOpen] = React.useState(false);

  const handleRateChange = (next: VoiceRate) => {
    setRate(next);
    speechManager.setRate(next);
    // 즉시 확인용 짧은 안내
    speechManager.stop();
    void speechManager.speak(VOICE_SCRIPTS.system.rateChanged(next), {
      interrupt: true,
    });
  };

  const handleToggle = () => {
    const willBeEnabled = !isEnabled;
    toggle();
    if (!willBeEnabled) {
      // 끄는 경우: 발화 즉시 중단 (UX: 안내 후 끄는 게 더 친절하지만, 끄려는 사람은 빨리 끄고 싶다)
      speechManager.stop();
    } else {
      void speechManager.speak(VOICE_SCRIPTS.system.unmuted, {
        interrupt: true,
      });
    }
  };

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-50 flex flex-col items-end gap-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="voice-settings-popover"
        aria-label={open ? "음성 설정 닫기" : "음성 설정 열기"}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none"
      >
        {open ? "설정 닫기" : "음성 설정"}
      </button>

      {open && (
        <div
          id="voice-settings-popover"
          role="group"
          aria-label="음성 안내 설정"
          className="flex w-72 flex-col gap-4 rounded-2xl border border-foreground/15 bg-background p-4 shadow-lg"
        >
          {/* ── 음성 On/Off ─────────────────────────────── */}
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-foreground">
              음성 안내
            </span>
            <button
              type="button"
              onClick={handleToggle}
              role="switch"
              aria-checked={isEnabled}
              aria-label={isEnabled ? "음성 안내 끄기" : "음성 안내 켜기"}
              className={cn(
                "relative h-8 w-14 rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none",
                isEnabled ? "bg-accent" : "bg-foreground/25",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full bg-background transition-transform",
                  isEnabled ? "translate-x-7" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {/* ── 속도 ────────────────────────────────────── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold text-foreground">
              안내 속도
            </legend>
            <div className="grid grid-cols-4 gap-1">
              {VOICE_RATE_OPTIONS.map((opt) => {
                const selected = rate === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleRateChange(opt)}
                    aria-pressed={selected}
                    aria-label={`안내 속도 ${opt}배속`}
                    disabled={!isEnabled}
                    className={cn(
                      "rounded-lg px-2 py-2 text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/10 text-foreground hover:bg-foreground/15",
                    )}
                  >
                    {opt}×
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
