"use client";

/**
 * MenuGrid — 선택된 카테고리의 메뉴 목록
 *
 * PROJECT_DESIGN.md 5.2 #3~4 / 7.1 기반.
 * 상단에 "← 카테고리로 돌아가기" 버튼, 본문은 메뉴 카드 그리드.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  getMenuByCategory,
  type Category,
  type MenuItem,
} from "@/lib/kiosk-data/menu";
import { useOrderStore } from "@/stores/orderStore";

export interface MenuGridProps {
  /** 부모에서 보장: 카테고리가 선택된 상태로 진입 */
  category: Category;
  /** 메뉴 선택 후 다음 단계(옵션 화면)로 이동 */
  onSelect: (item: MenuItem) => void;
  /** 카테고리 화면으로 돌아갈 때 호출 */
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

export function MenuGrid({ category, onSelect, onBack }: MenuGridProps) {
  const setItem = useOrderStore((s) => s.setItem);
  const items = React.useMemo(
    () => getMenuByCategory(category),
    [category],
  );

  const handleSelect = (item: MenuItem) => {
    setItem(item);
    onSelect(item);
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="카테고리 선택 화면으로 돌아가기"
          className="inline-flex items-center gap-2 rounded-xl bg-muted px-5 py-3 text-lg font-medium text-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/80 focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
        >
          <span aria-hidden="true">←</span>
          <span>카테고리</span>
        </button>
        <h2
          id="menu-grid-heading"
          className="text-2xl font-bold text-foreground md:text-3xl"
        >
          {CATEGORY_LABEL[category]} 메뉴
        </h2>
      </div>

      <ul
        aria-labelledby="menu-grid-heading"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
      >
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => handleSelect(item)}
              aria-label={`${item.voiceLabel}, ${formatPrice(item.basePrice)}. ${item.description}`}
              className={cn(
                "flex h-full w-full flex-col items-start gap-3 rounded-2xl bg-background p-5 text-left",
                "ring-1 ring-foreground/15 shadow-sm transition-all",
                "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40",
                "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
              )}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span className="text-2xl font-bold text-foreground md:text-[1.75rem]">
                  {item.name}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl text-white",
                    item.category === "coffee" && "bg-category-coffee",
                    item.category === "ade" && "bg-category-ade",
                    item.category === "tea" && "bg-category-tea",
                    item.category === "dessert" &&
                      "bg-category-dessert text-[#3D2F1B]",
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{
                      __html: item.iconSvg.replace(/<\/?svg[^>]*>/g, ""),
                    }}
                  />
                </span>
              </div>

              <p className="text-lg text-foreground/75 md:text-xl">
                {item.description}
              </p>

              <div className="mt-1 flex w-full items-end justify-between gap-3">
                <span className="text-base text-foreground/55 md:text-lg">
                  {getOptionSummary(item) || "옵션 없음"}
                </span>
                <span className="text-2xl font-bold text-primary md:text-3xl">
                  {formatPrice(item.basePrice)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
