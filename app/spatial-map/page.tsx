"use client";

/**
 * /spatial-map — 공간 지도 (2/10) ⭐ 시각장애인 핵심
 *
 * PROJECT_DESIGN.md 5.2 #2 + 4.3 (전역 → 국소 원칙) 기반.
 * 키오스크 전체 구조를 먼저 음성/텍스트로 안내한 뒤 세부 조작 학습으로 진입.
 *
 * Phase 2-C 에서는 정적 텍스트 + 단순 SVG 다이어그램만. 음성 안내는 Phase 3.
 */

import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";

const STRUCTURE_ITEMS: { area: string; description: string }[] = [
  {
    area: "전체",
    description: "이 키오스크는 가슴 높이의 화면이에요.",
  },
  {
    area: "화면 위쪽",
    description: "메뉴 카테고리 네 개(커피·에이드·티·디저트)가 가로로 놓여 있어요.",
  },
  {
    area: "화면 가운데",
    description: "선택한 카테고리의 메뉴 목록이 카드 형태로 보여요.",
  },
  {
    area: "화면 아래쪽",
    description: "장바구니와 결제 안내가 차례대로 나와요.",
  },
  {
    area: "카드 투입구",
    description: "화면 아래 오른쪽에 있어요. 카드를 길게 밀어 넣어주세요.",
  },
  {
    area: "스피커",
    description: "화면 위쪽 양옆에 있어요. 안내 음성은 여기서 들려요.",
  },
];

export default function SpatialMapPage() {
  const router = useRouter();

  return (
    <KioskFrame currentStep={2} title="공간 지도">
      <section className="flex flex-col gap-7">
        <header>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            온담 카페 키오스크 안내
          </h2>
          <p className="mt-2 text-xl text-foreground/70 md:text-2xl">
            먼저 키오스크의 구조부터 익혀볼게요. 어디에 무엇이 있는지
            함께 살펴봐요.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
          {/* ── 텍스트 안내 ─────────────────────────── */}
          <ul className="flex flex-col gap-4">
            {STRUCTURE_ITEMS.map((item) => (
              <li
                key={item.area}
                className="flex flex-col gap-1 rounded-2xl border border-foreground/15 bg-background p-5"
              >
                <span className="text-lg font-bold text-accent md:text-xl">
                  {item.area}
                </span>
                <span className="text-xl text-foreground md:text-2xl">
                  {item.description}
                </span>
              </li>
            ))}
          </ul>

          {/* ── SVG 다이어그램 ──────────────────────── */}
          <KioskDiagram />
        </div>

        <footer className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => router.push("/tutorial")}
            aria-label="이해했어요. 다음 단계 튜토리얼로 이동합니다"
            className="rounded-2xl bg-accent px-10 py-5 text-2xl font-bold text-accent-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none"
          >
            이해했어요, 다음으로
          </button>
        </footer>
      </section>
    </KioskFrame>
  );
}

// ── 단순 SVG 키오스크 다이어그램 ───────────────────────────
function KioskDiagram() {
  return (
    <figure
      className="flex flex-col items-center gap-3 rounded-2xl border border-foreground/15 bg-muted/40 p-5"
      aria-label="키오스크 구조 다이어그램"
    >
      <svg
        viewBox="0 0 200 320"
        role="img"
        aria-labelledby="kiosk-diagram-title"
        className="h-72 w-44 md:h-80 md:w-48"
      >
        <title id="kiosk-diagram-title">
          키오스크 측면도 — 상단 스피커, 중앙 화면 3영역, 우하단 카드 투입구
        </title>

        {/* 본체 외곽 */}
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

        {/* 스피커 — 좌상단 / 우상단 */}
        <circle cx="30" cy="34" r="6" fill="var(--color-primary)" />
        <circle cx="170" cy="34" r="6" fill="var(--color-primary)" />

        {/* 화면 영역 — 위/가운데/아래 3분할 */}
        <rect
          x="24"
          y="58"
          width="152"
          height="56"
          rx="6"
          fill="var(--color-category-coffee)"
          opacity="0.75"
        />
        <rect
          x="24"
          y="120"
          width="152"
          height="92"
          rx="6"
          fill="var(--color-muted)"
          stroke="var(--color-foreground)"
          strokeOpacity="0.15"
        />
        <rect
          x="24"
          y="218"
          width="152"
          height="40"
          rx="6"
          fill="var(--color-accent)"
          opacity="0.7"
        />

        {/* 카드 투입구 — 우하단 */}
        <rect
          x="130"
          y="280"
          width="46"
          height="6"
          rx="3"
          fill="var(--color-primary)"
        />

        {/* 라벨 */}
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
