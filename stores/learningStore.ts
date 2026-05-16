/**
 * 학습 세션 store (Zustand)
 * Collins 6단계 학습 흐름의 현재 모드/단계와 단계별 시간을 추적한다.
 * Reflection 단계에서 STANDARD_BASELINE 과 비교하기 위한 입력 데이터.
 */

import { create } from 'zustand';

import type { LearningMode } from '@/lib/kiosk-data/payment';

export type LearningStep = 'category' | 'menu' | 'options' | 'payment';

/**
 * v2.2 — 디스플레이 모드 (PROJECT_DESIGN 3.5)
 *
 *   - 'vertical'   : 800px / max-w-2xl / 단일 컬럼 / 카페 카운터형
 *   - 'horizontal' : 1400px / max-w-7xl / 좌우 분할 / 매장 입구·푸드코트형
 *
 * 환영 단계(1/10)에서 학습자가 직접 선택하고, 이후 전 페이지가 같은 모드로 렌더된다.
 */
export type DisplayMode = 'vertical' | 'horizontal';

export interface StepTimings {
  category: number;
  menu: number;
  options: number;
  payment: number;
}

interface LearningState {
  currentMode: LearningMode | null;
  /** 화면 흐름 1~10 (PROJECT_DESIGN 5.1) */
  currentStep: number;
  /** 세션 시작 timestamp (ms) */
  sessionStartTime: number | null;
  stepTimings: StepTimings;
  helpRequestCount: number;

  /** v2.2 — 환영 단계에서 학습자가 고른 키오스크 형태. null = 미선택 */
  displayMode: DisplayMode | null;
}

interface LearningActions {
  setMode: (mode: LearningMode) => void;
  setStep: (step: number) => void;
  startSession: () => void;
  recordStepTime: (step: LearningStep, durationMs: number) => void;
  incrementHelpCount: () => void;
  resetSession: () => void;
  /** 세션 시작부터 지금까지의 총 ms (시작 안 했으면 0) */
  getSessionDuration: () => number;

  /** v2.2 — 환영 단계에서 호출. 이후 모든 페이지가 이 모드로 렌더링 */
  setDisplayMode: (mode: DisplayMode) => void;
}

type LearningStore = LearningState & LearningActions;

const EMPTY_TIMINGS: StepTimings = {
  category: 0,
  menu: 0,
  options: 0,
  payment: 0,
};

const INITIAL_STATE: LearningState = {
  currentMode: null,
  currentStep: 1,
  sessionStartTime: null,
  stepTimings: { ...EMPTY_TIMINGS },
  helpRequestCount: 0,
  displayMode: null,
};

export const useLearningStore = create<LearningStore>((set, get) => ({
  ...INITIAL_STATE,

  setMode: (mode) => set({ currentMode: mode }),

  setStep: (step) => set({ currentStep: step }),

  startSession: () =>
    set({
      sessionStartTime: Date.now(),
      stepTimings: { ...EMPTY_TIMINGS },
      helpRequestCount: 0,
    }),

  recordStepTime: (step, durationMs) =>
    set((state) => ({
      stepTimings: { ...state.stepTimings, [step]: durationMs },
    })),

  incrementHelpCount: () =>
    set((state) => ({ helpRequestCount: state.helpRequestCount + 1 })),

  resetSession: () =>
    set({
      ...INITIAL_STATE,
      stepTimings: { ...EMPTY_TIMINGS },
    }),

  getSessionDuration: () => {
    const start = get().sessionStartTime;
    if (start === null) return 0;
    return Date.now() - start;
  },

  setDisplayMode: (mode) => set({ displayMode: mode }),
}));
