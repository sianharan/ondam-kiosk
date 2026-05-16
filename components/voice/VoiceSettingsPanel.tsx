"use client";

/**
 * VoiceSettingsPanel — 화면 우측 상단 음성 설정
 *
 * KS X 9211:2025
 *   - 5.2.2 d) 청각 대체     — 모든 설정 변경 즉시 안내 발화
 *   - 6.3.3   음량 조절       — 5단계 (50/75/100/125/150%)
 *   - 8.3.2   충분한 시간 제공 — 4단계 속도 (0.8 ~ 1.5)
 *
 * 음성: nova / shimmer / echo (OpenAI TTS). 폴백은 Web Speech.
 */

import * as React from "react";

import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import {
  VOICE_DESCRIPTIONS,
  VOICE_NAMES,
  VOICE_SPEED_OPTIONS,
  VOICE_VOLUME_OPTIONS,
  VOLUME_TO_AUDIO,
  useVoiceStore,
  type VoiceName,
  type VoiceSpeed,
  type VoiceVolume,
} from "@/stores/voiceStore";
import { cn } from "@/lib/utils";

export interface VoiceSettingsPanelProps {
  className?: string;
}

function volumePercentLabel(v: VoiceVolume): string {
  return `${Math.round(v * 100)}%`;
}

export function VoiceSettingsPanel({ className }: VoiceSettingsPanelProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);
  const toggle = useVoiceStore((s) => s.toggle);
  const setVoice = useVoiceStore((s) => s.setVoice);
  const setSpeed = useVoiceStore((s) => s.setSpeed);
  const setVolume = useVoiceStore((s) => s.setVolume);

  const [open, setOpen] = React.useState(false);

  // 매니저에 현재 설정을 시작 시점부터 반영 (페이지 마운트 시 한 번)
  React.useEffect(() => {
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
  }, [voice, speed, volume]);

  const handleVoiceChange = (next: VoiceName) => {
    setVoice(next);
    ttsManager.setVoice(next);
    ttsManager.stop();
    void ttsManager.speak(
      `${VOICE_DESCRIPTIONS[next].label} 목소리로 안내해드릴게요.`,
      { interrupt: true },
    );
  };

  const handleSpeedChange = (next: VoiceSpeed) => {
    setSpeed(next);
    ttsManager.setSpeed(next);
    ttsManager.stop();
    void ttsManager.speak(VOICE_SCRIPTS.system.rateChanged(next), {
      interrupt: true,
    });
  };

  const handleVolumeChange = (next: VoiceVolume) => {
    setVolume(next);
    ttsManager.setVolume(VOLUME_TO_AUDIO[next]);
    ttsManager.stop();
    void ttsManager.speak(`음량을 ${volumePercentLabel(next)}로 바꿨어요.`, {
      interrupt: true,
    });
  };

  const handleToggle = () => {
    const willBeEnabled = !isEnabled;
    toggle();
    if (!willBeEnabled) {
      ttsManager.stop();
    } else {
      void ttsManager.speak(VOICE_SCRIPTS.system.unmuted, { interrupt: true });
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
        {open ? "설정 닫기" : "🔊 음성 설정"}
      </button>

      {open && (
        <div
          id="voice-settings-popover"
          role="group"
          aria-label="음성 안내 설정"
          className="flex w-80 flex-col gap-5 rounded-2xl border border-foreground/15 bg-background p-4 shadow-lg"
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

          {/* ── 음성 종류 ────────────────────────────────── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold text-foreground">
              음성 선택
            </legend>
            <div className="flex flex-col gap-1">
              {VOICE_NAMES.map((name) => {
                const selected = voice === name;
                const meta = VOICE_DESCRIPTIONS[name];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleVoiceChange(name)}
                    aria-pressed={selected}
                    aria-label={`${meta.label} 음성. ${meta.tone}.`}
                    disabled={!isEnabled}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/10 text-foreground hover:bg-foreground/15",
                    )}
                  >
                    <span className="text-sm font-semibold">{meta.label}</span>
                    <span
                      className={cn(
                        "text-xs",
                        selected
                          ? "text-primary-foreground/80"
                          : "text-foreground/60",
                      )}
                    >
                      {meta.tone}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── 속도 ────────────────────────────────────── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold text-foreground">
              안내 속도
            </legend>
            <div className="grid grid-cols-4 gap-1">
              {VOICE_SPEED_OPTIONS.map((opt) => {
                const selected = speed === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSpeedChange(opt)}
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

          {/* ── 음량 ────────────────────────────────────── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold text-foreground">
              🔊 음량
            </legend>
            <div className="grid grid-cols-5 gap-1">
              {VOICE_VOLUME_OPTIONS.map((opt) => {
                const selected = volume === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleVolumeChange(opt)}
                    aria-pressed={selected}
                    aria-label={`음량 ${volumePercentLabel(opt)}`}
                    disabled={!isEnabled}
                    className={cn(
                      "rounded-lg px-1 py-2 text-xs font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/10 text-foreground hover:bg-foreground/15",
                    )}
                  >
                    {volumePercentLabel(opt)}
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
