"use client";

/**
 * MenuGrid — 선택된 카테고리의 메뉴 목록
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 카테고리 안내 자동 발화 (VoiceCoach)
 *   - 각 메뉴 카드: 단일 탭 = "이름 + 설명 + 가격" 안내, 더블 탭 = 선택 (7.6.6)
 *   - "← 카테고리로 돌아가기" 도 단일/더블 탭 분리
 */

import * as React from "react";

import { MenuIllustration } from "@/components/kiosk/MenuIllustration";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { useDoubleTap } from "@/lib/interaction/doubleTap";
import {
  CATEGORY_LABEL,
  getMenuByCategory,
  type Category,
  type MenuItem,
} from "@/lib/kiosk-data/menu";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

export interface MenuGridProps {
  category: Category;
  onSelect: (item: MenuItem) => void;
  onBack: () => void;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

function getOptionSummary(item: MenuItem): string {
  const parts: string[] = [];
  if (item.options.temperature === "both") parts.push("따뜻/차갑게 선택");
  else if (item.options.temperature === "hot") parts.push("따뜻하게만");
  else if (item.options.temperature === "iced") parts.push("차갑게만");
  if (item.options.size) parts.push("사이즈 선택 가능");
  if (item.options.extras) parts.push("샷/시럽 추가 가능");
  return parts.join(" · ");
}

function buildMenuVoiceLabel(item: MenuItem): string {
  return `${item.voiceLabel}. ${item.description} 가격 ${formatPrice(item.basePrice)}. 두 번 두드리면 선택돼요.`;
}

export function MenuGrid({ category, onSelect, onBack }: MenuGridProps) {
  const setItem = useOrderStore((s) => s.setItem);
  const displayMode = useLearningStore((s) => s.displayMode);
  const currentMode = useLearningStore((s) => s.currentMode);
  const items = React.useMemo(
    () => getMenuByCategory(category),
    [category],
  );

  const entrySequence = React.useMemo(
    () => [
      VOICE_SCRIPTS.menu(CATEGORY_LABEL[category]),
      ...items.map((it) => `${it.voiceLabel}, ${formatPrice(it.basePrice)}.`),
    ],
    [category, items],
  );

  // 가로형: 큰 매장 키오스크답게 3열까지 확장. 세로형: 1~2열 기본.
  const gridClass =
    displayMode === "horizontal"
      ? "grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5"
      : "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5";

  // Phase 4-B — Fading: minimal / silent 모드에서는 메뉴 자동 안내 생략
  // (학습자는 각 카드 단일 탭으로 직접 메뉴 정보를 들어볼 수 있다).
  const verbosity = currentMode
    ? getModeConfig(currentMode).voiceVerbosity
    : "detailed";
  const announceMenu = verbosity === "detailed" || verbosity === "normal";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <BackButton onBack={onBack} />
        <h2
          id="menu-grid-heading"
          className="text-2xl font-bold text-foreground md:text-3xl"
        >
          {CATEGORY_LABEL[category]} 메뉴
        </h2>
      </div>

      {announceMenu && (
        <VoiceCoach message={entrySequence} sequenceGapMs={400} />
      )}

      <ul aria-labelledby="menu-grid-heading" className={gridClass}>
        {items.map((item) => (
          <li key={item.id}>
            <MenuCard
              item={item}
              onActivate={() => {
                setItem(item);
                onSelect(item);
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── 메뉴 카드 단일/더블 탭 ──────────────────────────────────
interface MenuCardProps {
  item: MenuItem;
  onActivate: () => void;
}

function MenuCard({ item, onActivate }: MenuCardProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const voiceLabel = buildMenuVoiceLabel(item);

  const handleSingle = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
    void ttsManager.speak(voiceLabel, { interrupt: true });
  }, [isEnabled, voice, speed, volume, voiceLabel]);

  const handleDouble = React.useCallback(() => {
    ttsManager.stop();
    onActivate();
  }, [onActivate]);

  const { onClick, onKeyDown } = useDoubleTap({
    onSingleTap: handleSingle,
    onDoubleTap: handleDouble,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={voiceLabel}
      data-voice-label={voiceLabel}
      className={cn(
        "flex h-full w-full flex-col items-stretch gap-3 rounded-2xl bg-background p-4 text-left",
        "ring-1 ring-foreground/15 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40",
        "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl p-2",
          "ring-1 ring-foreground/5",
          item.category === "coffee" && "bg-category-coffee/10",
          item.category === "ade" && "bg-category-ade/10",
          item.category === "tea" && "bg-category-tea/10",
          item.category === "dessert" && "bg-category-dessert/30",
        )}
      >
        <MenuIllustration menuId={item.id} />
      </div>

      <h3 className="text-2xl font-bold text-foreground md:text-[1.75rem]">
        {item.name}
      </h3>

      <p className="text-lg text-foreground/75 md:text-xl">
        {item.description}
      </p>

      <div className="mt-auto flex w-full items-end justify-between gap-3">
        <span className="text-base text-foreground/55 md:text-lg">
          {getOptionSummary(item) || "옵션 없음"}
        </span>
        <span className="text-2xl font-bold text-primary md:text-3xl">
          {formatPrice(item.basePrice)}
        </span>
      </div>
    </button>
  );
}

// ── 카테고리로 돌아가기 — 단일/더블 ────────────────────────
function BackButton({ onBack }: { onBack: () => void }) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const voiceLabel =
    "카테고리 화면으로 돌아가기 버튼이에요. 두 번 두드리면 처음 카테고리 선택 화면으로 가요.";

  const handleSingle = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
    void ttsManager.speak(voiceLabel, { interrupt: true });
  }, [isEnabled, voice, speed, volume]);

  const handleDouble = React.useCallback(() => {
    ttsManager.stop();
    onBack();
  }, [onBack]);

  const { onClick, onKeyDown } = useDoubleTap({
    onSingleTap: handleSingle,
    onDoubleTap: handleDouble,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={voiceLabel}
      className="inline-flex items-center gap-2 rounded-xl bg-muted px-5 py-3 text-lg font-medium text-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/80 focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
    >
      <span aria-hidden="true">←</span>
      <span>카테고리</span>
    </button>
  );
}
