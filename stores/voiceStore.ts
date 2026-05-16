/**
 * 음성 상태 store (Zustand + persist)
 *
 * 학습자 음성 설정 + 현재 발화 상태를 관리한다.
 * 실제 발화는 lib/tts/fallbackTTS.ts 의 ttsManager (OpenAI + 폴백).
 *
 * KS X 9211:2025 관련
 *   - 5.2.2 d) 청각적 대체 콘텐츠     → isEnabled true 일 때 자동 발화
 *   - 6.3.3 음량 조절                  → volume 5단계 (50/75/100/125/150%)
 *   - 6.3.6 다시 듣기                  → lastSequence 보관 → ReplayButton 이 재생
 *   - 8.3.2 충분한 시간 제공           → speed 4단계 (0.8 ~ 1.5)
 *
 * 영속화
 *   - voice / speed / volume / isEnabled 는 localStorage 에 저장 (페이지 새로고침 유지)
 *   - lastSequence / currentText / isSpeaking 같은 휘발성 상태는 저장하지 않는다
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** 도담에 어울리는 OpenAI 음성 후보. */
export const VOICE_NAMES = ["nova", "shimmer", "echo"] as const;
export type VoiceName = (typeof VOICE_NAMES)[number];

/** 학습자에게 노출하는 속도 옵션 — 4단계. */
export const VOICE_SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5] as const;
export type VoiceSpeed = (typeof VOICE_SPEED_OPTIONS)[number];

/** 음량 5단계. 화면에는 % 로 보여주고 내부 저장은 배율로. */
export const VOICE_VOLUME_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5] as const;
export type VoiceVolume = (typeof VOICE_VOLUME_OPTIONS)[number];

/** 음량 배율 → 실제 <audio>.volume (0~1) 매핑. 청력 보호 차원에서 보수적으로. */
export const VOLUME_TO_AUDIO: Record<VoiceVolume, number> = {
  0.5: 0.5,
  0.75: 0.7,
  1.0: 0.85,
  1.25: 0.95,
  1.5: 1.0,
};

/** 사람에게 보여줄 음성 이름 / 설명. SettingsPanel 에서 사용. */
export const VOICE_DESCRIPTIONS: Record<
  VoiceName,
  { label: string; tone: string }
> = {
  nova: { label: "노바", tone: "밝고 따뜻한 여성 (도담 기본)" },
  shimmer: { label: "샤이머", tone: "부드럽고 차분한 여성" },
  echo: { label: "에코", tone: "맑은 중성 톤" },
};

interface VoiceState {
  isEnabled: boolean;
  voice: VoiceName;
  speed: VoiceSpeed;
  volume: VoiceVolume;
  /** 현재 발화 중인 텍스트 (시각적 표시용). 없을 때 null. */
  currentText: string | null;
  isSpeaking: boolean;
  /** 마지막에 발화한 시퀀스 — 다시 듣기 버튼이 사용 (KS X 9211 6.3.6) */
  lastSequence: string[];
}

interface VoiceActions {
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  setVoice: (voice: VoiceName) => void;
  setSpeed: (speed: VoiceSpeed) => void;
  setVolume: (volume: VoiceVolume) => void;
  setCurrentText: (text: string | null) => void;
  setSpeaking: (speaking: boolean) => void;
  setLastSequence: (lines: string[]) => void;
  /** 세션 종료 시 휘발성 상태만 초기화 (음량 등 설정은 유지) */
  clearTransient: () => void;
  /** 모든 설정을 공장 초기값으로 — KS X 9211 6.3.3 사용 후 자동 초기화 옵션 */
  resetToDefault: () => void;
}

type VoiceStore = VoiceState & VoiceActions;

const DEFAULT_STATE: VoiceState = {
  isEnabled: true,
  voice: "nova",
  speed: 1.0,
  volume: 1.0,
  currentText: null,
  isSpeaking: false,
  lastSequence: [],
};

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      toggle: () => set((s) => ({ isEnabled: !s.isEnabled })),

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setVoice: (voice) => set({ voice }),

      setSpeed: (speed) => set({ speed }),

      setVolume: (volume) => set({ volume }),

      setCurrentText: (text) => set({ currentText: text }),

      setSpeaking: (speaking) => set({ isSpeaking: speaking }),

      setLastSequence: (lines) => set({ lastSequence: lines }),

      clearTransient: () =>
        set({ currentText: null, isSpeaking: false, lastSequence: [] }),

      resetToDefault: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: "ondam-voice-settings",
      storage: createJSONStorage(() => localStorage),
      // 설정 값만 영속화. 휘발성 필드는 매 세션 초기화.
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        voice: state.voice,
        speed: state.speed,
        volume: state.volume,
      }),
    },
  ),
);

/** 컴포넌트 외부(이벤트 핸들러 등)에서 현재 설정을 읽고 싶을 때. */
export function getVoiceSettings() {
  const s = useVoiceStore.getState();
  return { voice: s.voice, speed: s.speed, volume: s.volume, isEnabled: s.isEnabled };
}
