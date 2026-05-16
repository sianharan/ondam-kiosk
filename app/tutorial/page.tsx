"use client";

/**
 * Tutorial 페이지 — Phase 2-B 통합 테스트용
 *
 * PROJECT_DESIGN.md 5.2 #3 (Tutorial - Modeling) 의 화면 컨테이너 골격.
 * 본 Phase 에서는 음성/AI/카페 소음 X — 순수 클릭/터치로 끝까지 흐름 확인.
 *
 * 상태 흐름:
 *   category → menu → options → cart → payment → complete
 */

import * as React from "react";

import { CartSidebar } from "@/components/kiosk/CartSidebar";
import { CategoryGrid } from "@/components/kiosk/CategoryGrid";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { MenuGrid } from "@/components/kiosk/MenuGrid";
import { OptionPanel } from "@/components/kiosk/OptionPanel";
import { PaymentDialog } from "@/components/kiosk/PaymentDialog";
import { PAYMENT_BY_MODE } from "@/lib/kiosk-data/payment";
import { useOrderStore } from "@/stores/orderStore";

type Stage =
  | "category"
  | "menu"
  | "options"
  | "cart"
  | "payment"
  | "complete";

const STAGE_TO_STEP: Record<Stage, number> = {
  // Tutorial 화면은 전체 흐름의 3번째 단계 (PROJECT_DESIGN 5.1)
  // 내부 진행도는 본문 화면 전환으로 보여준다.
  category: 3,
  menu: 3,
  options: 3,
  cart: 3,
  payment: 3,
  complete: 3,
};

export default function TutorialPage() {
  const [stage, setStage] = React.useState<Stage>("category");

  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const orderNumber = useOrderStore((s) => s.orderNumber);
  const resetOrder = useOrderStore((s) => s.resetOrder);

  const restart = React.useCallback(() => {
    resetOrder();
    setStage("category");
  }, [resetOrder]);

  return (
    <KioskFrame currentStep={STAGE_TO_STEP[stage]} title="Tutorial">
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

      {/* 카테고리 없이 menu 진입 방지: category 로 보냄 */}
      {stage === "menu" && !selectedCategory && (
        <RecoverNotice onRestart={restart} />
      )}

      {stage === "options" && (
        <OptionPanel onComplete={() => setStage("cart")} />
      )}

      {stage === "cart" && (
        <CartSidebar
          onCheckout={() => setStage("payment")}
          onRestart={restart}
        />
      )}

      {stage === "payment" && (
        <>
          {/* 결제 다이얼로그 뒤로 장바구니가 비치는 게 시각적으로 자연스러움 */}
          <CartSidebar onCheckout={() => {}} onRestart={restart} />
          <PaymentDialog
            open={true}
            onClose={() => setStage("complete")}
            availablePayments={PAYMENT_BY_MODE.tutorial}
          />
        </>
      )}

      {stage === "complete" && (
        <CompleteScreen
          orderNumber={orderNumber}
          onRestart={restart}
        />
      )}
    </KioskFrame>
  );
}

// ── 완료 화면 ───────────────────────────────────────────────
function CompleteScreen({
  orderNumber,
  onRestart,
}: {
  orderNumber: number | null;
  onRestart: () => void;
}) {
  return (
    <section
      className="flex flex-col items-center gap-6 py-6 text-center"
      aria-live="assertive"
    >
      <h2 className="text-4xl font-bold text-primary md:text-5xl">
        주문 완료!
      </h2>
      <p className="text-2xl text-foreground/80 md:text-3xl">
        주문번호 <strong>{orderNumber ?? 47}번</strong> 입니다.
      </p>
      <p className="text-xl text-foreground/70 md:text-2xl">
        오늘 한 단계, 정말 잘 해내셨어요.
      </p>
      <button
        type="button"
        onClick={onRestart}
        aria-label="다시 처음부터 시작하기"
        className="mt-2 rounded-2xl bg-primary px-10 py-5 text-2xl font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
      >
        다시 시작
      </button>
    </section>
  );
}

// ── 카테고리 없이 menu 진입한 비정상 상태 복구 ──────────────
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
        className="self-start rounded-xl bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
      >
        처음으로
      </button>
    </section>
  );
}
