/**
 * ModeBanner — 학습 모드 페이지 상단의 안내 박스
 *
 * Phase 2-C 에서는 5개 모드의 차이를 "상단 레이블 + 한두 줄 안내" 로만 표시한다.
 * 음성·AI 도움 차별화는 Phase 3 이후.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ModeBannerProps {
  /** 모드명을 작은 글씨로 (예: "Modeling 단계") */
  eyebrow: string;
  /** 큰 한 줄 헤드라인 (학습자에게 무엇을 할지) */
  headline: string;
  /** 부가 안내 (선택) */
  detail?: string;
  /** Tailwind 배경 — accent/10 (기본) 또는 primary/10 */
  tone?: "accent" | "primary";
}

export function ModeBanner({
  eyebrow,
  headline,
  detail,
  tone = "accent",
}: ModeBannerProps) {
  return (
    <aside
      role="note"
      aria-label={`학습 모드 안내: ${headline}${detail ? `. ${detail}` : ""}`}
      className={cn(
        "mb-6 flex flex-col gap-2 rounded-2xl p-5 ring-1 animate-in fade-in duration-500 md:p-6",
        tone === "accent"
          ? "bg-accent/10 ring-accent/30"
          : "bg-primary/5 ring-primary/20",
      )}
    >
      <span className="text-base font-bold uppercase tracking-wider text-accent md:text-lg">
        {eyebrow}
      </span>
      <p className="text-xl font-semibold text-foreground md:text-2xl">
        {headline}
      </p>
      {detail && (
        <p className="text-lg text-foreground/75 md:text-xl">{detail}</p>
      )}
    </aside>
  );
}
