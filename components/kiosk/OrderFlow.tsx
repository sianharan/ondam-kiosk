"use client";

/**
 * OrderFlow — 5개 학습 모드가 공유하는 주문 흐름 (Phase 2-C 추출 → Phase 7 보강)
 *
 * Tutorial / Practice / Challenge / Real Guided / Real Free 모두
 * 카테고리 → 메뉴 → 옵션 → 장바구니 → 결제 → 영수증 흐름을 거친다.
 * 모드별 차이(음성/AI/소음)는 Phase 3 이후에서 더해진다.
 *
 * 결제 다이얼로그가 닫히면 receipt 단계에서 큰 주문번호 영수증을 보여주고,
 * 학습자가 [다음으로] 버튼을 두 번 두드리면 onAdvance 가 호출된다 (Phase 7 변경:
 * 자동 이동을 없애 학습자가 영수증을 충분히 확인할 시간을 보장 — KS X 9211 8.2.2).
 * 부모 페이지(모드 페이지)가 onAdvance 로 라우터 푸시를 수행한다.
 */

import * as React from "react";

import { CartSidebar } from "@/components/kiosk/CartSidebar";
import { CategoryGrid } from "@/components/kiosk/CategoryGrid";
import { MenuGrid } from "@/components/kiosk/MenuGrid";
import { OptionPanel } from "@/components/kiosk/OptionPanel";
import { PaymentDialog } from "@/components/kiosk/PaymentDialog";
import {
  PROGRESS_BUTTON_CLASS,
  STICKY_PROGRESS_FOOTER,
  VoiceButton,
} from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import {
  CATEGORY_LABEL,
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/kiosk-data/menu";
import {
  PAYMENT_BY_MODE,
  type LearningMode,
} from "@/lib/kiosk-data/payment";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export type OrderFlowStage =
  | "category"
  | "menu"
  | "options"
  | "cart"
  | "payment"
  | "receipt";

export interface OrderFlowProps {
  /** 학습 모드 — 결제 수단 노출 범위 결정 (PAYMENT_BY_MODE) */
  mode: LearningMode;
  /** 다음 모드 페이지 이름 (예: "Practice" → 완료 화면 버튼 라벨에 사용) */
  nextLabel: string;
  /** 주문 + 결제 + 완료 안내까지 끝났을 때 호출. 부모가 router.push 등 수행 */
  onAdvance: () => void;
  /**
   * 모드 진입 멘트.  v2.2 Phase 3-C 이전에는 모드 페이지가 자체 VoiceCoach 로
   * 따로 발화했지만, 그러면 카테고리 화면에서 VoiceCoach 가 두 개 동시 마운트되어
   * 패널 중복 + 음성 충돌이 발생했다.  이제는 OrderFlow 가 받아서 첫 카테고리
   * 진입 시퀀스 앞에 한 번만 끼워 넣는다 (재진입 시에는 모드 인트로 생략).
   */
  modeIntro?: string | readonly string[];
  /**
   * Phase 4-B — Challenge 모드의 HintButton 처럼, 부모 페이지가 현재 stage 에
   * 따라 다른 UI 를 곁들이고 싶을 때 사용.  stage 가 바뀌면 호출된다.
   */
  onStageChange?: (stage: OrderFlowStage) => void;
}

export function OrderFlow({
  mode,
  nextLabel,
  onAdvance,
  modeIntro,
  onStageChange,
}: OrderFlowProps) {
  const [stage, setStage] = React.useState<OrderFlowStage>("category");

  React.useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);
  const selectedCategory = useOrderStore((s) => s.selectedCategory);
  const orderNumber = useOrderStore((s) => s.orderNumber);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const displayMode = useLearningStore((s) => s.displayMode);

  // 모드 인트로는 첫 카테고리 진입에서만 발화.  메뉴 → 카테고리 뒤로가기나
  // [처음으로] 재시작 후 카테고리 재진입 시에는 카테고리 안내만 들리게 한다.
  const modeIntroConsumedRef = React.useRef(false);
  const introLines = React.useMemo<readonly string[] | undefined>(() => {
    if (modeIntroConsumedRef.current) return undefined;
    if (!modeIntro) return undefined;
    return Array.isArray(modeIntro) ? modeIntro : [modeIntro as string];
  }, [modeIntro, stage]);

  const handleRestart = React.useCallback(() => {
    resetOrder();
    setStage("category");
  }, [resetOrder]);

  const handleCategorySelect = React.useCallback(() => {
    modeIntroConsumedRef.current = true;
    setStage("menu");
  }, []);

  const stageNode = (
    <>
      {stage === "category" && (
        <CategoryGrid
          onSelect={handleCategorySelect}
          prependVoice={introLines}
        />
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
          {/* 다이얼로그 뒤로 장바구니가 비치는 게 자연스러움.
              결제 안내 음성과 충돌하지 않도록 backdrop CartSidebar 는 silent. */}
          <CartSidebar
            onCheckout={() => {}}
            onRestart={handleRestart}
            silent
          />
          <PaymentDialog
            open={true}
            onClose={() => setStage("receipt")}
            availablePayments={PAYMENT_BY_MODE[mode]}
            mode={mode}
          />
        </>
      )}

      {stage === "receipt" && (
        <ReceiptScreen
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
    (stage === "options" ||
      stage === "cart" ||
      stage === "payment" ||
      stage === "receipt");

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

// ── 결제 완료 영수증 화면 (Phase 7) ────────────────────────
// 큰 주문번호 + "다시 듣기" + "다음으로" 버튼.  PaymentDialog 가 닫힌 뒤,
// 다음 학습 단계(Articulation 등)로 넘어가기 전 잠시 머무는 화면.
interface ReceiptScreenProps {
  orderNumber: number | null;
  nextLabel: string;
  onAdvance: () => void;
}

function ReceiptScreen({
  orderNumber,
  nextLabel,
  onAdvance,
}: ReceiptScreenProps) {
  const displayNumber = orderNumber ?? 47;

  return (
    <section
      className="flex flex-col items-center gap-6 py-6 text-center"
      aria-labelledby="receipt-title"
    >
      <h2
        id="receipt-title"
        className="text-3xl font-bold text-primary md:text-4xl"
      >
        주문이 완료되었어요
      </h2>

      {/* 메인 영수증 카드 — 매우 큰 주문번호. KS X 9211 시각 강조. */}
      <div
        role="status"
        aria-live="assertive"
        aria-label={`주문번호 ${displayNumber}번`}
        className="flex flex-col items-center gap-3 rounded-3xl bg-accent/15 px-12 py-10 ring-2 ring-accent/40"
      >
        <p className="text-2xl text-foreground/70 md:text-3xl">주문번호</p>
        <p className="text-7xl font-extrabold leading-none text-primary md:text-9xl">
          {displayNumber}
        </p>
        <p className="text-2xl font-bold text-foreground md:text-3xl">
          {displayNumber}번
        </p>
      </div>

      <p className="text-xl text-foreground/80 md:text-2xl">
        카운터에서 <strong>{displayNumber}번</strong>을 불러드릴게요. 잠시만
        기다려 주세요.
      </p>

      {/* 영수증 안내 자동 발화 — 단일 메시지(긴 한 문장)로 한 호흡에 들려준다. */}
      <VoiceCoach
        message={[
          VOICE_SCRIPTS.payment.receipt(displayNumber),
          VOICE_SCRIPTS.payment.receiptNext,
        ]}
      />

      {/* challenge 등 본문이 긴 모드에서도 스크롤 없이 보이도록 sticky 로 본문 하단 고정.
          영수증 화면은 모든 주문 모드가 공유하므로 한 번의 변경으로 위치·크기가 통일된다. */}
      <div className={STICKY_PROGRESS_FOOTER}>
        <VoiceButton
          voiceLabel={`다음으로 버튼이에요. 두 번 두드리면 다음 단계 ${nextLabel}로 넘어가요.`}
          onActivate={onAdvance}
          className={PROGRESS_BUTTON_CLASS}
        >
          다음으로 ({nextLabel})
        </VoiceButton>
      </div>
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
