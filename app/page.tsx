"use client";

/**
 * / (1/10) — 환영 + 디스플레이 모드 선택
 *
 * PROJECT_DESIGN.md 5.2 #1 + 3.5 (v2.2 신규).
 *   - Stage 1 (intro)       — 도담 인사 + [다음으로]
 *   - Stage 2 (mode-select) — 세로형 / 가로형 카드 2개
 *
 * Phase 3-A: VoiceCoach 자동 인사 + VoiceButton 으로 시작 버튼 음성화.
 * Phase 3-C: 모드 선택 후 nova 음성 ("세로형으로 시작할게요" 등) → /spatial-map.
 *
 * 충족 KS X 9211:2025
 *   - 5.2.2 d) 청각적 대체 콘텐츠   → 마운트 시 자동 인사 + 모든 버튼 voiceLabel
 *   - 7.6.6  선택과 실행 분리       → 모든 카드/버튼 단일/더블 탭 분리
 *   - 6.3.6 / 6.3.7  다시 듣기·종료 → VoiceCoach 내장
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { useDoubleTap } from "@/lib/interaction/doubleTap";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { cn } from "@/lib/utils";
import {
  useLearningStore,
  type DisplayMode,
} from "@/stores/learningStore";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

type Stage = "intro" | "mode-select";

export default function Home() {
  const router = useRouter();
  const setDisplayMode = useLearningStore((s) => s.setDisplayMode);
  const [stage, setStage] = React.useState<Stage>("intro");

  const handleSelectMode = React.useCallback(
    async (mode: DisplayMode) => {
      // store 에 모드 확정 → 이후 페이지가 모두 이 모드로 렌더
      setDisplayMode(mode);

      // 안내 음성을 발화한 다음 라우팅 — 중간에 끊지 않도록 await
      const confirm = VOICE_SCRIPTS.welcome.modeSelected[mode];
      ttsManager.stop();
      try {
        await ttsManager.speak(confirm, { interrupt: true });
      } catch {
        /* 음성 실패해도 라우팅은 진행 */
      }
      router.push("/spatial-map");
    },
    [router, setDisplayMode],
  );

  return (
    <KioskFrame currentStep={1} title="환영">
      {stage === "intro" ? (
        <IntroStage onNext={() => setStage("mode-select")} />
      ) : (
        <ModeSelectStage onSelect={handleSelectMode} />
      )}
    </KioskFrame>
  );
}

// ── Stage 1: 도담 인사 ───────────────────────────────────────
function IntroStage({ onNext }: { onNext: () => void }) {
  return (
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
        온담 카페에 오신 걸 환영해요. 오늘 함께 키오스크 사용법을 배워볼게요.
      </p>

      <p className="max-w-xl text-xl leading-relaxed text-foreground/70 md:text-2xl">
        먼저 어떤 종류의 키오스크로 연습할지 함께 골라볼게요.
      </p>

      <VoiceButton
        voiceLabel={VOICE_SCRIPTS.welcome.startButton}
        onActivate={onNext}
        className="mt-3 md:text-3xl"
      >
        다음으로
      </VoiceButton>

      <VoiceCoach
        message={[
          VOICE_SCRIPTS.welcome.intro,
          VOICE_SCRIPTS.welcome.startButton,
        ]}
      />
    </section>
  );
}

// ── Stage 2: 디스플레이 모드 선택 ────────────────────────────
function ModeSelectStage({
  onSelect,
}: {
  onSelect: (mode: DisplayMode) => void;
}) {
  return (
    <section
      className="flex flex-col gap-7 py-2"
      aria-labelledby="mode-select-title"
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <h2
          id="mode-select-title"
          className="text-3xl font-bold leading-snug text-primary md:text-4xl"
        >
          어떤 키오스크로 연습할까요?
        </h2>
        <p className="max-w-xl text-xl leading-relaxed text-foreground/75 md:text-2xl">
          한국 매장에서 자주 볼 수 있는 두 가지 형태 중에서 골라주세요.
          어떤 형태든 같은 흐름으로 배워요.
        </p>
      </header>

      <VoiceCoach
        message={[
          VOICE_SCRIPTS.welcome.modeSelect.intro,
          VOICE_SCRIPTS.welcome.modeSelect.vertical,
          VOICE_SCRIPTS.welcome.modeSelect.horizontal,
        ]}
        sequenceGapMs={500}
      />

      <div
        role="radiogroup"
        aria-labelledby="mode-select-title"
        className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6"
      >
        <ModeCard
          mode="vertical"
          title="세로형 키오스크"
          subtitle="카페 카운터형"
          description="모바일 키오스크와 비슷한 세로 화면이에요. 위에서 아래로 한 화면씩 넘어가요."
          voiceLabel={VOICE_SCRIPTS.welcome.modeSelect.vertical}
          onActivate={() => onSelect("vertical")}
          diagram={<VerticalDiagram />}
        />
        <ModeCard
          mode="horizontal"
          title="가로형 키오스크"
          subtitle="매장 입구형 · 푸드코트형"
          description="큰 매장에서 보는 넓은 가로 화면이에요. 좌우로 영역이 나뉘어 있어요."
          voiceLabel={VOICE_SCRIPTS.welcome.modeSelect.horizontal}
          onActivate={() => onSelect("horizontal")}
          diagram={<HorizontalDiagram />}
        />
      </div>
    </section>
  );
}

