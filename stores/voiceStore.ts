/**
 * 음성 상태 store (Zustand)
 *
 * 학습자가 조절할 수 있는 음성 설정과, 현재 발화 상태를 관리한다.
 * 실제 발화 실행은 lib/tts/webSpeech.ts 의 speechManager 가 담당.
 *
 * KS X 9211:2025 관련
 *   - 6.3.3 사용 후 음량 65dBA 이하 자동 초기화 → resetToDefault()
 *   - 8.3.2 충분한 시간 제공 → 학습자가 rate 를 0.8 ~ 1.5 사이에서 선택
 *   - 5.2.2 d) 청각적 대체 콘텐츠 → isEnabled 가 true 일 때 모든 화면이 자동 발화
 */

import { create } from "zustand";

/** 학습자에게 노출하는 속도 옵션 — 단계 4개. */
export const VOICE_RATE_OPTIONS = [0.8, 1.0, 1.25, 1.5] as const;
export type VoiceRate = (typeof VOICE_RATE_OPTIONS)[number];

interface VoiceState {
  /** 음성 안내 활성 여부. false 면 모든 자동 발화 무시. */
  isEnabled: boolean;
  /** 발화 속도 배율. SpeechSynthesisUtterance.rate 와 동일. */
  rate: VoiceRate;
  /** 음량 0 ~ 1. */
  volume: number;
  /** 현재 발화 중인 텍스트 (시각적 표시용). 없을 때 null. */
  currentText: string | null;
  /** 발화 중 여부 — UI 애니메이션 트리거. */
  isSpeaking: boolean;
}

interface VoiceActions {
  /** 음성 안내 on/off 토글. off 시 즉시 stop 호출은 호출 측에서. */
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  setRate: (rate: VoiceRate) => void;
  setVolume: (volume: number) => void;
  setCurrentText: (text: string | null) => void;
  setSpeaking: (speaking: boolean) => void;
  /** 세션 종료 시 기본값으로 복귀 — KS X 9211 6.3.3 */
  resetToDefault: () => void;
}

type VoiceStore = VoiceState & VoiceActions;

const DEFAULT_STATE: VoiceState = {
  isEnabled: true,
  rate: 1.0,
  volume: 1.0,
  currentText: null,
  isSpeaking: false,
};

export const useVoiceStore = create<VoiceStore>((set) => ({
  ...DEFAULT_STATE,

  toggle: () => set((s) => ({ isEnabled: !s.isEnabled })),

  setEnabled: (enabled) => set({ isEnabled: enabled }),

  setRate: (rate) => set({ rate }),

  setVolume: (volume) =>
    set({ volume: Math.min(1, Math.max(0, volume)) }),

  setCurrentText: (text) => set({ currentText: text }),

  setSpeaking: (speaking) => set({ isSpeaking: speaking }),

  resetToDefault: () => set({ ...DEFAULT_STATE }),
}));
