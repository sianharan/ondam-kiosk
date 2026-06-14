"use client";

/**
 * AmbientSound — 카페 BGM 레이어 (PROJECT_DESIGN.md Phase 5)
 *
 * Collins(2006) Sociology 차원 + Lave & Wenger(1991) Situated Learning 구현.
 * 모드별로 카페 환경을 청각적으로 재현하여, 학습자가 실제 매장 사용 시
 * 마주칠 소음 환경에 점진적으로 적응하도록 한다.
 *
 * ⭐ Phase 5 후속 — 스캐폴딩 원리에 맞춰 모드별 점진 증가
 *
 * 각 모드는 "시작 → 종료" 두 점을 가지며 진입 시점부터 60초에 걸쳐
 * 부드럽게 차오른다.  Practice 는 거의 무음(0.06)에서 시작해 의도된 30dB
 * (0.18) 에 도달하고, 다음 모드 Challenge 는 정확히 그 종료값에서 이어받아
 * 50dB(0.40) 까지 다시 60초. 학습자가 모드를 갈아탈 때 "갑자기 시끄러워졌다"
 * 는 단절감을 없애면서, 동시에 한 모드 안에서도 환경에 점진 적응할 수 있다.
 *
 * 모드별 ramp (실효 0~1 스케일):
 *   - tutorial    : 무음 — 1:1 모델링 환경
 *   - practice    : 0.06 → 0.18 (60s)  — 약한 카페
 *   - challenge   : 0.18 → 0.40 (60s)  — 보통 카페
 *   - realGuided  : 0.40 → 0.62 (60s)  — 실세계 카페
 *   - realFree    : 0.62 유지            — 실세계 카페 (탐색)
 *
 * 학습자 볼륨 설정(voiceStore.volume)을 추가 배율로 곱해, 음성과 BGM 의
 * 상대 균형은 유지하면서 전체 음량은 학습자가 통제할 수 있게 한다.  ramp
 * 진행 중 음량을 바꾸면 ticker 가 다음 frame 에 바로 반영한다(restart 없음).
 *
 * 파일 부재 / 로드 실패 시 silent fallback — 학습 흐름은 절대 끊지 않는다.
 *
 * @see PROJECT_DESIGN.md 4.2 / 4.4 Sociology / 5장 Phase 5 / 8.1 기술 스택
 */

import * as React from "react";
import { Howl } from "howler";

import { type LearningMode } from "@/lib/kiosk-data/payment";
import { useVoiceStore, VOLUME_TO_AUDIO } from "@/stores/voiceStore";

type TrackKey = "quiet" | "medium" | "loud";

interface ModeRamp {
  /** 어떤 mp3 파일을 재생할지 */
  track: TrackKey;
  /** 모드 진입 직후 base 볼륨 (학습자 음량 곱하기 전 값) */
  startVol: number;
  /** ramp 종료 후 base 볼륨 */
  endVol: number;
  /** ramp 지속 시간 (ms). 0 이면 startVol 로 즉시 고정. */
  rampMs: number;
}

/**
 * 모드 → ramp 설계.  tutorial 은 null (BGM 자체가 없음).
 *
 * 종료값은 다음 모드 시작값과 정확히 일치 — 모드 전환 시 트랙은 바뀌지만
 * 인지되는 음량은 끊김 없이 이어진다 (트랙 파일 자체가 달라지므로 음색은
 * 변하지만, 학습자는 "환경이 다음 단계로 익숙해진" 느낌으로 자연스럽게 받음).
 */
const MODE_RAMP: Record<LearningMode, ModeRamp | null> = {
  tutorial: null,
  practice: { track: "quiet", startVol: 0.06, endVol: 0.18, rampMs: 60_000 },
  challenge: { track: "medium", startVol: 0.18, endVol: 0.4, rampMs: 60_000 },
  realGuided: { track: "loud", startVol: 0.4, endVol: 0.62, rampMs: 60_000 },
  // Real Free 는 탐색 단계 — 환경 자체는 고정된 실세계 시끄러움.
  realFree: { track: "loud", startVol: 0.62, endVol: 0.62, rampMs: 0 },
};

