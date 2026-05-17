"use client";

/**
 * 결제 승인 효과음 — Web Audio API 합성
 *
 * Phase 7. KS X 9211:2025 5.2.2 d) "모든 시각 정보에 청각 대체 콘텐츠" 조항을
 * 충족하기 위해, 결제 처리 단계에서 VoiceCoach 안내와 별도로 짧은
 * 카드 단말기/모바일 페이 풍의 승인 톤(삐 - 삑)을 재생한다.
 *
 * 정적 MP3 의존성 없이 즉시 재생 가능 (네트워크 지연 0, 라이선스 부담 0).
 * 음량 기본 0.5 — 음성 안내가 항상 우선.
 *
 * ⚠️ 시뮬레이션 전용. 실제 결제 시스템 연동과는 무관한 학습용 효과음.
 */

interface ChimeOptions {
  /** 0.0 ~ 1.0, 기본 0.5 (음성 안내가 우선이라 절반 음량) */
  volume?: number;
}

type WindowWithWebkitAudio = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let cachedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedContext && cachedContext.state !== "closed") return cachedContext;

  const Ctor =
    window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!Ctor) return null;

  cachedContext = new Ctor();
  return cachedContext;
}

/**
 * 결제 승인 효과음을 재생한다.
 *
 * 두 톤(A5 880 Hz → E6 1318.5 Hz)을 짧은 간격으로 이어 붙여 총 약 0.36초.
 * SSR · AudioContext 미지원 환경에선 조용히 무시한다.
 */
export function playPaymentApprovalChime(options: ChimeOptions = {}): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 사용자 제스처 전 suspended 상태일 수 있으나, 결제 단계는 항상
    // 학습자가 화면을 탭한 이후이므로 resume 호출은 안전하다.
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const volume = Math.max(0, Math.min(1, options.volume ?? 0.5));
    const now = ctx.currentTime;

    const tones: Array<{ freq: number; start: number; duration: number }> = [
      { freq: 880, start: 0, duration: 0.12 },
      { freq: 1318.5, start: 0.14, duration: 0.22 },
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);

      // 빠른 attack, 지수 감쇠 — 카드 단말기 비프음 특유의 깔끔한 톤.
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(
        volume,
        now + tone.start + 0.01,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + tone.start + tone.duration,
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration + 0.02);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[paymentSounds] approval chime failed:", err);
    }
  }
}
