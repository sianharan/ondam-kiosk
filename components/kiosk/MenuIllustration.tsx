"use client";

/**
 * MenuIllustration — 메뉴 카드용 SVG 일러스트 8종
 *
 * 시각 장식 전용 (aria-hidden). 음성 안내는 부모 카드의 voiceLabel 이 담당한다.
 * 카테고리 톤은 CSS 변수(--category-coffee/--category-ade/--category-tea)를 통해
 * 주입되므로, 테마 변경이 일러스트에도 함께 반영된다.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface MenuIllustrationProps {
  menuId: string;
  className?: string;
}

export function MenuIllustration({ menuId, className }: MenuIllustrationProps) {
  const Drawing = ILLUSTRATIONS[menuId];
  if (!Drawing) return null;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <Drawing />
    </div>
  );
}

// ── 공통 토큰 ────────────────────────────────────────────────
const STROKE = "#2A2A2A";
const STROKE_SOFT = "#5C5C5C";
const CUP_FILL = "#FFFFFF";
const SAUCER_FILL = "#FAF6EE";
const SAUCER_RING = "#EBE6DE";
const STEAM = "#9AA0A6";

const SVG_PROPS = {
  viewBox: "0 0 120 120",
  width: "100%",
  height: "100%",
  role: "presentation" as const,
  preserveAspectRatio: "xMidYMid meet",
};

function SteamWisp({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y} q -3 -6 1 -10 q 4 -4 0 -10`}
      stroke={STEAM}
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
      opacity="0.55"
    />
  );
}

// ── 1. 아메리카노 ────────────────────────────────────────────
function AmericanoSvg() {
  return (
    <svg {...SVG_PROPS}>
      <SteamWisp x={50} y={28} />
      <SteamWisp x={62} y={28} />
      <SteamWisp x={74} y={28} />
      <ellipse
        cx="60"
        cy="106"
        rx="40"
        ry="6"
        fill={SAUCER_FILL}
        stroke={STROKE}
        strokeWidth="2"
      />
      <ellipse
        cx="60"
        cy="106"
        rx="32"
        ry="3.5"
        fill={SAUCER_RING}
        stroke={STROKE_SOFT}
        strokeWidth="1"
      />
      <path
        d="M30 42 L33 92 Q35 102 47 102 L73 102 Q85 102 87 92 L90 42 Z"
        fill={CUP_FILL}
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M90 55 Q108 55 108 70 Q108 85 90 85"
        fill="none"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse
        cx="60"
        cy="42"
        rx="30"
        ry="5.5"
        style={{ fill: "var(--category-coffee, #6B4423)" }}
        stroke={STROKE}
        strokeWidth="2"
      />
    </svg>
  );
}

// ── 2. 카페라떼 ──────────────────────────────────────────────
function CafelatteSvg() {
  return (
    <svg {...SVG_PROPS}>
      <SteamWisp x={52} y={28} />
      <SteamWisp x={66} y={28} />
      <ellipse
        cx="60"
        cy="106"
        rx="40"
        ry="6"
        fill={SAUCER_FILL}
        stroke={STROKE}
        strokeWidth="2"
      />
      <ellipse
        cx="60"
        cy="106"
        rx="32"
        ry="3.5"
        fill={SAUCER_RING}
        stroke={STROKE_SOFT}
        strokeWidth="1"
      />
      <path
        d="M30 42 L33 92 Q35 102 47 102 L73 102 Q85 102 87 92 L90 42 Z"
        fill={CUP_FILL}
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M90 55 Q108 55 108 70 Q108 85 90 85"
        fill="none"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* 크레마 표면 */}
      <ellipse
        cx="60"
        cy="42"
        rx="30"
        ry="5.5"
        fill="#E8C9A5"
        stroke={STROKE}
        strokeWidth="2"
      />
      {/* 라떼 아트 — 잎사귀 패턴 */}
      <g stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M60 38 L60 47" />
        <path d="M54 39 Q60 40 66 39" />
        <path d="M52 42 Q60 43 68 42" />
        <path d="M54 45 Q60 46 66 45" />
      </g>
    </svg>
  );
}

// ── 3. 카푸치노 ──────────────────────────────────────────────
function CappuccinoSvg() {
  return (
    <svg {...SVG_PROPS}>
      <SteamWisp x={52} y={22} />
      <SteamWisp x={66} y={22} />
      <ellipse
        cx="60"
        cy="106"
        rx="40"
        ry="6"
        fill={SAUCER_FILL}
        stroke={STROKE}
        strokeWidth="2"
      />
      <ellipse
        cx="60"
        cy="106"
        rx="32"
        ry="3.5"
        fill={SAUCER_RING}
        stroke={STROKE_SOFT}
        strokeWidth="1"
      />
      <path
        d="M30 50 L33 92 Q35 102 47 102 L73 102 Q85 102 87 92 L90 50 Z"
        fill={CUP_FILL}
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M90 60 Q108 60 108 73 Q108 86 90 86"
        fill="none"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* 거품 돔 */}
      <path
        d="M31 50 Q60 30 89 50 Q60 56 31 50 Z"
        fill="#F5E6D3"
        stroke={STROKE}
        strokeWidth="2"
      />
      {/* 코코아 점 */}
      <g style={{ fill: "var(--category-coffee, #6B4423)" }}>
        <circle cx="50" cy="44" r="1.6" />
        <circle cx="60" cy="38" r="1.6" />
        <circle cx="70" cy="44" r="1.6" />
        <circle cx="55" cy="48" r="1.3" />
        <circle cx="65" cy="48" r="1.3" />
      </g>
    </svg>
  );
}

