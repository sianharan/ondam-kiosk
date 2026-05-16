"use client";

/**
 * CategoryGrid — 4개 카테고리 선택 화면
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 VoiceCoach 가 카테고리 4개 위치를 자동 안내 (5.2.2 d / 4.3 전역→국소)
 *   - 각 카드: 단일 탭 = voiceLabel 안내, 더블 탭 = 선택 (7.6.6)
 */

import * as React from "react";

import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { useDoubleTap } from "@/lib/interaction/doubleTap";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, type Category } from "@/lib/kiosk-data/menu";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

interface CategoryDef {
  id: Category;
  /** 단일 탭 시 발화할 안내 (이름 + 들어있는 메뉴 + 더블탭 안내) */
  voiceLabel: string;
  /** 음성/접근성 한 줄 설명 */
  voiceDesc: string;
  bgClass: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "coffee",
    voiceLabel:
      "왼쪽 위, 커피 카테고리예요. 아메리카노, 카페라떼, 카푸치노가 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "아메리카노, 카페라떼, 카푸치노 등 원두 음료",
    bgClass: "bg-category-coffee",
    icon: (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="size-20 md:size-24"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 26h32v14a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12V26z" />
          <path d="M44 30h6a6 6 0 1 1 0 12h-6" />
          <path d="M22 10c0 3 3 3 3 6s-3 3-3 6" />
          <path d="M32 10c0 3 3 3 3 6s-3 3-3 6" />
        </g>
      </svg>
    ),
  },
  {
    id: "ade",
    voiceLabel:
      "오른쪽 위, 에이드 카테고리예요. 레몬에이드, 자몽에이드가 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "레몬에이드, 자몽에이드 등 상큼한 탄산 음료",
    bgClass: "bg-category-ade",
    icon: (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="size-20 md:size-24"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 12h32l-5 40a6 6 0 0 1-6 5h-10a6 6 0 0 1-6-5L16 12z" />
          <path d="M19 26h26" />
          <circle cx="26" cy="36" r="2" />
          <circle cx="36" cy="42" r="2" />
          <circle cx="30" cy="48" r="1.5" />
        </g>
      </svg>
    ),
  },
  {
    id: "tea",
    voiceLabel:
      "왼쪽 아래, 티 카테고리예요. 캐모마일, 페퍼민트 차가 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "캐모마일, 페퍼민트 등 따뜻한 허브차",
    bgClass: "bg-category-tea",
    icon: (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="size-20 md:size-24"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 28h28v12a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12V28z" />
          <path d="M42 32h6a6 6 0 1 1 0 12h-6" />
          <path d="M24 10c0 4 3 4 3 8" />
          <path d="M32 10c0 4 3 4 3 8" />
        </g>
      </svg>
    ),
  },
  {
    id: "dessert",
    voiceLabel:
      "오른쪽 아래, 디저트 카테고리예요. 크로와상이 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "크로와상 등 빵·디저트류",
    bgClass: "bg-category-dessert",
    icon: (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="size-20 md:size-24"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 44c6-18 22-30 38-28 3 0 5 .5 8 1.5-3 3-6 5-9 5.5-8 1.5-16 6-22 14-4 5-8 8-15 7z" />
          <path d="M18 38l5 3" />
          <path d="M28 30l5 3" />
          <path d="M36 24l5 3" />
        </g>
      </svg>
    ),
  },
];

const ENTRY_SEQUENCE = [
  VOICE_SCRIPTS.category.intro,
  ...VOICE_SCRIPTS.category.items,
  VOICE_SCRIPTS.category.instruction,
] as const;

export interface CategoryGridProps {
  onSelect: (category: Category) => void;
}

export function CategoryGrid({ onSelect }: CategoryGridProps) {
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const setCategory = useOrderStore((s) => s.setCategory);
  const displayMode = useLearningStore((s) => s.displayMode);

  // 가로형: 1×4 가로 일렬. 세로형(또는 미선택): 2×2. (PROJECT_DESIGN 3.5.1/3.5.2)
  const gridClass =
    displayMode === "horizontal"
      ? "grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5"
      : "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6";

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2
          id="category-grid-heading"
          className="text-3xl font-bold text-foreground md:text-4xl"
        >
          어떤 종류를 드릴까요?
        </h2>
        <p className="mt-2 text-xl text-foreground/70 md:text-2xl">
          드시고 싶은 카테고리를 골라주세요.
        </p>
      </header>

      <VoiceCoach message={ENTRY_SEQUENCE} sequenceGapMs={400} />

      <div
        role="radiogroup"
        aria-labelledby="category-grid-heading"
        className={gridClass}
      >
        {CATEGORIES.map((c) => (
          <CategoryCard
            key={c.id}
            def={c}
            isSelected={selectedCategory === c.id}
            onActivate={() => {
              setCategory(c.id);
              onSelect(c.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}

// ── 단일 카테고리 카드 — 단일/더블 탭 분리 ─────────────────
interface CategoryCardProps {
  def: CategoryDef;
  isSelected: boolean;
  onActivate: () => void;
}

function CategoryCard({ def, isSelected, onActivate }: CategoryCardProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const handleSingle = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
    void ttsManager.speak(def.voiceLabel, { interrupt: true });
  }, [def.voiceLabel, isEnabled, voice, speed, volume]);

  const handleDouble = React.useCallback(() => {
    ttsManager.stop();
    onActivate();
  }, [onActivate]);

  const { onClick, onKeyDown } = useDoubleTap({
    onSingleTap: handleSingle,
    onDoubleTap: handleDouble,
  });

  const label = CATEGORY_LABEL[def.id];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`${label}. ${def.voiceDesc}. 한 번 두드리면 안내, 두 번 두드리면 선택.`}
      data-voice-label={def.voiceLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "group/category relative flex aspect-[5/3] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl text-white shadow-lg transition-transform",
        "ring-1 ring-foreground/10",
        "hover:-translate-y-1 hover:shadow-xl",
        "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
        def.bgClass,
        isSelected && "ring-4 ring-accent",
        def.id === "dessert" && "text-[#3D2F1B]",
      )}
    >
      <span aria-hidden="true">{def.icon}</span>
      <span className="text-3xl font-bold md:text-4xl">{label}</span>
    </button>
  );
}
