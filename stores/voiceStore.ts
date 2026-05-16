/**
 * 음성 상태 store (Zustand)
 *
 * 학습자가 조절할 수 있는 음성 설정과, 현재 발화 상태를 관리한다.
 * 실제 발화는 lib/tts/fallbackTTS.ts 의 ttsManager 가 담당 (OpenAI + 폴백).
 *
 * KS X 9211:2025 관련
 *   - 6.3.3 사용 후 음량 65dBA 이하 자동 초기화 → resetToDefault()
 *   - 8.3.2 충분한 시간 제공 → 학습자가 speed 를 0.8 ~ 1.5 사이에서 선택
 *   - 5.2.2 d) 청각적 대체 콘텐츠 → isEnabled 가 true 일 때 모든 화면이 자동 발화
 */

import { create } from "zustand";

/** 도담에 어울리는 OpenAI 음성 후보. */
export const VOICE_NAMES = ["nova", "shimmer", "echo"] as const;
export type VoiceName = (typeof VOICE_NAMES)[number];

/** 학습자에게 노출하는 속도 옵션 — 4단계. */
export const VOICE_SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5] as const;
export type VoiceSpeed = (typeof VOICE_SPEED_OPTIONS)[number];

/** 사람에게 보여줄 음성 이름 / 설명. SettingsPanel 에서 사용. */
export const VOICE_DESCRIPTIONS: Record<VoiceName, { label: string; tone: string }> = {
  nova: { label: "노바", tone: "밝고 따뜻한 여성 (도담 기본)" },
  shimmer: { label: "샤이머", tone: "부드럽고 차분한 여성" },
  echo: { label: "에코", tone: "맑은 중성 톤" },
};

interface VoiceState {
  isEnabled: boolean;
  voice: VoiceName;
  speed: VoiceSpeed;
  /** 음량 0 ~ 1 */
  volume: number;
  /** 현재 발화 중인 텍스트 (시각적 표시용). 없을 때 null. */
  currentText: string | null;
  isSpeaking: boolean;
}

interface VoiceActions {
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  setVoice: (voice: VoiceName) => void;
  setSpeed: (speed: VoiceSpeed) => void;
  setVolume: (volume: number) => void;
  setCurrentText: (text: string | null) => void;
  setSpeaking: (speaking: boolean) => void;
  /** 세션 종료 시 기본값으로 복귀 — KS X 9211 6.3.3 */
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
};

export const useVoiceStore = create<VoiceStore>((set) => ({
  ...DEFAULT_STATE,

  toggle: () => set((s) => ({ isEnabled: !s.isEnabled })),

  setEnabled: (enabled) => set({ isEnabled: enabled }),

  setVoice: (voice) => set({ voice }),

  setSpeed: (speed) => set({ speed }),

  setVolume: (volume) =>
    set({ volume: Math.min(1, Math.max(0, volume)) }),

  setCurrentText: (text) => set({ currentText: text }),

  setSpeaking: (speaking) => set({ isSpeaking: speaking }),

  resetToDefault: () => set({ ...DEFAULT_STATE }),
}));
