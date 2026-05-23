"use client";

/**
 * /spatial-map — 공간 지도 (2/10) ⭐ 시각장애인 핵심
 *
 * PROJECT_DESIGN.md 5.2 #2 + 4.3 (전역 → 국소 원칙).
 * Phase 3-A: VoiceCoach 로 intro → layout → physical → next 를 1초 간격 순차 발화.
 * 이해했어요 버튼은 VoiceButton (단일=안내, 더블=실행).
 */

import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";

// 핵심 3개로 압축. 카테고리·메뉴목록·결제/장바구니·스피커·카드투입구의 세부 위치는
// 오른쪽 KioskDiagram(SVG) 에 모두 그려져 있으므로 중복 텍스트 박스를 줄였다.
// (저시력 사용자용으로 박스 자체는 화면에 그대로 두되 글씨만 키운다.)
const STRUCTURE_ITEMS: { area: string; description: string }[] = [
  {
    area: "전체 위치",
    description: "이 키오스크는 가슴 높이의 화면이에요. 화면 하나로 주문이 끝나요.",
  },
  {
    area: "화면 3분할",
    description:
      "화면은 위·가운데·아래 세 칸이에요. 위는 메뉴 종류, 가운데는 메뉴 목록, 아래는 장바구니와 결제예요.",
  },
  {
    area: "카드 투입구",
    description: "화면 아래 오른쪽에 있어요. 카드를 길게 밀어 넣어주세요.",
  },
];

const SPATIAL_SEQUENCE = [
  VOICE_SCRIPTS.spatialMap.intro,
  VOICE_SCRIPTS.spatialMap.layout,
  VOICE_SCRIPTS.spatialMap.physical,
  VOICE_SCRIPTS.spatialMap.next,
] as const;

export default function SpatialMapPage() {
  const router = useRouter();
  const { ready } = useRequireLearningSession({ requireDisplayMode: true });

  if (!ready) return null;

  return (
    <>
      <KioskFrame currentStep={2} title="공간 지도">
        <section className="flex flex-col gap-7">
          <header>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              온담 카페 키오스크 안내
            </h2>
            <p className="mt-2 text-xl text-foreground/70 md:text-2xl">
              먼저 키오스크의 구조부터 익혀볼게요. 어디에 무엇이 있는지 함께
              살펴봐요.
            </p>
          </header>

          {/* VoiceCoach — 마운트 시 4단 순차 발화 (1초 간격) */}
          <VoiceCoach message={SPATIAL_SEQUENCE} sequenceGapMs={1000} />

          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            {/* ── 텍스트 안내 (저시력 사용자용 시각 채널) ──────────────
                내용이 SPATIAL_SEQUENCE 음성과 같은 정보라 스크린리더에서는
                중복 낭독을 막기 위해 aria-hidden. 전맹 사용자는 VoiceCoach 로 듣고,
                저시력 사용자는 이 박스를 눈으로 읽는다. (화면에서 지우는 게 아님) */}
            <ul className="flex flex-col gap-4" aria-hidden="true">
              {STRUCTURE_ITEMS.map((item) => (
                <li
                  key={item.area}
                  className="flex flex-col gap-1 rounded-2xl bg-background p-5 shadow-sm ring-1 ring-foreground/15"
                >
                  <span className="text-lg font-bold text-primary md:text-xl">
                    {item.area}
                  </span>
                  <span className="text-card-body text-foreground">
                    {item.description}
                  </span>
                </li>
              ))}
            </ul>

            {/* ── SVG 다이어그램 — 텍스트를 줄인 만큼 크게 ─────────── */}
            <KioskDiagram />
          </div>

          <footer className="flex justify-end pt-2">
            <VoiceButton
              voiceLabel={VOICE_SCRIPTS.spatialMap.next}
              onActivate={() => router.push("/tutorial")}
            >
              이해했어요, 다음으로
            </VoiceButton>
          </footer>
        </section>
      </KioskFrame>
    </>
  );
}

// ── 단순 SVG 키오스크 다이어그램 ───────────────────────────
function KioskDiagram() {
  return (
    <figure
      className="flex flex-col items-center gap-3 rounded-2xl bg-muted/40 p-5 shadow-sm ring-1 ring-foreground/15"
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