const TRACK_SRC: Record<TrackKey, string> = {
  quiet: "/sounds/ambient-quiet.mp3",
  medium: "/sounds/ambient-medium.mp3",
  loud: "/sounds/ambient-loud.mp3",
};

/**
 * 주어진 모드가 실제로 소음을 내는지 — MODE_RAMP 단일 출처를 그대로 사용한다.
 * (ramp 가 null 인 tutorial / mode=null 은 무음.)  재생 조건과 "소음 적용 중" 배지
 * 조건이 항상 일치하도록 KioskFrame 이 이 함수를 재사용한다.
 * 실제 재생 여부는 여기에 voiceStore.ambientEnabled 까지 AND 로 곱해야 한다.
 */
export function hasAmbientSound(mode: LearningMode | null): boolean {
  return mode !== null && MODE_RAMP[mode] !== null;
}

const FADE_OUT_MS = 1000;
const TICK_INTERVAL_MS = 100;

export interface AmbientSoundProps {
  /** 현재 학습 모드. null 또는 tutorial 이면 아무 것도 재생하지 않음. */
  mode: LearningMode | null;
}

/**
 * Howl 인스턴스 캐시 — 같은 트랙을 여러 페이지에서 재마운트할 때
 * 디코딩을 반복하지 않도록 모듈 스코프 캐시.
 *
 * SSR 안전: 컴포넌트가 'use client' 이고 캐시 채움은 useEffect 안에서만
 * 일어나므로 서버 평가 시 Howl 은 절대 생성되지 않는다.
 */
const HOWL_CACHE: Map<TrackKey, Howl> = new Map();

