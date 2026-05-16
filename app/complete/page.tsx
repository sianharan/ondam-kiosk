"use client";

/**
 * /complete (10/10) — 학습 완료
 *
 * PROJECT_DESIGN.md 5.2 #10.
 * 학습 로그 localStorage 저장은 Phase 6 에서. 여기서는 정적 인사 + 통계만.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";

export default function CompletePage() {
  const router = useRouter();
  const setStep = useLearningStore((s) => s.setStep);
  const resetSession = useLearningStore((s) => s.resetSession);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const { ready } = useRequireLearningSession();

  React.useEffect(() => {
    setStep(10);
  }, [setStep]);

  if (!ready) return null;

  const handleRestart = () => {
    resetOrder();
    resetSession();
    router.push("/");
  };

  const handleFinish = () => {
    // 학습 종료: 상태 초기화 후 환영 화면으로
    resetOrder();
    resetSession();
    router.push("/");
  };

  return (
    <KioskFrame currentStep={10} title="완료">
      <section
        className="flex flex-col items-center gap-7 py-4 text-center"
        aria-live="polite"
      >
        <span aria-hidden="true" className="text-6xl md:text-7xl">
          🌿
        </span>

        <h2 className="text-4xl font-bold text-primary md:text-5xl">
          오늘 정말 잘 하셨어요!
        </h2>

        <p className="max-w-2xl text-2xl leading-relaxed text-foreground md:text-3xl">
          한 시간 동안 키오스크 사용법을 단계별로 익혀보셨네요. 한 단계씩
          쌓아오신 경험이 다음 카페에서도 큰 힘이 될 거예요.
        </p>

        {/* ── 더미 통계 카드 ─────────────────────────── */}
        <dl
          aria-label="학습 통계 요약"
          className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-foreground/15 bg-background p-5">
            <dt className="text-lg text-foreground/60 md:text-xl">
              총 학습 시간
            </dt>
            <dd className="mt-1 text-3xl font-bold text-primary md:text-4xl">
              27분
            </dd>
          </div>
          <div className="rounded-2xl border border-foreground/15 bg-background p-5">
            <dt className="text-lg text-foreground/60 md:text-xl">
              완료 단계
            </dt>
            <dd className="mt-1 text-3xl font-bold text-primary md:text-4xl">
              7 / 7
            </dd>
          </div>
        </dl>

        <div className="flex w-full flex-col items-stretch gap-3 pt-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleRestart}
            aria-label="다시 학습하기. 처음 환영 화면으로 이동합니다"
            className="rounded-2xl bg-accent px-10 py-5 text-2xl font-bold text-accent-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none"
          >
            다시 학습하기
          </button>
          <button
            type="button"
            onClick={handleFinish}
            aria-label="학습 종료. 환영 화면으로 돌아갑니다"
            className="rounded-2xl bg-muted px-10 py-5 text-2xl font-medium text-foreground/80 ring-1 ring-foreground/15 transition-colors hover:bg-muted/80 focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none"
          >
            학습 종료
          </button>
        </div>
      </section>
    </KioskFrame>
  );
}
