/**
 * KioskDiagram — 키오스크 측면도 SVG (공용)
 *
 * spatial-map(공간 지도)과 tutorial(AutoDemo 시연)에서 함께 쓴다.
 *   - spatial-map: activeArea 없이(=정적) — 구조 미리보기.
 *   - tutorial   : AutoDemo 현재 단계의 activeArea 를 받아, 도담이 말하는 영역을 강조.
 *
 * activeArea 가 null 이면 모든 영역이 기본 상태(정적)로, spatial-map 의 기존 모습과
 * 픽셀 단위로 동일하다.  값이 있으면 해당 영역을 강조(불투명 + 진남 외곽선)하고
 * 나머지는 흐리게(opacity↓) 한다.  강조색은 기존 토큰(--color-primary)만 쓰며,
 * 라벨 텍스트는 항상 기본 불투명으로 두어 대비를 해치지 않는다.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export type DiagramArea = "category" | "menu" | "payment" | "card";

export interface KioskDiagramProps {
  /**
   * 강조할 영역. null(기본)이면 전부 정적 기본 상태.
   * "payment" 는 결제 영역과 함께 카드 투입구도 강조한다(물리적으로 같은 결제 존).
   */
  activeArea?: DiagramArea | null;
  className?: string;
}

const ACTIVE_STROKE = "var(--color-primary)";

export function KioskDiagram({
  activeArea = null,
  className,
}: KioskDiagramProps) {
  const focus = activeArea !== null;
  // 해당 영역이 "강조 대상"인가. payment 강조 시 카드 투입구도 함께 강조.
  const active = (area: DiagramArea) =>
    area === activeArea || (area === "card" && activeArea === "payment");

  return (
    <figure
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl bg-muted/40 p-5 shadow-sm ring-1 ring-foreground/15",
        className,
      )}
      aria-label="키오스크 구조 다이어그램"
    >
      <svg
        viewBox="0 0 200 320"
        role="img"
        aria-labelledby="kiosk-diagram-title"
        className="h-80 w-52 md:h-[30rem] md:w-80"
      >
        <title id="kiosk-diagram-title">
          키오스크 측면도 — 상단 스피커, 중앙 화면 3영역, 우하단 카드 투입구
        </title>

        {/* 본체 외곽 (항상 정적) */}
        <rect
          x="10"
          y="10"
          width="180"
          height="300"
          rx="14"
          fill="var(--color-background)"
          stroke="var(--color-primary)"
          strokeWidth="3"
        />

        {/* 스피커 — 좌상단 / 우상단 (항상 정적) */}
        <circle cx="30" cy="34" r="6" fill="var(--color-primary)" />
        <circle cx="170" cy="34" r="6" fill="var(--color-primary)" />

        {/* 화면 영역 — 위/가운데/아래 3분할 (activeArea 에 따라 강조/흐림) */}
        <rect
          x="24"
          y="58"
          width="152"
          height="56"
          rx="6"
          fill="var(--color-category-coffee)"
          opacity={!focus ? 0.75 : active("category") ? 1 : 0.2}
          stroke={active("category") ? ACTIVE_STROKE : "none"}
          strokeWidth={active("category") ? 5 : 0}
        />
        <rect
          x="24"
          y="120"
          width="152"
          height="92"
          rx="6"
          fill="var(--color-muted)"
          opacity={!focus ? 1 : active("menu") ? 1 : 0.2}
          stroke={active("menu") ? ACTIVE_STROKE : "var(--color-foreground)"}
          strokeWidth={active("menu") ? 5 : 1}
          strokeOpacity={active("menu") ? 1 : 0.15}
        />
        <rect
          x="24"
          y="218"
          width="152"
          height="40"
          rx="6"
          fill="var(--color-accent)"
          opacity={!focus ? 0.7 : active("payment") ? 1 : 0.2}
          stroke={active("payment") ? ACTIVE_STROKE : "none"}
          strokeWidth={active("payment") ? 5 : 0}
        />

        {/* 카드 투입구 — 우하단 */}
        <rect
          x="130"
          y="280"
          width="46"
          height="6"
          rx="3"
          fill="var(--color-primary)"
          opacity={!focus ? 1 : active("card") ? 1 : 0.2}
          stroke={active("card") ? ACTIVE_STROKE : "none"}
          strokeWidth={active("card") ? 3 : 0}
        />

        {/* 라벨 — 대비 유지를 위해 항상 기본 불투명 (강조/흐림과 무관) */}
        <g
          fontFamily="inherit"
          fontSize="9"
          fill="var(--color-foreground)"
          textAnchor="middle"
        >
          <text x="100" y="86">카테고리</text>
          <text x="100" y="170">메뉴 목록</text>
          <text x="100" y="240">결제·장바구니</text>
        </g>

        <g
          fontFamily="inherit"
          fontSize="8"
          fill="var(--color-foreground)"
          opacity="0.7"
        >
          <text x="44" y="36">스피커</text>
          <text x="156" y="36" textAnchor="end">스피커</text>
          <text x="124" y="296" textAnchor="end">카드 투입구 →</text>
        </g>
      </svg>
      <figcaption className="text-base text-foreground/60 md:text-lg">
        키오스크 구조 미리보기
      </figcaption>
    </figure>
  );
}
