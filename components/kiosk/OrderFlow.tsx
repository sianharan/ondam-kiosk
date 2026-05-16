"use client";

/**
 * OrderFlow — 5개 학습 모드가 공유하는 주문 흐름 (Phase 2-C 추출)
 *
 * Tutorial / Practice / Challenge / Real Guided / Real Free 모두
 * 카테고리 → 메뉴 → 옵션 → 장바구니 → 결제 → 완료 흐름을 거친다.
 * 모드별 차이(음성/AI/소음)는 Phase 3 이후에서 더해진다.
 *
 * 결제까지 끝나면 본 컴포넌트는 잠깐 "주문 완료" 안내 화면을 띄우고
 *   - 3초 후 자동 onAdvance, 또는
 *   - 사용자가 [다음으로] 버튼을 누르면 즉시 onAdvance
 * 부모 페이지(모드 페이지)가 이 콜백으로 다음 라우트로 이동시킨다.
 */

import * as React from "react";

import { CartSidebar } from "@/components/kiosk/CartSidebar";
import { CategoryGrid } from "@/components/kiosk/CategoryGrid";
import { MenuGrid } from "@/components/kiosk/MenuGrid";
import { OptionPanel } from "@/components/kiosk/OptionPanel";
import { PaymentDialog } from "@/components/kiosk/PaymentDialog";
import {
  CATEGORY_LABEL,
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/kiosk-data/menu";
import {
  PAYMENT_BY_MODE,
  type LearningMode,
} from "@/lib/kiosk-data/payment";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

type Stage =
  | "category"
  | "menu"
  | "options"
  | "cart"
  | "payment"
  | "done";

const AUTO_ADVANCE_MS = 3000;

export interface OrderFlowProps {
  /** 학습 모드 — 결제 수단 노출 범위 결정 (PAYMENT_BY_MODE) */
  mode: LearningMode;
  /** 다음 모드 페이지 이름 (예: "Practice" → 완료 화면 버튼 라벨에 사용) */
  nextLabel: string;
  /** 주문 + 결제 + 완료 안내까지 끝났을 때 호출. 부모가 router.push 등 수행 */
  onAdvance: () => void;
}

export function OrderFlow({ mode, nextLabel, onAdvance }: OrderFlowProps) {
  const [stage, setStage] = React.useState<Stage>("category");
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const orderNumber = useOrderStore((s) => s.orderNumber);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const displayMode = useLearningStore((s) => s.displayMode);

  const handleRestart = React.useCallback(() => {
    resetOrder();
    setStage("category");
  }, [resetOrder]);

  const stageNode = (
    <>
      {stage === "category" && (
        <CategoryGrid onSelect={() => setStage("menu")} />
      )}

      {stage === "menu" && selectedCategory && (
        <MenuGrid
          category={selectedCategory}
          onSelect={() => setStage("options")}
          onBack={() => setStage("category")}
        />
      )}

      {stage === "menu" && !selectedCategory && (
        <RecoverNotice onRestart={handleRestart} />
      )}

      {stage === "options" && (
        <OptionPanel onComplete={() => setStage("cart")} />
      )}

      {stage === "cart" && (
        <CartSidebar
          onCheckout={() => setStage("payment")}
          onRestart={handleRestart}
        />
      )}

      {stage === "payment" && (
        <>
          {/* 다이얼로그 뒤로 장바구니가 비치는 게 자연스러움 */}
          <CartSidebar onCheckout={() => {}} onRestart={handleRestart} />
          <PaymentDialog
            open={true}
            onClose={() => setStage("done")}
            availablePayments={PAYMENT_BY_MODE[mode]}
          />
        </>
      )}

      {stage === "done" && (
        <DoneScreen
          orderNumber={orderNumber}
          nextLabel={nextLabel}
          onAdvance={onAdvance}
        />
      )}
    </>
  );

  // 가로형 매장 키오스크: 옵션 단계부터 결제 다이얼로그까지 오른쪽 레일에
  // "현재 주문" 요약을 항상 보여 준다. (PROJECT_DESIGN 3.5.2 — 좌측 메뉴 영역
  //   + 우측 옵션/장바구니 영역). 세로형은 v2.1 흐름 그대로.
  const showRail =
    displayMode === "horizontal" &&
    (stage === "options" || stage === "cart" || stage === "payment");

  if (!showRail) {
    return <div>{stageNode}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_minmax(260px,340px)] md:gap-8">
      <div className="min-w-0">{stageNode}</div>
      <aside className="md:sticky md:top-4 md:self-start" aria-label="현재 주문 요약">
        <OrderSummaryRail />
      </aside>
    </div>
  );
}

