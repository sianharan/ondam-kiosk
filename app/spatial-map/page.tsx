"use client";

/**
 * /spatial-map — 공간 지도 (2/10) ⭐ 시각장애인 핵심
 *
 * PROJECT_DESIGN.md 5.2 #2 + 4.3 (전역 → 국소 원칙).
 * Phase 3-A: VoiceCoach 로 intro → layout → physical → next 를 1초 간격 순차 발화.
 * 이해했어요 버튼은 VoiceButton (단일=안내, 더블=실행).
 */

import { useRouter } from "next/navigation";

import { KioskDiagram } from "@/components/kiosk/KioskDiagram";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import {
  PROGRESS_BUTTON_CLASS,
  STICKY_PROGRESS_FOOTER,
  VoiceButton,
} from "@/components/voice/VoiceButton";
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

          {/* 본문(텍스트 안내 + 큰 다이어그램)이 길어 버튼이 화면 밖으로 밀리므로
              sticky 로 본문 하단에 고정 — 스크롤 없이도 항상 보이게 한다. */}
          <footer className={STICKY_PROGRESS_FOOTER}>
            <VoiceButton
              voiceLabel={VOICE_SCRIPTS.spatialMap.next}
              onActivate={() => router.push("/tutorial")}
              className={PROGRESS_BUTTON_CLASS}
            >
              이해했어요, 다음으로
            </VoiceButton>
          </footer>
        </section>
      </KioskFrame>
    </>
  );
}
