"use client";

/**
 * CategoryGrid — 4개 카테고리 선택 화면
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 VoiceCoach 가 카테고리 4개 위치를 자동 안내 (5.2.2 d / 4.3 전역→국소)
 *   - 각 카드: 단일 탭 = voiceLabel 안내, 더블 탭 = 선택 (7.6.6)
 */

import * as React from "react";

import { CategoryIllustration } from "@/components/kiosk/CategoryIllustration";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { useDoubleTap } from "@/lib/interaction/doubleTap";
import { CATEGORY_LABEL, type Category } from "@/lib/kiosk-data/menu";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

interface CategoryDef {
  id: Category;
  /** 단일 탭 시 발화할 안내 (이름 + 들어있는 메뉴 + 더블탭 안내) */
  voiceLabel: string;
  /** 음성/접근성 한 줄 설명 */
  voiceDesc: string;
  bgClass: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "coffee",
    voiceLabel:
      "왼쪽 위, 커피 카테고리예요. 아메리카노, 카페라떼, 카푸치노가 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "아메리카노, 카페라떼, 카푸치노 등 원두 음료",
    bgClass: "bg-category-coffee",
  },
  {
    id: "ade",
    voiceLabel:
      "오른쪽 위, 에이드 카테고리예요. 레몬에이드, 자몽에이드가 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "레몬에이드, 자몽에이드 등 상큼한 탄산 음료",
    bgClass: "bg-category-ade",
  },
  {
    id: "tea",
    voiceLabel:
      "왼쪽 아래, 티 카테고리예요. 캐모마일, 페퍼민트 차가 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "캐모마일, 페퍼민트 등 따뜻한 허브차",
    bgClass: "bg-category-tea",
  },
  {
    id: "dessert",
    voiceLabel:
      "오른쪽 아래, 디저트 카테고리예요. 크로와상이 있어요. 두 번 두드리면 선택돼요.",
    voiceDesc: "크로와상 등 빵·디저트류",
    bgClass: "bg-category-dessert",
  },
];

const ENTRY_SEQUENCE = [
  VOICE_SCRIPTS.category.intro,
  ...VOICE_SCRIPTS.category.items,
  VOICE_SCRIPTS.category.instruction,
] as const;

export interface CategoryGridProps {
  onSelect: (category: Category) => void;
  /**
   * 카테고리 진입 시퀀스 앞에 추가로 발화할 라인.
   *
   * 부모(OrderFlow → 모드 페이지)에서 "Modeling 단계예요…" 같은 모드 인트로를
   * 넘기면 카테고리 안내 시퀀스 앞에 한 번만 붙는다.  카테고리 화면이 다시 마운트될
   * 때마다 같이 흘러갈 수 있으므로, 일회성 보장은 부모(OrderFlow 의 useRef)가 한다.
   *
   * v2.2 Phase 3-C 이전에는 모드 페이지에서 별도 VoiceCoach 를 띄워 같은 화면에
   * VoiceCoach 패널이 두 개 떠 있고 음성도 두 줄로 충돌했다.  본 prop 도입으로
   * 한 화면 한 VoiceCoach 원칙을 회복한다.
   */
  prependVoice?: readonly string[];
}

export function CategoryGrid({ onSelect, prependVoice }: CategoryGridProps) {
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const setCategory = useOrderStore((s) => s.setCategory);
  const displayMode = useLearningStore((s) => s.displayMode);
  const currentMode = useLearningStore((s) => s.currentMode);

  // 가로형: 1×4 가로 일렬. 세로형(또는 미선택): 2×2. (PROJECT_DESIGN 3.5.1/3.5.2)
  const gridClass =
    displayMode === "horizontal"
      ? "grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5"
      : "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6";

  // Phase 4-B — 모드별 자동 음성 안내 정책 (PROJECT_DESIGN 4.2 Fading)
  //   detailed / normal : modeIntro + ENTRY_SEQUENCE (카테고리 4개 위치 안내)
  //   minimal / silent  : modeIntro 만 (한 줄짜리 인사 후 화면 안내는 침묵)
  //
  // silent 모드(Real Free)도 학습자가 어디에 도착했는지 알리는 진입 멘트 한 줄은
  // 들려준다 — 그 이후 카테고리/메뉴/옵션의 자동 발화만 모두 차단해 자율 탐색을
  // 보장한다.  currentMode === null 인 경우 안전하게 detailed 로 폴백.
  const verbosity = currentMode
    ? getModeConfig(currentMode).voiceVerbosity
    : "detailed";

  const voiceMessage = React.useMemo<readonly string[] | null>(() => {
    const intro = prependVoice ?? [];
    if (verbosity === "minimal" || verbosity === "silent") {
      return intro.length > 0 ? intro : null;
    }
    return intro.length > 0 ? [...intro, ...ENTRY_SEQUENCE] : ENTRY_SEQUENCE;
  }, [prependVoice, verbosity]);

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

      {voiceMessage && (
        <VoiceCoach message={voiceMessage} sequenceGapMs={400} />
      )}

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
        "group/category relative flex aspect-[5/4] touch-manipulation flex-col items-stretch gap-4 overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-transform md:gap-5 md:p-6",
        "ring-1 ring-foreground/10",
        "hover:-translate-y-1 hover:shadow-xl",
        "focus:ring-4 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:outline-none",
        def.bgClass,
        isSelected && "ring-4 ring-primary ring-offset-2 ring-offset-background",
        def.id === "dessert" && "text-[#3D2F1B]",
      )}
    >
      <div className="flex flex-1 items-center justify-center">
        <CategoryIllustration
          category={def.id}
          className="h-28 w-28 md:h-32 md:w-32"
        />
      </div>
      <span className="text-3xl font-bold md:text-4xl">{label}</span>
    </button>
  );
}
