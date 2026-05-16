/**
 * ModeBanner — 학습 모드 페이지 상단의 안내 박스
 *
 * Phase 4-A 확장: 모드별 helpLevel(1~5) 도트 시각화 추가.
 *   ●●●●●  최대 도움 (시연 모드)   ← Tutorial
 *   ●●●●○  많은 도움 (코칭)         ← Practice
 *   ●●●○○  점진 감소                 ← Challenge
 *   ●●○○○  최소 도움                 ← Real Guided
 *   ●○○○○  자율 (학습자 주도)       ← Real Free
 *
 * Collins 4차원의 Method 흐름(도움 → 자율)을 학습자에게 한눈에 보여준다.
 * 음성 사용자는 도트 자체보다 옆의 한국어 라벨을 듣는다 (aria-label 통합).
 */

import * as React from "react";

import { HELP_LEVEL_LABELS } from "@/lib/learning/modeConfigs";
import { cn } from "@/lib/utils";

export type HelpLevel = 1 | 2 | 3 | 4 | 5;

export interface ModeBannerProps {
  /** 모드명을 작은 글씨로 (예: "Modeling 단계") */
  eyebrow: string;
  /** 큰 한 줄 헤드라인 (학습자에게 무엇을 할지) */
  headline: string;
  /** 부가 안내 (선택) */
  detail?: string;
  /** Tailwind 배경 — accent/10 (기본) 또는 primary/10 */
  tone?: "accent" | "primary";
  /** Phase 4-A — 도움 수준 1~5. 생략하면 도트 미표시 (이전 호환) */
  helpLevel?: HelpLevel;
}

export function ModeBanner({
  eyebrow,
  headline,
  detail,
  tone = "accent",
  helpLevel,
}: ModeBannerProps) {
  const ariaSummary = [
    `학습 모드 안내: ${headline}`,
    detail,
    helpLevel ? `도움 수준 ${helpLevel} / 5 — ${HELP_LEVEL_LABELS[helpLevel]}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <aside
      role="note"
      aria-label={ariaSummary}
      className={cn(
        "mb-6 flex flex-col gap-2 rounded-2xl p-5 ring-1 md:p-6",
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
      {helpLevel && <HelpLevelMeter helpLevel={helpLevel} />}
    </aside>
  );
}

function HelpLevelMeter({ helpLevel }: { helpLevel: HelpLevel }) {
  return (
    <div
      className="mt-1 flex items-center gap-2"
      // 시각 정보의 텍스트 대체는 aria-label 에 이미 포함되어 있으므로 여기서는 숨김
      aria-hidden="true"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              dot <= helpLevel ? "bg-accent" : "bg-foreground/20",
            )}
          />
        ))}
      </div>
      <span className="text-sm text-foreground/60 md:text-base">
        {HELP_LEVEL_LABELS[helpLevel]}
      </span>
    </div>
  );
}
