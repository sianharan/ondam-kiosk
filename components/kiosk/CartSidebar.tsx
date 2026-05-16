"use client";

/**
 * CartSidebar — 주문 요약 + 결제 버튼
 *
 * PROJECT_DESIGN.md 5.2 #3 장바구니 단계 기반.
 * 본 시뮬레이터는 1품목 주문 흐름이므로 "사이드바" 라고 부르지만
 * 화면 전체에 카드로 표시한다.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/kiosk-data/menu";
import { useOrderStore } from "@/stores/orderStore";

export interface CartSidebarProps {
  onCheckout: () => void;
  /** 처음 화면(카테고리 선택)으로 돌아갈 때 호출 */
  onRestart: () => void;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function CartSidebar({ onCheckout, onRestart }: CartSidebarProps) {
  const selectedItem = useOrderStore((s) => s.selectedItem);
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const selectedTemperature = useOrderStore((s) => s.selectedTemperature);
  const selectedSize = useOrderStore((s) => s.selectedSize);
  const selectedExtras = useOrderStore((s) => s.selectedExtras);
  const getTotalPrice = useOrderStore((s) => s.getTotalPrice);

  if (!selectedItem) {
    return (
      <p className="text-xl text-foreground/70" role="status">
        장바구니가 비었어요. 처음 화면으로 돌아가 주문해주세요.
      </p>
    );
  }

  const tempText =
    selectedTemperature === "hot"
      ? "따뜻하게"
      : selectedTemperature === "iced"
        ? "차갑게"
        : null;

  const sizeText = selectedItem.options.size
    ? SIZE_OPTIONS[selectedSize].label
    : null;

  const extrasText = selectedExtras
    .map((k) => EXTRA_OPTIONS[k].label)
    .join(", ");

  // 음성 안내용 한 줄 요약 (KS X 9211:2025 5.2.2 d)
  const ariaSummary = [
    selectedCategory ? CATEGORY_LABEL[selectedCategory] : null,
    selectedItem.name,
    tempText,
    sizeText,
    extrasText ? `추가: ${extrasText}` : null,
    `총 가격 ${formatPrice(getTotalPrice())}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      className="flex flex-col gap-6"
      aria-label={`주문 요약: ${ariaSummary}`}
    >
      <header>
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          주문 확인
        </h2>
        <p className="mt-2 text-xl text-foreground/70 md:text-2xl">
          이대로 결제하시려면 [결제하기] 를 눌러주세요.
        </p>
      </header>

      {/* ── 요약 카드 ─────────────────────────────────────── */}
      <dl
        aria-live="polite"
        className="flex flex-col divide-y divide-foreground/10 rounded-2xl border border-foreground/15 bg-background"
      >
        <SummaryRow label="메뉴" value={selectedItem.name} highlight />

        {tempText && <SummaryRow label="온도" value={tempText} />}

        {sizeText && (
          <SummaryRow
            label="사이즈"
            value={`${sizeText}${
              SIZE_OPTIONS[selectedSize].priceAdd > 0
                ? ` (+${formatPrice(SIZE_OPTIONS[selectedSize].priceAdd)})`
                : ""
            }`}
          />
        )}

        {selectedExtras.length > 0 ? (
          <SummaryRow
            label="추가"
            value={selectedExtras
              .map(
                (k) =>
                  `${EXTRA_OPTIONS[k].label} (+${formatPrice(EXTRA_OPTIONS[k].priceAdd)})`,
              )
              .join(", ")}
          />
        ) : selectedItem.options.extras ? (
          <SummaryRow label="추가" value="없음" muted />
        ) : null}

        <div className="flex items-baseline justify-between gap-3 px-6 py-5">
          <dt className="text-xl font-bold text-foreground md:text-2xl">
            총 가격
          </dt>
          <dd className="text-3xl font-bold text-primary md:text-4xl">
            {formatPrice(getTotalPrice())}
          </dd>
        </div>
      </dl>

      {/* ── 액션 버튼 ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onCheckout}
          aria-label={`결제하기. 총 ${formatPrice(getTotalPrice())} 결제를 진행합니다`}
          className={cn(
            "rounded-2xl bg-accent px-8 py-6 text-3xl font-bold text-accent-foreground shadow-md transition-all",
            "hover:-translate-y-0.5 hover:shadow-lg",
            "focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none",
          )}
        >
          결제하기
        </button>
        <button
          type="button"
          onClick={onRestart}
          aria-label="처음 화면(카테고리 선택)으로 돌아가기. 현재 주문은 초기화됩니다"
          className={cn(
            "rounded-xl bg-muted px-5 py-3 text-lg font-medium text-foreground/80 ring-1 ring-foreground/10 transition-colors",
            "hover:bg-muted/80",
            "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
          )}
        >
          처음으로 돌아가기
        </button>
      </div>
    </section>
  );
}

// ── 내부 헬퍼: 요약 한 줄 ───────────────────────────────────
interface SummaryRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}

function SummaryRow({ label, value, highlight, muted }: SummaryRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-6 py-4">
      <dt className="text-lg text-foreground/70 md:text-xl">{label}</dt>
      <dd
        className={cn(
          "text-xl md:text-2xl",
          highlight ? "font-bold text-foreground" : "text-foreground/90",
          muted && "text-foreground/50",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
