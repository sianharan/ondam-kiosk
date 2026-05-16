"use client";

/**
 * CategoryGrid — 4개 카테고리 선택 화면
 *
 * PROJECT_DESIGN.md 5.2 #3 / 3.3 (카테고리별 색상 블록) 기반.
 * radiogroup 패턴으로 키보드 화살표 탐색 가능 (KS X 9211:2025 청각 대체 + 키보드).
 *
 * 클릭/Enter/Space 시 onSelect(category) → 부모가 다음 화면으로 전환.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  type Category,
} from "@/lib/kiosk-data/menu";
import { useOrderStore } from "@/stores/orderStore";

interface CategoryDef {
  id: Category;
  /** 음성/접근성 설명 */
  voiceDesc: string;
  /** Tailwind 배경 클래스 — globals.css 의 category-* 변수 사용 */
  bgClass: string;
  /** 카드 위에 얹는 단순 SVG 아이콘 (currentColor 사용) */
  icon: React.ReactNode;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "coffee",
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

export interface CategoryGridProps {
  onSelect: (category: Category) => void;
}

export function CategoryGrid({ onSelect }: CategoryGridProps) {
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const setCategory = useOrderStore((s) => s.setCategory);

  const handleSelect = (category: Category) => {
    setCategory(category);
    onSelect(category);
  };

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

      <div
        role="radiogroup"
        aria-labelledby="category-grid-heading"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
      >
        {CATEGORIES.map((c) => {
          const isSelected = selectedCategory === c.id;
          const label = CATEGORY_LABEL[c.id];

          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${label}. ${c.voiceDesc}`}
              onClick={() => handleSelect(c.id)}
              className={cn(
                "group/category relative flex aspect-[5/3] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl text-white shadow-lg transition-transform",
                "ring-1 ring-foreground/10",
                "hover:-translate-y-1 hover:shadow-xl",
                "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
                c.bgClass,
                isSelected && "ring-4 ring-accent",
                // 디저트(베이지)는 흰 글자 대비가 낮으므로 진한 글자 색 강제
                c.id === "dessert" && "text-[#3D2F1B]",
              )}
            >
              <span aria-hidden="true">{c.icon}</span>
              <span className="text-3xl font-bold md:text-4xl">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
