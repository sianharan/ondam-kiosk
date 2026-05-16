/**
 * 학습 세션 store (Zustand)
 * Collins 6단계 학습 흐름의 현재 모드/단계와 단계별 시간을 추적한다.
 * Reflection 단계에서 STANDARD_BASELINE 과 비교하기 위한 입력 데이터.
 */

import { create } from 'zustand';

import type { LearningMode } from '@/lib/kiosk-data/payment';

export type LearningStep = 'category' | 'menu' | 'options' | 'payment';

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
}));