export function AmbientSound({ mode }: AmbientSoundProps) {
  const ambientEnabled = useVoiceStore((s) => s.ambientEnabled);

  const ramp = mode ? MODE_RAMP[mode] : null;
  // 음원 키. 의존성 배열에 안정적인 primitive 만 두기 위해 string 으로 분리.
  const trackKey = ramp?.track ?? null;

  // 활성 Howl 핸들 + 진행 중인 ticker 식별자
  const currentRef = React.useRef<{
    howl: Howl;
    id: number;
  } | null>(null);
  const tickerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // ── 1. 이전 ramp ticker 정지 ───────────────────────────
    if (tickerRef.current !== null) {
      clearTimeout(tickerRef.current);
      tickerRef.current = null;
    }

    // ── 2. 이전 트랙 fade-out ──────────────────────────────
    const previous = currentRef.current;
    if (previous) {
      try {
        // 현재 볼륨을 모르므로(매 tick 에서 갱신됨) fade 출발점은
        // Howler 가 알아서 — id 지정으로 sound-level 페이드.
        previous.howl.fade(
          (previous.howl as Howl).volume() as number,
          0,
          FADE_OUT_MS,
          previous.id,
        );
        const pid = previous.id;
        const phowl = previous.howl;
        window.setTimeout(() => {
          try {
            phowl.pause(pid);
          } catch {
            /* noop */
          }
        }, FADE_OUT_MS);
      } catch {
        /* noop */
      }
      currentRef.current = null;
    }

    // ── 3. 새 트랙이 없거나 ambient OFF 면 종료 ────────────
    if (!ramp || !trackKey || !ambientEnabled) return;

    // ── 4. Howl 준비 (캐시 우선) ───────────────────────────
    let howl = HOWL_CACHE.get(trackKey);
    if (!howl) {
      const src = TRACK_SRC[trackKey];
      howl = new Howl({
        src: [src],
        loop: true,
        volume: 0,
        // html5: false — Web Audio(AudioContext) 로 재생.  ⚠ true(HTMLAudioElement
        // 스트리밍)로 두면 도담 음성(TTS 도 HTMLAudioElement)과 같은 오디오 경로를
        // 공유한다.  데스크톱은 동시 채널이 넉넉해 문제없지만, 모바일·키오스크
        // 브라우저는 동시 재생 채널이 사실상 1개라 버퍼링이 끝난 BGM 이 음성 안내
        // 시퀀스 도중 재생되며 TTS 오디오를 밀어내 음성이 중간부터 끊긴다
        // (예: 카테고리 안내가 "에이드"부터 무음).  BGM 을 Web Audio 로 두면 TTS 와
        // 경로가 분리돼 절대 충돌하지 않는다.  전환 시 mp3 디코드 부하는 BGM 트랙이
        // 셋뿐이고 모드 전환도 드물어 무시할 만하다 — 접근성 키오스크에서 음성
        // 명료성이 전환 매끄러움보다 우선이다.
        html5: false,
        preload: true,
        onloaderror: (_, err) => {
          console.warn(
            `[AmbientSound] ${src} 로드 실패. silent fallback. (${String(err)})`,
          );
        },
        onplayerror: (id, err) => {
          console.warn(`[AmbientSound] 재생 차단, unlock 후 재시도. (${String(err)})`);
          if (!howl) return;
          howl.once("unlock", () => {
            try {
              howl?.play(id);
            } catch {
              /* noop */
            }
          });
        },
      });
      HOWL_CACHE.set(trackKey, howl);
    }

    // ── 5. 재생 시작 ──────────────────────────────────────
    let id: number;
    try {
      id = howl.play();
    } catch {
      return; // 모든 게 실패해도 학습 흐름은 계속
    }
    currentRef.current = { howl, id };

    // ── 6. ramp ticker — 100ms 간격으로 startVol → endVol 보간 ─
    // 사용자 음량 변경은 매 tick 에서 store 를 직접 읽어 즉시 반영한다.
    // (deps 에 userVolume 을 두면 ramp 가 매번 처음부터 다시 시작돼 부자연스러움.)
    const startedAt = performance.now();
    const { startVol, endVol, rampMs } = ramp;

    const tick = () => {
      const c = currentRef.current;
      if (!c || c.howl !== howl) {
        tickerRef.current = null;
        return;
      }
      const elapsed = performance.now() - startedAt;
      const t = rampMs > 0 ? Math.min(1, elapsed / rampMs) : 1;
      const baseVol = startVol + (endVol - startVol) * t;
      const userMultiplier = VOLUME_TO_AUDIO[useVoiceStore.getState().volume];
      const finalVol = baseVol * userMultiplier;
      try {
        c.howl.volume(finalVol, c.id);
      } catch {
        /* noop */
      }

      if (t < 1) {
        // ramp 진행 중 — 계속 tick
        tickerRef.current = setTimeout(tick, TICK_INTERVAL_MS);
      } else {
        // ramp 완료 — ticker 종료.  이후 사용자 음량 변경은 별도 effect 가 처리.
        tickerRef.current = null;
      }
    };

    // 첫 tick 즉시 실행해 시작 볼륨을 바로 적용 (0 에서 잠깐 들리는 무음 방지)
    tick();

    return () => {
      // 다음 effect 진입(트랙 전환) 또는 진짜 언마운트.  ticker 만 정리.
      if (tickerRef.current !== null) {
        clearTimeout(tickerRef.current);
        tickerRef.current = null;
      }
      // 보호적 fade-out — 다음 effect 가 또 처리하지만, 진짜 언마운트 케이스 대비.
      const c = currentRef.current;
      if (c && c.howl === howl) {
        try {
          howl.fade((howl.volume() as number), 0, FADE_OUT_MS, id);
          window.setTimeout(() => {
            try {
              howl?.pause(id);
            } catch {
              /* noop */
            }
          }, FADE_OUT_MS);
        } catch {
          /* noop */
        }
        currentRef.current = null;
      }
    };
  }, [trackKey, ambientEnabled, ramp]);

  // ── ramp 종료 후 학습자 음량 변경을 즉시 반영 ─────────────
  // ramp 진행 중에는 ticker 가 매 100ms 마다 store 를 읽으므로 따로 처리 안 해도 됨.
  // 여기서는 ramp 가 끝난 뒤(ticker 죽은 상태)의 즉시 반영만 책임진다.
  const userVolume = useVoiceStore((s) => s.volume);
  React.useEffect(() => {
    if (tickerRef.current !== null) return; // ramp 진행 중이면 ticker 가 처리
    const c = currentRef.current;
    if (!c || !ramp) return;
    const finalVol = ramp.endVol * VOLUME_TO_AUDIO[userVolume];
    try {
      c.howl.volume(finalVol, c.id);
    } catch {
      /* noop */
    }
  }, [userVolume, ramp]);

  return null;
}