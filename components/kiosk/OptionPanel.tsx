"use client";

/**
 * OptionPanel — 온도/사이즈/추가 옵션 선택 패널
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 표시되는 옵션 종류에 맞춰 자동 발화 (5.2.2 d)
 *   - 라디오/체크박스는 Radix UI 의 키보드 패턴을 그대로 유지 (단발 선택은
 *     중간 단계이고 다음 단계 진입에 더블탭 게이트가 따로 있음)
 *   - 라디오 옵션 변경 시 "따뜻하게 선택했어요" 짧은 안내
 *   - 최종 "이대로 주문" 버튼은 VoiceButton (단일/더블 분리)
 */

import * as React from "react";

import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
  type ExtraKey,
  type SizeKey,
  type Temperature,
} from "@/lib/kiosk-data/menu";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

export interface OptionPanelProps {
  onComplete: () => void;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function OptionPanel({ onComplete }: OptionPanelProps) {
  const selectedItem = useOrderStore((s) => s.selectedItem);
  const selectedTemperature = useOrderStore((s) => s.selectedTemperature);
  const selectedSize = useOrderStore((s) => s.selectedSize);
  const selectedExtras = useOrderStore((s) => s.selectedExtras);
  const setTemperature = useOrderStore((s) => s.setTemperature);
  const setSize = useOrderStore((s) => s.setSize);
  const toggleExtra = useOrderStore((s) => s.toggleExtra);
  const getTotalPrice = useOrderStore((s) => s.getTotalPrice);

  const isVoiceEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  // Phase 4-B — Fading 정책
  //   detailed/normal : 진입 안내 + 옵션 선택 시 짧은 음성 피드백
  //   minimal         : 진입 안내 X, 선택 시에만 짧은 피드백 (사용자가 명시적 조작)
  //   silent          : 모든 자동 발화 X (단일 탭 voiceLabel 발화는 VoiceButton 차원)
  const currentMode = useLearningStore((s) => s.currentMode);
  const verbosity = currentMode
    ? getModeConfig(currentMode).voiceVerbosity
    : "detailed";
  const announceEntry = verbosity === "detailed" || verbosity === "normal";
  const announceShortFeedback = verbosity !== "silent";

  const speakShort = React.useCallback(
    (text: string) => {
      if (!isVoiceEnabled) return;
      if (!announceShortFeedback) return;
      ttsManager.setVoice(voice);
      ttsManager.setSpeed(speed);
      ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
      void ttsManager.speak(text, { interrupt: true });
    },
    [isVoiceEnabled, voice, speed, volume, announceShortFeedback],
  );

  if (!selectedItem) {
    return (
      <p className="text-xl text-foreground/70" role="status">
        선택된 메뉴가 없어요. 이전 화면으로 돌아가 메뉴를 선택해주세요.
      </p>
    );
  }

  const showTemperature = selectedItem.options.temperature === "both";
  const showSize = Boolean(selectedItem.options.size);
  const showExtras = Boolean(selectedItem.options.extras);
  const hasAnyOption = showTemperature || showSize || showExtras;

  const temperatureSatisfied = showTemperature
    ? selectedTemperature !== null
    : true;

  // 진입 안내 — 표시되는 옵션 종류에 맞춰
  const entrySequence: string[] = [
    `${selectedItem.voiceLabel} 옵션을 골라주세요.`,
    ...(showTemperature ? [VOICE_SCRIPTS.options.temperature] : []),
    ...(showSize ? [VOICE_SCRIPTS.options.size] : []),
    ...(showExtras ? [VOICE_SCRIPTS.options.extras] : []),
    ...(!hasAnyOption
      ? ["이 메뉴는 추가 옵션이 없어요. 바로 주문하실 수 있어요."]
      : []),
  ];

  return (
    <section className="flex flex-col gap-7">
      <header>
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          {selectedItem.name} 옵션 선택
        </h2>
        <p className="mt-2 text-xl text-foreground/70 md:text-2xl">
          원하시는 옵션을 골라주세요.
        </p>
      </header>

      {announceEntry && (
        <VoiceCoach message={entrySequence} sequenceGapMs={500} />
      )}

      {!hasAnyOption && (
        <p className="text-xl text-foreground/80">
          이 메뉴는 추가 옵션이 없어요. 바로 주문하실 수 있어요.
        </p>
      )}

      {/* ── 온도 선택 ─────────────────────────────────────── */}
      {showTemperature && (
        <fieldset className="rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/15">
          <legend className="px-2 text-xl font-bold text-foreground md:text-2xl">
            온도
          </legend>
          <RadioGroup
            value={selectedTemperature ?? ""}
            onValueChange={(v) => {
              const t = v as Temperature;
              setTemperature(t);
              speakShort(
                t === "hot" ? "따뜻하게 골랐어요." : "차갑게 골랐어요.",
              );
            }}
            className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <OptionTile
              value="hot"
              checked={selectedTemperature === "hot"}
              label="따뜻하게"
              voiceLabel="따뜻하게"
            />
            <OptionTile
              value="iced"
              checked={selectedTemperature === "iced"}
              label="차갑게"
              voiceLabel="차갑게 (얼음 포함)"
            />
          </RadioGroup>
        </fieldset>
      )}

      {/* ── 사이즈 선택 ───────────────────────────────────── */}
      {showSize && (
        <fieldset className="rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/15">
          <legend className="px-2 text-xl font-bold text-foreground md:text-2xl">
            사이즈
          </legend>
          <RadioGroup
            value={selectedSize}
            onValueChange={(v) => {
              const s = v as SizeKey;
              setSize(s);
              speakShort(`${SIZE_OPTIONS[s].voiceLabel}로 골랐어요.`);
            }}
            className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            {(Object.keys(SIZE_OPTIONS) as SizeKey[]).map((key) => {
              const opt = SIZE_OPTIONS[key];
              const priceText =
                opt.priceAdd > 0
                  ? `+${formatPrice(opt.priceAdd)}`
                  : "기본 가격";
              return (
                <OptionTile
                  key={key}
                  value={key}
                  checked={selectedSize === key}
                  label={`${opt.label} (${priceText})`}
                  voiceLabel={`${opt.voiceLabel}, ${priceText}`}
                />
              );
            })}
          </RadioGroup>
        </fieldset>
      )}

      {/* ── 추가 옵션 (Checkbox) ───────────────────────────── */}
      {showExtras && (
        <fieldset className="rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/15">
          <legend className="px-2 text-xl font-bold text-foreground md:text-2xl">
            추가
          </legend>
          <div className="mt-3 flex flex-col gap-3">
            {(Object.keys(EXTRA_OPTIONS) as ExtraKey[]).map((key) => {
              const opt = EXTRA_OPTIONS[key];
              const isChecked = selectedExtras.includes(key);
              const priceText = `+${formatPrice(opt.priceAdd)}`;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors",
                    "hover:bg-muted/60",
                    "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                    isChecked
                      ? "border-primary bg-primary/5"
                      : "border-foreground/15 bg-background",
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => {
                      toggleExtra(key);
                      speakShort(
                        isChecked
                          ? `${opt.voiceLabel} 뺐어요.`
                          : `${opt.voiceLabel} 더했어요.`,
                      );
                    }}
                    aria-label={`${opt.voiceLabel}, ${priceText}`}
                    className="size-6"
                  />
                  <span className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-xl font-medium md:text-2xl">
                      {opt.label}
                    </span>
                    <span className="text-lg text-primary md:text-xl">
                      {priceText}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── 총 가격 + 진행 버튼 ────────────────────────────── */}
      <div
        className="flex flex-col gap-4 rounded-2xl bg-muted/60 p-6 md:flex-row md:items-center md:justify-between"
        aria-live="polite"
      >
        <div>
          <p className="text-lg text-foreground/70">현재 총 가격</p>
          <p className="text-3xl font-bold text-primary md:text-4xl">
            {formatPrice(getTotalPrice())}
          </p>
        </div>
        <VoiceButton
          voiceLabel={`이대로 주문 버튼이에요. 총 가격 ${formatPrice(getTotalPrice())}. 두 번 두드리면 장바구니 화면으로 가요.`}
          onActivate={onComplete}
          disabled={!temperatureSatisfied}
          className="md:text-2xl"
        >
          이대로 주문
        </VoiceButton>
      </div>
    </section>
  );
}

interface OptionTileProps {
  value: string;
  checked: boolean;
  label: string;
  voiceLabel: string;
}

function OptionTile({ value, checked, label, voiceLabel }: OptionTileProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors",
        "hover:bg-muted/60",
        "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent",
        checked
          ? "border-primary bg-primary/5"
          : "border-foreground/15 bg-background",
      )}
    >
      <RadioGroupItem
        value={value}
        aria-label={voiceLabel}
        className="size-6"
      />
      <span className="text-xl font-medium md:text-2xl">{label}</span>
    </label>
  );
}
