"use client";

/**
 * /reflection (9/10) — 성찰 (Silver)
 *
 * PROJECT_DESIGN.md 5.2 #9 / 2.3 Reflection.
 * 학습자 단계별 시간을 STANDARD_BASELINE 과 비교 + 7개 피드백 템플릿.
 *
 * Phase 2-C 에서는 실제 측정 데이터가 없으므로 더미 값으로 시각화만 보여준다.
 * (실측 + 자동 템플릿 선택은 Phase 6.)
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { ModeBanner } from "@/components/kiosk/ModeBanner";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";

interface StepRow {
  key: "category" | "menu" | "options" | "payment";
  label: string;
  /** 학습자 소요 (초) */
  learnerSec: number;
  /** 표준 baseline (초) */
  baselineSec: number;
  /** 막대 채움 비율 0~1 — 시각용 더미 */
  bar: number;
}

// Phase 2-C 더미 데이터 (PROJECT_DESIGN 5.2 #9 예시 화면 그대로)
const ROWS: StepRow[] = [
  { key: "category", label: "카테고리 선택", learnerSec: 35, baselineSec: 20, bar: 0.6 },
  { key: "menu", label: "메뉴 선택", learnerSec: 70, baselineSec: 30, bar: 1.0 },
  { key: "options", label: "옵션 선택", learnerSec: 30, baselineSec: 25, bar: 0.2 },
  { key: "payment", label: "결제", learnerSec: 88, baselineSec: 35, bar: 0.8 },
];

const LEARNER_TOTAL_SEC = 4 * 60 + 23; // 4분 23초
const BASELINE_TOTAL_SEC = 2 * 60 + 30; // 2분 30초

function formatMinSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
}

export default function ReflectionPage() {
  const router = useRouter();
  const setStep = useLearningStore((s) => s.setStep);

  React.useEffect(() => {
    setStep(9);
  }, [setStep]);

  // 가장 시간 차이 큰 단계 = "어려웠어요!" 표시
  const hardest = React.useMemo(
    () =>
      ROWS.reduce((a, b) =>
        b.learnerSec - b.baselineSec > a.learnerSec - a.baselineSec ? b : a,
      ),
    [],
  );

  return (
    <KioskFrame currentStep={9} title="Reflection — 분석 결과">
      <ModeBanner
        eyebrow="성찰 단계 (Silver)"
        headline="오늘 주문을 함께 돌아봐요."
        detail="잘한 점과 다음에 연습하면 좋은 점을 시간으로 비교해서 보여드릴게요."
        tone="primary"
      />

      <section className="flex flex-col gap-6 animate-in fade-in duration-500">
        {/* ── 총 시간 요약 ─────────────────────────── */}
        <div
          className="grid gap-3 rounded-2xl border border-foreground/15 bg-background p-6 md:grid-cols-2"
          aria-label="총 학습 시간 비교"
        >
          <div>
            <p className="text-lg text-foreground/60 md:text-xl">내 시간</p>
            <p className="text-4xl font-bold text-primary md:text-5xl">
              {formatMinSec(LEARNER_TOTAL_SEC)}
            </p>
          </div>
          <div>
            <p className="text-lg text-foreground/60 md:text-xl">
              표준 시간
            </p>
            <p className="text-3xl font-semibold text-foreground/70 md:text-4xl">
              {formatMinSec(BASELINE_TOTAL_SEC)}
            </p>
          </div>
        </div>

        {/* ── 단계별 막대 비교 ─────────────────────── */}
        <div className="rounded-2xl border border-foreground/15 bg-background p-6">
          <h3 className="text-2xl font-bold text-foreground md:text-3xl">
            단계별 비교
          </h3>
          <p className="mt-1 text-lg text-foreground/60 md:text-xl">
            막대가 길수록 표준보다 더 오래 걸린 단계예요.
          </p>

          <ul className="mt-5 flex flex-col gap-4" role="list">
            {ROWS.map((row) => {
              const delta = row.learnerSec - row.baselineSec;
              const isHardest = row === hardest;
              const deltaText = delta >= 0 ? `+${delta}초` : `${delta}초`;
              return (
                <li
                  key={row.key}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl p-4",
                    isHardest ? "bg-accent/15 ring-2 ring-accent/40" : "bg-muted/40",
                  )}
                  aria-label={`${row.label}, 표준보다 ${deltaText}${isHardest ? ", 가장 오래 걸린 단계" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xl font-semibold text-foreground md:text-2xl">
                      {row.label}
                    </span>
                    <span
                      className={cn(
                        "text-xl font-bold md:text-2xl",
                        delta > 30
                          ? "text-accent"
                          : delta > 0
                            ? "text-foreground"
                            : "text-emerald-700",
                      )}
                    >
                      {deltaText}
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(row.bar * 100)}
                    aria-label={`${row.label} 소요 비교`}
                    className="h-4 w-full overflow-hidden rounded-full bg-foreground/10"
                  >
                    <div
                      className={cn(
                        "h-full transition-[width]",
                        isHardest ? "bg-accent" : "bg-primary/70",
                      )}
                      style={{ width: `${Math.round(row.bar * 100)}%` }}
                    />
                  </div>

                  {isHardest && (
                    <p className="mt-1 text-lg font-semibold text-accent md:text-xl">
                      ← 이 단계가 가장 어려웠어요!
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── 다음 연습 팁 ─────────────────────────── */}
        <div
          className="rounded-2xl bg-primary/5 p-6 ring-1 ring-primary/20"
          aria-label="다음 연습 팁"
        >
          <h3 className="text-xl font-bold text-primary md:text-2xl">
            💡 다음 연습 팁
          </h3>
          <p className="mt-2 text-xl leading-relaxed text-foreground md:text-2xl">
            메뉴 선택 단계에서 천천히 품목 이름을 들어보세요. 아메리카노 다음에
            카페라떼, 카푸치노가 차례로 나와요.
          </p>
        </div>

        <footer className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => router.push("/complete")}
            aria-label="성찰을 마치고 완료 화면으로 이동"
            className="rounded-2xl bg-primary px-10 py-5 text-2xl font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
          >
            완료
          </button>
        </footer>
      </section>
    </KioskFrame>
  );
}