// ── 가로형 우측 레일: 읽기 전용 주문 요약 ───────────────────
function OrderSummaryRail() {
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const selectedItem = useOrderStore((s) => s.selectedItem);
  const selectedTemperature = useOrderStore((s) => s.selectedTemperature);
  const selectedSize = useOrderStore((s) => s.selectedSize);
  const selectedExtras = useOrderStore((s) => s.selectedExtras);
  const getTotalPrice = useOrderStore((s) => s.getTotalPrice);

  const tempText =
    selectedTemperature === "hot"
      ? "따뜻하게"
      : selectedTemperature === "iced"
        ? "차갑게"
        : null;
  const sizeText =
    selectedItem?.options.size && selectedSize
      ? SIZE_OPTIONS[selectedSize].label
      : null;
  const extraTexts = selectedExtras
    .map((k) => EXTRA_OPTIONS[k]?.label)
    .filter(Boolean) as string[];

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-foreground/15 bg-muted/40 p-5"
      aria-live="polite"
    >
      <h3 className="text-xl font-bold text-primary md:text-2xl">현재 주문</h3>

      {!selectedItem ? (
        <p className="text-base text-foreground/70 md:text-lg">
          {selectedCategory
            ? `${CATEGORY_LABEL[selectedCategory]} 카테고리에서 메뉴를 골라주세요.`
            : "아직 메뉴가 선택되지 않았어요."}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-base text-foreground/60 md:text-lg">
              {CATEGORY_LABEL[selectedItem.category]}
            </span>
            <span className="text-xl font-bold text-foreground md:text-2xl">
              {selectedItem.name}
            </span>
          </div>

          {(tempText || sizeText || extraTexts.length > 0) && (
            <ul className="flex flex-col gap-1 text-base text-foreground/80 md:text-lg">
              {tempText && <li>· {tempText}</li>}
              {sizeText && <li>· 사이즈 {sizeText}</li>}
              {extraTexts.map((label) => (
                <li key={label}>· {label}</li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex items-baseline justify-between border-t border-foreground/10 pt-3">
            <span className="text-base text-foreground/60 md:text-lg">합계</span>
            <span className="text-2xl font-bold text-primary md:text-3xl">
              {getTotalPrice().toLocaleString("ko-KR")}원
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── 주문 완료 → 다음 단계 대기 화면 ────────────────────────
interface DoneScreenProps {
  orderNumber: number | null;
  nextLabel: string;
  onAdvance: () => void;
}

function DoneScreen({ orderNumber, nextLabel, onAdvance }: DoneScreenProps) {
  const [remaining, setRemaining] = React.useState(AUTO_ADVANCE_MS / 1000);

  React.useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    const done = setTimeout(onAdvance, AUTO_ADVANCE_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [onAdvance]);

  return (
    <section
      className="flex flex-col items-center gap-5 py-4 text-center"
      aria-live="polite"
    >
      <h2 className="text-4xl font-bold text-primary md:text-5xl">
        주문 완료!
      </h2>
      <p className="text-2xl text-foreground/80 md:text-3xl">
        주문번호 <strong>{orderNumber ?? 47}번</strong> 입니다.
      </p>
      <p className="text-xl text-foreground/70 md:text-2xl">
        잠시 후 다음 단계 <strong>{nextLabel}</strong>로 넘어갈게요.
      </p>
      <p
        className="text-lg text-foreground/60 md:text-xl"
        aria-live="polite"
      >
        {remaining}초 후 자동 이동
      </p>
      <button
        type="button"
        onClick={onAdvance}
        aria-label={`바로 다음 단계 ${nextLabel}로 이동`}
        className="mt-2 rounded-2xl bg-primary px-10 py-5 text-2xl font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
      >
        다음으로 ({nextLabel})
      </button>
    </section>
  );
}

// ── 비정상 진입 복구 ───────────────────────────────────────
function RecoverNotice({ onRestart }: { onRestart: () => void }) {
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl bg-muted/60 p-6"
      role="alert"
    >
      <p className="text-xl text-foreground md:text-2xl">
        카테고리 정보가 없어요. 처음 화면으로 돌아가서 다시 골라주세요.
      </p>
      <button
        type="button"
        onClick={onRestart}
        aria-label="처음으로. 카테고리 선택 화면으로 돌아갑니다"
        className="self-start rounded-xl bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
      >
        처음으로
      </button>
    </section>
  );
}
