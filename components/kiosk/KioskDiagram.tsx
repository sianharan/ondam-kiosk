/**
 * KioskDiagram — 키오스크 측면도 SVG (공용)
 *
 * spatial-map(공간 지도)과 tutorial(AutoDemo 시연)에서 함께 쓴다.
 *   - spatial-map: activeArea 없이(=정적) — 구조 미리보기. 펄스/전환 없음.
 *   - tutorial   : AutoDemo 현재 단계의 activeArea 를 받아, 도담이 말하는 영역을 강조.
 *
 * 강조 표현
 *   - 활성 영역의 fill 은 부드럽게(0.45s) 밝아지고 비활성은 흐려진다(transition).
 *   - 활성 영역 위에 외곽선 overlay 가 느리게 breathing(펄스, 1.8s)하여 "살아있는" 느낌.
 *   - pulseKey 가 바뀌면 overlay 가 remount 되어, 같은 영역이 연속돼도(menu→menu)
 *     펄스가 한 번 리셋되며 단계 전환이 느껴진다.
 *   - prefers-reduced-motion: reduce 사용자에겐 전환·펄스 없이 정적 강조만(globals.css).
 *
 * activeArea 가 null 이면 모든 영역이 정적 기본 상태로, spatial-map 기존 모습과 동일하다.
 * 색은 기존 토큰만 사용한다(강조색 = --color-primary).
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export type DiagramArea = "category" | "menu" | "payment" | "card";

export interface KioskDiagramProps {
  /**
   * 강조할 영역. null(기본)이면 전부 정적.
   * "payment" 는 결제 영역과 함께 카드 투입구도 강조한다(물리적으로 같은 결제 존).
   */
  activeArea?: DiagramArea | null;
  /**
   * 단계가 바뀔 때마다 달라지는 키. 같은 activeArea 가 연속돼도 이 값이 바뀌면
   * 펄스 overlay 가 remount 되어 펄스가 리셋된다(단계 전환 체감). spatial-map 은 생략.
   */
  pulseKey?: string | number;
  className?: string;
}

// 각 영역 rect 좌표 — 펄스 overlay 와 base rect 가 공유한다.
const AREA_RECTS: Record<
  DiagramArea,
  { x: number; y: number; width: number; height: number; rx: number }
> = {
  category: { x: 24, y: 58, width: 152, height: 56, rx: 6 },
  menu: { x: 24, y: 120, width: 152, height: 92, rx: 6 },
  payment: { x: 24, y: 218, width: 152, height: 40, rx: 6 },
  card: { x: 130, y: 280, width: 46, height: 6, rx: 3 },
};

// payment 강조 시 카드 투입구도 함께 강조(같은 결제 존).
function areasToHighlight(active: DiagramArea | null): DiagramArea[] {
  if (active === null) return [];
  if (active === "payment") return ["payment", "card"];
  return [active];
}

export function KioskDiagram({
  activeArea = null,
  pulseKey,
  className,
}: KioskDiagramProps) {
  const focus = activeArea !== null;
  const highlight = areasToHighlight(activeArea);
  const isOn = (area: DiagramArea) => highlight.includes(area);
  // 강조 모드에서 fill opacity: 활성=1, 비활성=흐림. 정적이면 영역별 기본값.
  const fillOpacity = (area: DiagramArea, base: number) =>
    !focus ? base : isOn(area) ? 1 : 0.2;

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

        {/* 화면 영역 3분할 + 카드 투입구 — fill opacity 가 부드럽게 전환 */}
        <rect
          className="kiosk-area"
          {...AREA_RECTS.category}
          fill="var(--color-category-coffee)"
          style={{ opacity: fillOpacity("category", 0.75) }}
        />
        <rect
          className="kiosk-area"
          {...AREA_RECTS.menu}
          fill="var(--color-muted)"
          stroke="var(--color-foreground)"
          strokeWidth={1}
          strokeOpacity={0.15}
          style={{ opacity: fillOpacity("menu", 1) }}
        />
        <rect
          className="kiosk-area"
          {...AREA_RECTS.payment}
          fill="var(--color-accent)"
          style={{ opacity: fillOpacity("payment", 0.7) }}
        />
        <rect
          className="kiosk-area"
          {...AREA_RECTS.card}
          fill="var(--color-primary)"
          style={{ opacity: fillOpacity("card", 1) }}
        />

        {/* 강조 펄스 overlay — 활성 영역마다 외곽선이 breathing.
            pulseKey 로 remount 시켜 단계가 바뀔 때마다 펄스를 리셋한다. */}
        {highlight.map((area) => (
          <rect
            key={`${pulseKey ?? "static"}-${area}`}
            className="kiosk-pulse"
            {...AREA_RECTS[area]}
          />
        ))}

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
