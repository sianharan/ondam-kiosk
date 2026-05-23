"use client";

/**
 * CartSidebar — 주문 요약 + 결제 버튼
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 주문 요약을 자동 발화 (cart 스크립트)
 *   - [결제하기] 와 [처음으로 돌아가기] 모두 VoiceButton (단일/더블 분리)
 */

import * as React from "react";

import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import {
  CATEGORY_LABEL,
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
  type Category,
} from "@/lib/kiosk-data/menu";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export interface CartSidebarProps {
  onCheckout: () => void;
  onRestart: () => void;
  /**
   * true 면 내부 VoiceCoach 를 생략한다.
   *
   * OrderFlow stage="payment" 에서 PaymentDialog 뒤로 비치는 backdrop 으로
   * CartSidebar 가 한 번 더 렌더되는데, 그때 cart 안내가 결제 안내와 동시에
   * 발화돼 음성이 겹치는 문제를 막는다.  v2.2 Phase 3-C 동시 VoiceCoach 차단.
   */
  silent?: boolean;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function CartSidebar({
  onCheckout,
  onRestart,
  silent = false,
}: CartSidebarProps) {
  const selectedItem = useOrderStore((s) => s.selectedItem);
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const selectedTemperature = useOrderStore((s) => s.selectedTemperature);
  const selectedSize = useOrderStore((s) => s.selectedSize);
  const selectedExtras = useOrderStore((s) => s.selectedExtras);
  const getTotalPrice = useOrderStore((s) => s.getTotalPrice);
  const currentMode = useLearningStore((s) => s.currentMode);

  // Phase 4-B — Fading: minimal / silent 모드에서는 장바구니 자동 안내 생략.
  // 학습자는 [결제하기] 버튼 단일 탭으로 가격을 직접 듣고 진행할 수 있다.
  const verbosity = currentMode
    ? getModeConfig(currentMode).voiceVerbosity
    : "detailed";
  const announceCart = verbosity === "detailed" || verbosity === "normal";

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

  const summaryParts = [
    selectedCategory ? CATEGORY_LABEL[selectedCategory] : null,
    selectedItem.name,
    tempText,
    sizeText,
    extrasText ? `추가: ${extrasText}` : null,
    `총 가격 ${formatPrice(getTotalPrice())}`,
  ].filter(Boolean) as string[];

  const ariaSummary = summaryParts.join(", ");
  const voiceSummary = summaryParts.join(", ");

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

      {!silent && announceCart && (
        <VoiceCoach message={VOICE_SCRIPTS.cart(voiceSummary)} />
      )}

      {/* ── 요약 카드 ─────────────────────────────────────── */}
      <dl
        aria-live="polite"
        className="flex flex-col divide-y divide-foreground/10 overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-foreground/15"
      >
        <SummaryRow
          label="메뉴"
          value={selectedItem.name}
          highlight
          accent={selectedItem.category}
        />

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
        <VoiceButton
          voiceLabel={`결제하기 버튼이에요. 총 ${formatPrice(getTotalPrice())}을 결제할게요. 두 번 두드리면 결제 화면이 열려요.`}
          onActivate={onCheckout}
          className="px-8 py-6 text-3xl"
        >
          결제하기
        </VoiceButton>
        <VoiceButton
          voiceLabel="처음으로 돌아가기 버튼이에요. 두 번 두드리면 현재 주문이 초기화되고 카테고리 선택으로 돌아가요."
          onActivate={onRestart}
          variant="ghost"
          className="px-5 py-3 text-lg"
        >
          처음으로 돌아가기
        </VoiceButton>
      </div>
    </section>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
  /** highlight 행에 카테고리 컬러 좌측 액센트 바를 추가 (메뉴 카드 톤과 통일) */
  accent?: Category;
}

const ACCENT_CLASS: Record<Category, string> = {
  coffee: "bg-category-coffee",
  ade: "bg-category-ade",
  tea: "bg-category-tea",
  dessert: "bg-category-dessert",
};

function SummaryRow({
  label,
  value,
  highlight,
  muted,
  accent,
}: SummaryRowProps) {
  return (
    <div className="relative flex items-baseline justify-between gap-3 px-6 py-4">
      {accent && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-2 left-0 w-1.5 rounded-r-full",
            ACCENT_CLASS[accent],
          )}
        />
      )}
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
