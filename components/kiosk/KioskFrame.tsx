/**
 * KioskFrame — 키오스크 외관 컴포넌트
 *
 * PROJECT_DESIGN.md 3.3 (디자인 원칙) + 8.2 (아키텍처) 기반.
 * 카페 카운터형 스탠드 키오스크의 시각적 프레임을 제공한다.
 *
 * - 본문 폰트 24px 이상 (KS X 9211:2025 5.2.3)
 * - 명도 대비 4.5:1 이상 — primary #1A2A4A on white = 13.7:1 (WCAG AAA)
 * - 현재 단계는 aria-live="polite" 로 변경 시 자동 안내
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface KioskFrameProps {
  children: React.ReactNode;
  /** 현재 진행 단계 (1~10). 헤더에 "3/10" 형태로 표시 */
  currentStep?: number;
  /** 전체 단계 수 (기본 10 — PROJECT_DESIGN 5.1) */
  totalSteps?: number;
  /** 현재 학습 모드/화면 제목 (예: "Tutorial") */
  title?: string;
  className?: string;
}

export function KioskFrame({
  children,
  currentStep,
  totalSteps = 10,
  title,
  className,
}: KioskFrameProps) {
  const showStep = typeof currentStep === "number";

  return (
    <div
      className="flex min-h-screen items-start justify-center bg-muted/40 px-4 py-8 md:py-12"
      role="region"
      aria-label="온담 카페 키오스크"
    >
      <div
        className={cn(
          "flex w-full max-w-[800px] flex-col overflow-hidden rounded-3xl bg-background shadow-[0_18px_60px_-15px_rgba(26,42,74,0.35)] ring-1 ring-foreground/10",
          className,
        )}
      >
        {/* ── 헤더: 카페 카운터 상판 느낌의 진남색 띠 ───────────── */}
        <header className="flex items-center justify-between bg-primary px-6 py-5 text-primary-foreground md:px-8 md:py-6">
          <div className="flex items-baseline gap-3">
            <span
              className="text-2xl font-bold tracking-tight md:text-3xl"
              aria-label="온담 카페 로고"
            >
              온담 카페
            </span>
            <span className="hidden text-base text-primary-foreground/70 md:inline">
              溫談
            </span>
          </div>

          {(showStep || title) && (
            <div
              aria-live="polite"
              aria-atomic="true"
              className="text-right text-xl font-semibold md:text-2xl"
            >
              {showStep && (
                <span aria-label={`전체 ${totalSteps}단계 중 ${currentStep}단계`}>
                  {currentStep}/{totalSteps}
                </span>
              )}
              {title && (
                <span className="ml-2 text-primary-foreground/85">{title}</span>
              )}
            </div>
          )}
        </header>

        {/* ── 본문: 모든 화면이 이 안에 렌더링됨 ───────────────── */}
        <main
          className="flex-1 px-6 py-8 text-[1.5rem] leading-relaxed text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300 md:px-10 md:py-10"
          style={{ fontSize: "max(1.5rem, 24px)" }}
        >
          {children}
        </main>

        {/* ── 푸터: 도담 호출 (Phase 2-B 에서는 비활성) ──────── */}
        <footer className="flex items-center justify-center border-t border-foreground/10 bg-muted/60 px-6 py-5 md:px-8">
          <button
            type="button"
            disabled
            aria-label="도담 호출 (음성 인터페이스는 Phase 3 에서 활성화)"
            className="rounded-xl bg-background px-6 py-3 text-lg font-medium text-foreground/60 ring-1 ring-foreground/15 disabled:cursor-not-allowed"
          >
            도움이 필요하면 도담을 불러주세요
          </button>
        </footer>
      </div>
    </div>
  );
}
