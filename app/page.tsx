"use client";

/**
 * / (1/10) — 환영
 *
 * PROJECT_DESIGN.md 5.2 #1.
 * Phase 3-A: VoiceCoach 자동 인사 + VoiceButton 으로 시작 버튼 음성화.
 *
 * 충족 KS X 9211:2025
 *   - 5.2.2 d) 청각적 대체 콘텐츠   → 마운트 시 자동 인사 + 시작 버튼 voiceLabel
 *   - 7.6.6  선택과 실행 분리       → 시작 버튼 단일/더블 탭 분리
 *   - 6.3.6 / 6.3.7  다시 듣기·종료 → VoiceCoach 내장
 */

import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";

export default function Home() {
  const router = useRouter();

  return (
    <>
      <KioskFrame currentStep={1} title="환영">
        <section
          className="flex flex-col items-center gap-6 py-4 text-center"
          aria-labelledby="welcome-title"
        >
          <span aria-hidden="true" className="text-5xl md:text-6xl">
            🌿
          </span>

          <h2
            id="welcome-title"
            className="text-4xl font-bold leading-snug text-primary md:text-5xl"
          >
            안녕하세요, 도담입니다.
          </h2>

          <p className="max-w-xl text-2xl leading-relaxed text-foreground md:text-3xl">
            온담 카페에 오신 걸 환영해요. 따뜻한 이야기가 있는 곳에서, 함께
            키오스크를 배워봐요.
          </p>

          <p className="max-w-xl text-xl leading-relaxed text-foreground/70 md:text-2xl">
            모두 열 단계로 진행해요. 한 단계씩 천천히 따라오시면 돼요.
          </p>

          <VoiceButton
            voiceLabel={VOICE_SCRIPTS.welcome.startButton}
            onActivate={() => router.push("/spatial-map")}
            className="mt-3 md:text-3xl"
          >
            시작하기
          </VoiceButton>

          <VoiceCoach
            message={[
              VOICE_SCRIPTS.welcome.intro,
              VOICE_SCRIPTS.welcome.startButton,
            ]}
          />
        </section>
      </KioskFrame>
    </>
  );
}
