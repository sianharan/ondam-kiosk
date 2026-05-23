"use client";

/**
 * KioskFrame — 키오스크 외관 컴포넌트
 *
 * PROJECT_DESIGN.md 3.3 (디자인 원칙) + 8.2 (아키텍처) + 3.5 (v2.2 디스플레이 다양성).
 *
 * v2.2 — learningStore.displayMode 에 따라 프레임 폭이 바뀐다:
 *   - 'vertical'   (또는 null): 800 px / max-w-2xl / 카페 카운터형 (v2.1 기본과 동일)
 *   - 'horizontal'              : 1400 px / max-w-7xl / 매장 입구·푸드코트형
 *
 * 가로형에서도 한 프레임 안에 상단 헤더 + 하단 푸터 구조는 그대로다.
 * 본문 영역의 좌우 분할은 자식 컴포넌트 (OrderFlow 등) 가 displayMode 를 읽어
 * 직접 결정한다 — 환영 / 공간 지도 같은 단순 단일 컬럼 화면은 그대로 둔다.
 *
 * - 본문 폰트 24px 이상 (KS X 9211:2025 5.2.3)
 * - 명도 대비 4.5:1 이상 — primary #1A2A4A on white = 13.7:1 (WCAG AAA)
 * - 현재 단계는 aria-live="polite" 로 변경 시 자동 안내
 */

import * as React from "react";

import { AmbientSound } from "@/components/ambient/AmbientSound";
import { ReplayButton } from "@/components/voice/ReplayButton";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";

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
  const displayMode = useLearningStore((s) => s.displayMode);
  const currentMode = useLearningStore((s) => s.currentMode);

  // 가로형 = 큰 매장 키오스크 폭 (1400px). 그 외 (null 포함) = 세로형 기본 (800px).
  const isHorizontal = displayMode === "horizontal";
  const widthClass = isHorizontal ? "max-w-[1400px]" : "max-w-[800px]";

  return (
    <div
      className="flex min-h-screen items-start justify-center bg-muted/40 px-4 py-8 md:py-12"
      role="region"
      aria-label="온담 카페 키오스크"
      data-display-mode={displayMode ?? "unset"}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-3xl bg-background shadow-[0_18px_60px_-15px_rgba(26,42,74,0.35)] ring-1 ring-foreground/10",
          widthClass,
          className,
        )}
      >
        {/* ── 헤더: 카페 카운터 상판 느낌의 진남색 띠 ───────────── */}
        <header className="flex items-center justify-between gap-3 bg-primary px-6 py-5 text-primary-foreground md:px-8 md:py-6">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold tracking-tight md:text-3xl"
              aria-label="온담 카페 로고"
            >
              온담 카페
            </span>
            <span className="hidden text-base text-primary-foreground/70 md:inline">
              溫談
            </span>
            {/* 헤더 좌측 다시 듣기 — KS X 9211 6.3.6 */}
            <ReplayButton position="header" className="ml-2" />
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

      {/* Phase 5 카페 BGM — currentMode 기반으로 자동 트랙 선택.
          mode null 또는 tutorial 일 때는 AmbientSound 가 알아서 무음 처리. */}
      <AmbientSound mode={currentMode} />
    </div>
  );
}
