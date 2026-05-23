"use client";

/**
 * CategoryIllustration — 4개 카테고리 카드용 SVG 일러스트
 *
 * MenuIllustration 과 같은 시각 언어(부드러운 컵 곡선·스팀·사세·잎·접시)를 사용하되,
 * 카드 배경이 솔리드 카테고리 컬러(text-white) 이므로 stroke 는 `currentColor` 로
 * 위임한다.  dessert 만 베이지 배경 + 어두운 글자(`text-[#3D2F1B]`) 이고 나머지는
 * 흰 글자이므로, currentColor 만으로 4 카테고리 모두 자연스럽게 대비를 얻는다.
 *
 * 시각 장식 전용 (aria-hidden). 음성 안내는 부모 카드의 voiceLabel 이 담당한다.
 */

import * as React from "react";

import type { Category } from "@/lib/kiosk-data/menu";
import { cn } from "@/lib/utils";

export interface CategoryIllustrationProps {
  category: Category;
  className?: string;
}

export function CategoryIllustration({
  category,
  className,
}: CategoryIllustrationProps) {
  const Drawing = ILLUSTRATIONS[category];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <Drawing />
    </div>
  );
}

// ── 공통 토큰 ────────────────────────────────────────────────
const SVG_PROPS = {
  viewBox: "0 0 120 120",
  width: "100%",
  height: "100%",
  role: "presentation" as const,
  preserveAspectRatio: "xMidYMid meet" as const,
  fill: "none" as const,
};

const STROKE = 3;
const STROKE_THIN = 1.8;
const STROKE_WISP = 2.4;

// ── 커피 ─────────────────────────────────────────────────────
function CoffeeIllustration() {
  return (
    <svg
      {...SVG_PROPS}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 스팀 3 줄 */}
      <path
        d="M44 14 q -5 8 1 14 q 6 6 1 16"
        strokeWidth={STROKE_WISP}
        opacity="0.85"
      />
      <path
        d="M60 10 q -5 10 1 18 q 6 6 1 18"
        strokeWidth={STROKE_WISP}
        opacity="0.85"
      />
      <path
        d="M76 14 q -5 8 1 14 q 6 6 1 16"
        strokeWidth={STROKE_WISP}
        opacity="0.85"
      />
      {/* 사세 */}
      <ellipse cx="60" cy="104" rx="42" ry="6" strokeWidth={STROKE} />
      {/* 컵 본체 */}
      <path
        d="M24 52 L28 92 Q30 102 44 102 L74 102 Q88 102 90 92 L94 52 Z"
        strokeWidth={STROKE}
      />
      {/* 손잡이 */}
      <path
        d="M94 64 Q112 64 112 78 Q112 92 94 92"
        strokeWidth={STROKE}
      />
      {/* 커피 표면 */}
      <ellipse cx="59" cy="52" rx="32" ry="5" strokeWidth={STROKE_THIN} />
    </svg>
  );
}

// ── 에이드 ───────────────────────────────────────────────────
function AdeIllustration() {
  return (
    <svg
      {...SVG_PROPS}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 빨대 */}
      <path d="M68 12 L60 58" strokeWidth={STROKE} />
      {/* 유리잔 */}
      <path
        d="M28 36 L38 104 Q39 112 50 112 L72 112 Q83 112 84 104 L94 36 Z"
        strokeWidth={STROKE}
      />
      <path d="M28 36 L94 36" strokeWidth={STROKE} />
      {/* 레몬 슬라이스 — 잔 가장자리에 걸침 */}
      <circle cx="38" cy="36" r="10" strokeWidth={STROKE_THIN} />
      <circle cx="38" cy="36" r="5.5" strokeWidth={1} />
      <path
        d="M38 28 L38 44 M30 36 L46 36 M32.5 30.5 L43.5 41.5 M43.5 30.5 L32.5 41.5"
        strokeWidth={1}
        opacity="0.9"
      />
      {/* 얼음 큐브 */}
      <rect x="46" y="58" width="14" height="14" rx="2.5" strokeWidth={2.2} />
      <rect x="62" y="78" width="13" height="13" rx="2.5" strokeWidth={2.2} />
      {/* 기포 */}
      <circle cx="50" cy="92" r="1.8" strokeWidth={1.4} />
      <circle cx="74" cy="64" r="1.8" strokeWidth={1.4} />
      <circle cx="56" cy="100" r="1.4" strokeWidth={1.4} />
    </svg>
  );
}

