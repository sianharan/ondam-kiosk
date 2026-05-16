"use client";

/**
 * /complete (10/10) — 학습 완료
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 도담의 따뜻한 인사 자동 발화
 *   - [다시 학습하기] / [학습 종료] 모두 VoiceButton
 *   - 학습 종료 시 음성 store transient 정리 (KS X 9211 6.3.3 정신)
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { useRequireLearningSession } from "@/lib/interaction/useRequireLearningSession";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";
import { useVoiceStore } from "@/stores/voiceStore";

export default function CompletePage() {
  const router = useRouter();
  const setStep = useLearningStore((s) => s.setStep);
  const resetSession = useLearningStore((s) => s.resetSession);
  const resetOrder = useOrderStore((s) => s.resetOrder);
  const clearTransient = useVoiceStore((s) => s.clearTransient);
  const { ready } = useRequireLearningSession();

  React.useEffect(() => {
    setStep(10);
  }, [setStep]);

  if (!ready) return null;

  const handleRestart = () => {
    resetOrder();
    resetSession();
    clearTransient();
    router.push("/");
  };

  const handleFinish = () => {
    resetOrder();
    resetSession();
    clearTransient();
    router.push("/");
  };

  return (
    <KioskFrame currentStep={10} title="완료">
      <section
        className="flex flex-col items-center gap-7 py-4 text-center"
        aria-live="polite"
      >
        <span aria-hidden="true" className="text-6xl md:text-7xl">
          🌿
        </span>

        <h2 className="text-4xl font-bold text-primary md:text-5xl">
          오늘 정말 잘 하셨어요!
        </h2>

        <p className="max-w-2xl text-2xl leading-relaxed text-foreground md:text-3xl">
          한 시간 동안 키오스크 사용법을 단계별로 익혀보셨네요. 한 단계씩
          쌓아오신 경험이 다음 카페에서도 큰 힘이 될 거예요.
        </p>

        <VoiceCoach
          message={[
            VOICE_SCRIPTS.complete.intro,
            VOICE_SCRIPTS.complete.save,
            VOICE_SCRIPTS.complete.next,
          ]}
          sequenceGapMs={800}
        />

        <dl
          aria-label="학습 통계 요약"
          className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-foreground/15 bg-background p-5">
            <dt className="text-lg text-foreground/60 md:text-xl">
              총 학습 시간
            </dt>
            <dd className="mt-1 text-3xl font-bold text-primary md:text-4xl">
              27분
            </dd>
          </div>
          <div className="rounded-2xl border border-foreground/15 bg-background p-5">
            <dt className="text-lg text-foreground/60 md:text-xl">
              완료 단계
            </dt>
            <dd className="mt-1 text-3xl font-bold text-primary md:text-4xl">
              7 / 7
            </dd>
          </div>
        </dl>

        <div className="flex w-full flex-col items-stretch gap-3 pt-4 sm:flex-row sm:justify-center">
          <VoiceButton
            voiceLabel="다시 학습하기 버튼이에요. 두 번 두드리면 처음 환영 화면으로 돌아가요."
            onActivate={handleRestart}
          >
            다시 학습하기
          </VoiceButton>
          <VoiceButton
            voiceLabel="학습 종료 버튼이에요. 두 번 두드리면 학습을 마치고 환영 화면으로 돌아가요."
            onActivate={handleFinish}
            variant="ghost"
          >
            학습 종료
          </VoiceButton>
        </div>
      </section>
    </KioskFrame>
  );
}