// ── 4. 레몬에이드 ────────────────────────────────────────────
function LemonAdeSvg() {
  return (
    <svg {...SVG_PROPS}>
      {/* 빨대 */}
      <rect
        x="62"
        y="14"
        width="6"
        height="36"
        rx="2"
        style={{ fill: "var(--category-ade, #2D8C8C)" }}
        stroke={STROKE}
        strokeWidth="1.6"
      />
      {/* 잔 */}
      <path
        d="M34 32 L40 104 Q41 112 50 112 L70 112 Q79 112 80 104 L86 32 Z"
        fill="#F4D04A"
        fillOpacity="0.92"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="60"
        cy="32"
        rx="26"
        ry="4"
        fill="#F4D04A"
        stroke={STROKE}
        strokeWidth="2"
      />
      {/* 얼음 */}
      <rect
        x="44"
        y="52"
        width="12"
        height="12"
        rx="2"
        fill="#FFFFFF"
        fillOpacity="0.7"
        stroke="#FFFFFF"
        strokeWidth="1.2"
      />
      <rect
        x="60"
        y="68"
        width="11"
        height="11"
        rx="2"
        fill="#FFFFFF"
        fillOpacity="0.7"
        stroke="#FFFFFF"
        strokeWidth="1.2"
      />
      {/* 레몬 슬라이스 (잔 가장자리) */}
      <g>
        <circle
          cx="42"
          cy="32"
          r="8"
          fill="#FFE873"
          stroke={STROKE}
          strokeWidth="1.6"
        />
        <circle
          cx="42"
          cy="32"
          r="5"
          fill="none"
          stroke={STROKE}
          strokeWidth="1"
        />
        <path
          d="M42 27 L42 37 M37 32 L47 32 M38.5 28.5 L45.5 35.5 M45.5 28.5 L38.5 35.5"
          stroke={STROKE}
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

// ── 5. 자몽에이드 ────────────────────────────────────────────
function GrapefruitAdeSvg() {
  return (
    <svg {...SVG_PROPS}>
      <rect
        x="62"
        y="14"
        width="6"
        height="36"
        rx="2"
        style={{ fill: "var(--category-ade, #2D8C8C)" }}
        stroke={STROKE}
        strokeWidth="1.6"
      />
      <path
        d="M34 32 L40 104 Q41 112 50 112 L70 112 Q79 112 80 104 L86 32 Z"
        fill="#F08577"
        fillOpacity="0.92"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="60"
        cy="32"
        rx="26"
        ry="4"
        fill="#F08577"
        stroke={STROKE}
        strokeWidth="2"
      />
      <rect
        x="44"
        y="52"
        width="12"
        height="12"
        rx="2"
        fill="#FFFFFF"
        fillOpacity="0.65"
        stroke="#FFFFFF"
        strokeWidth="1.2"
      />
      <rect
        x="60"
        y="68"
        width="11"
        height="11"
        rx="2"
        fill="#FFFFFF"
        fillOpacity="0.65"
        stroke="#FFFFFF"
        strokeWidth="1.2"
      />
      <g>
        <circle
          cx="42"
          cy="32"
          r="8"
          fill="#F5A99A"
          stroke={STROKE}
          strokeWidth="1.6"
        />
        <circle
          cx="42"
          cy="32"
          r="5"
          fill="none"
          stroke={STROKE}
          strokeWidth="1"
        />
        <path
          d="M42 27 L42 37 M37 32 L47 32 M38.5 28.5 L45.5 35.5 M45.5 28.5 L38.5 35.5"
          stroke={STROKE}
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

// ── 6. 캐모마일 ──────────────────────────────────────────────
function ChamomileSvg() {
  return (
    <svg {...SVG_PROPS}>
      <SteamWisp x={50} y={30} />
      <SteamWisp x={64} y={30} />
      <ellipse
        cx="60"
        cy="100"
        rx="44"
        ry="7"
        fill={SAUCER_FILL}
        stroke={STROKE}
        strokeWidth="2"
      />
      <ellipse
        cx="60"
        cy="100"
        rx="36"
        ry="4"
        fill={SAUCER_RING}
        stroke={STROKE_SOFT}
        strokeWidth="1.2"
      />
      {/* 찻잔 — 넓고 낮은 형태 */}
      <path
        d="M34 48 Q34 92 60 92 Q86 92 86 48 Z"
        fill={CUP_FILL}
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M86 58 Q102 58 102 70 Q102 82 86 82"
        fill="none"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* 차 표면 */}
      <ellipse
        cx="60"
        cy="48"
        rx="26"
        ry="5"
        fill="#E8C547"
        stroke={STROKE}
        strokeWidth="1.8"
      />
      {/* 캐모마일 꽃 */}
      <g>
        <ellipse
          cx="60"
          cy="42"
          rx="1.6"
          ry="3.4"
          fill="#FFFFFF"
          stroke={STROKE}
          strokeWidth="0.7"
        />
        <ellipse
          cx="60"
          cy="52"
          rx="1.6"
          ry="3.4"
          fill="#FFFFFF"
          stroke={STROKE}
          strokeWidth="0.7"
        />
        <ellipse
          cx="55"
          cy="47"
          rx="3.4"
          ry="1.6"
          fill="#FFFFFF"
          stroke={STROKE}
          strokeWidth="0.7"
        />
        <ellipse
          cx="65"
          cy="47"
          rx="3.4"
          ry="1.6"
          fill="#FFFFFF"
          stroke={STROKE}
          strokeWidth="0.7"
        />
        <circle
          cx="60"
          cy="47"
          r="2.6"
          fill="#F4C430"
          stroke={STROKE}
          strokeWidth="0.7"
        />
      </g>
    </svg>
  );
}

// ── 7. 페퍼민트 ──────────────────────────────────────────────
function PeppermintSvg() {
  return (
    <svg {...SVG_PROPS}>
      <SteamWisp x={50} y={30} />
      <SteamWisp x={64} y={30} />
      <ellipse
        cx="60"
        cy="100"
        rx="44"
        ry="7"
        fill={SAUCER_FILL}
        stroke={STROKE}
        strokeWidth="2"
      />
      <ellipse
        cx="60"
        cy="100"
        rx="36"
        ry="4"
        fill={SAUCER_RING}
        stroke={STROKE_SOFT}
        strokeWidth="1.2"
      />
      <path
        d="M34 48 Q34 92 60 92 Q86 92 86 48 Z"
        fill={CUP_FILL}
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M86 58 Q102 58 102 70 Q102 82 86 82"
        fill="none"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse
        cx="60"
        cy="48"
        rx="26"
        ry="5"
        style={{ fill: "var(--category-tea, #88B04B)" }}
        stroke={STROKE}
        strokeWidth="1.8"
      />
      {/* 민트 잎 */}
      <g>
        <path
          d="M50 44 Q47 39 52 36 Q58 35 59 41 Q57 46 50 44 Z"
          fill="#5FA052"
          stroke={STROKE}
          strokeWidth="1"
        />
        <path d="M52 44 Q53 38 56 36" stroke={STROKE} strokeWidth="0.6" fill="none" />
        <path
          d="M64 46 Q61 42 65 39 Q70 38 71 43 Q69 48 64 46 Z"
          fill="#73B660"
          stroke={STROKE}
          strokeWidth="1"
        />
        <path d="M66 45 Q67 40 69 38" stroke={STROKE} strokeWidth="0.6" fill="none" />
      </g>
    </svg>
  );
}

// ── 8. 크로와상 ──────────────────────────────────────────────
function CroissantSvg() {
  return (
    <svg {...SVG_PROPS}>
      {/* 접시 */}
      <ellipse
        cx="60"
        cy="92"
        rx="46"
        ry="8"
        fill={SAUCER_FILL}
        stroke={STROKE}
        strokeWidth="2"
      />
      <ellipse
        cx="60"
        cy="92"
        rx="38"
        ry="4.5"
        fill={SAUCER_RING}
        stroke={STROKE_SOFT}
        strokeWidth="1.2"
      />
      {/* 크로와상 본체 */}
      <path
        d="M22 78 Q18 42 60 38 Q102 42 98 78 Q98 64 84 60 Q70 58 60 58 Q50 58 36 60 Q22 64 22 78 Z"
        fill="#C8956B"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* 양쪽 끝부분 (꼬리) */}
      <path
        d="M22 78 Q16 80 18 88"
        fill="#C8956B"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M98 78 Q104 80 102 88"
        fill="#C8956B"
        stroke={STROKE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* 결 / 층 */}
      <g stroke="#8B5E34" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M38 64 Q40 52 46 46" />
        <path d="M52 60 Q53 47 56 43" />
        <path d="M68 60 Q67 47 64 43" />
        <path d="M82 64 Q80 52 74 46" />
      </g>
      {/* 광택 */}
      <path
        d="M40 70 Q60 60 80 70"
        stroke="#E8C9A5"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

// ── 라우터 ───────────────────────────────────────────────────
const ILLUSTRATIONS: Record<string, React.FC> = {
  americano: AmericanoSvg,
  cafelatte: CafelatteSvg,
  cappuccino: CappuccinoSvg,
  "lemon-ade": LemonAdeSvg,
  "grapefruit-ade": GrapefruitAdeSvg,
  chamomile: ChamomileSvg,
  peppermint: PeppermintSvg,
  croissant: CroissantSvg,
};