// ── 모드 카드 (단일 탭 = 설명 음성 / 더블 탭 = 선택) ───────
interface ModeCardProps {
  mode: DisplayMode;
  title: string;
  subtitle: string;
  description: string;
  voiceLabel: string;
  onActivate: () => void;
  diagram: React.ReactNode;
}

function ModeCard({
  mode,
  title,
  subtitle,
  description,
  voiceLabel,
  onActivate,
  diagram,
}: ModeCardProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const handleSingle = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
    void ttsManager.speak(voiceLabel, { interrupt: true });
  }, [isEnabled, voice, speed, volume, voiceLabel]);

  const handleDouble = React.useCallback(() => {
    onActivate();
  }, [onActivate]);

  const { onClick, onKeyDown } = useDoubleTap({
    onSingleTap: handleSingle,
    onDoubleTap: handleDouble,
  });

  return (
    <button
      type="button"
      role="radio"
      aria-checked={false}
      aria-label={`${title}. ${subtitle}. ${description} 한 번 두드리면 설명, 두 번 두드리면 선택.`}
      data-voice-label={voiceLabel}
      data-mode={mode}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "group/mode flex flex-col items-center gap-4 rounded-3xl bg-background p-6 text-center",
        "ring-1 ring-foreground/15 shadow-md transition-all",
        "hover:-translate-y-1 hover:shadow-xl hover:ring-primary/40",
        "focus-visible:ring-4 focus-visible:ring-accent focus-visible:outline-none",
        "md:p-7",
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-32 w-full items-center justify-center rounded-2xl bg-muted/60 md:h-36"
      >
        {diagram}
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-base font-semibold uppercase tracking-wide text-accent">
          {subtitle}
        </span>
        <span className="text-2xl font-bold text-primary md:text-3xl">
          {title}
        </span>
      </div>

      <p className="text-lg leading-relaxed text-foreground/75 md:text-xl">
        {description}
      </p>

      <span className="mt-1 text-base text-foreground/55 md:text-lg">
        한 번 두드리면 설명 · 두 번 두드리면 선택
      </span>
    </button>
  );
}

// ── 간단한 SVG 미리보기 ─────────────────────────────────────
function VerticalDiagram() {
  return (
    <svg
      viewBox="0 0 60 90"
      className="h-24 w-auto md:h-28"
      role="img"
      aria-label="세로형 키오스크 미리보기"
    >
      <rect
        x="6"
        y="4"
        width="48"
        height="82"
        rx="6"
        fill="var(--color-background)"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      <rect x="12" y="14" width="36" height="14" rx="2" fill="var(--color-category-coffee)" opacity="0.75" />
      <rect x="12" y="32" width="36" height="34" rx="2" fill="var(--color-muted)" stroke="var(--color-foreground)" strokeOpacity="0.15" />
      <rect x="12" y="70" width="36" height="10" rx="2" fill="var(--color-accent)" opacity="0.7" />
    </svg>
  );
}

function HorizontalDiagram() {
  return (
    <svg
      viewBox="0 0 110 70"
      className="h-24 w-auto md:h-28"
      role="img"
      aria-label="가로형 키오스크 미리보기"
    >
      <rect
        x="4"
        y="6"
        width="102"
        height="58"
        rx="6"
        fill="var(--color-background)"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      <rect x="10" y="14" width="44" height="42" rx="2" fill="var(--color-category-coffee)" opacity="0.75" />
      <rect x="58" y="14" width="42" height="28" rx="2" fill="var(--color-muted)" stroke="var(--color-foreground)" strokeOpacity="0.15" />
      <rect x="58" y="46" width="42" height="10" rx="2" fill="var(--color-accent)" opacity="0.7" />
    </svg>
  );
}