// ── 티 ───────────────────────────────────────────────────────
function TeaIllustration() {
  return (
    <svg
      {...SVG_PROPS}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 스팀 */}
      <path
        d="M50 14 q -4 8 1 14 q 5 6 1 14"
        strokeWidth={STROKE_WISP}
        opacity="0.85"
      />
      <path
        d="M70 14 q -4 8 1 14 q 5 6 1 14"
        strokeWidth={STROKE_WISP}
        opacity="0.85"
      />
      {/* 사세 */}
      <ellipse cx="60" cy="100" rx="48" ry="7" strokeWidth={STROKE} />
      {/* 넓고 낮은 찻잔 */}
      <path
        d="M28 54 Q28 92 60 92 Q92 92 92 54 Z"
        strokeWidth={STROKE}
      />
      <path
        d="M92 64 Q108 64 108 76 Q108 88 92 88"
        strokeWidth={STROKE}
      />
      {/* 차 표면 */}
      <ellipse cx="60" cy="54" rx="30" ry="5" strokeWidth={STROKE_THIN} />
      {/* 떠 있는 잎사귀 2 장 */}
      <path
        d="M48 50 Q50 42 58 44 Q58 52 50 53 Q46 51 48 50 Z"
        strokeWidth={2}
      />
      <path d="M52 47 Q55 50 56 53" strokeWidth={1.2} opacity="0.8" />
      <path
        d="M66 53 Q68 46 75 48 Q74 55 68 56 Q64 54 66 53 Z"
        strokeWidth={2}
      />
      <path d="M70 50 Q72 53 73 55" strokeWidth={1.2} opacity="0.8" />
    </svg>
  );
}

// ── 디저트 ───────────────────────────────────────────────────
function DessertIllustration() {
  return (
    <svg
      {...SVG_PROPS}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 접시 */}
      <ellipse cx="60" cy="94" rx="48" ry="8" strokeWidth={STROKE} />
      <ellipse
        cx="60"
        cy="94"
        rx="40"
        ry="4.5"
        strokeWidth={STROKE_THIN}
        opacity="0.7"
      />
      {/* 크로와상 본체 */}
      <path
        d="M20 80 Q16 42 60 38 Q104 42 100 80 Q98 64 84 60 Q72 58 60 58 Q48 58 36 60 Q22 64 20 80 Z"
        strokeWidth={STROKE}
      />
      {/* 꼬리 */}
      <path d="M20 80 Q14 82 16 90" strokeWidth={STROKE} />
      <path d="M100 80 Q106 82 104 90" strokeWidth={STROKE} />
      {/* 결 / 층 */}
      <path d="M38 64 Q40 52 46 46" strokeWidth={2} />
      <path d="M52 60 Q53 47 56 43" strokeWidth={2} />
      <path d="M68 60 Q67 47 64 43" strokeWidth={2} />
      <path d="M82 64 Q80 52 74 46" strokeWidth={2} />
      {/* 광택 */}
      <path
        d="M40 72 Q60 64 80 72"
        strokeWidth={2}
        opacity="0.55"
      />
    </svg>
  );
}

const ILLUSTRATIONS: Record<Category, React.FC> = {
  coffee: CoffeeIllustration,
  ade: AdeIllustration,
  tea: TeaIllustration,
  dessert: DessertIllustration,
};
