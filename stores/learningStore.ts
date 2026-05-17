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

/**
 * Phase 6 — Articulation 단계에서 학습자가 음성으로 답한 텍스트 3개.
 * 길이는 항상 3 (질문 수). 미응답 슬롯은 빈 문자열로 채워진다.
 *
 * Reflection 단계로 그대로 전달되어 Gemini 분석의 입력이 된다.
 */
export type ArticulationAnswers = [string, string, string];

/**
 * Phase 6 — Reflection 단계에서 Gemini 2.5 Flash 가 돌려준 분석 결과.
 * 각 항목은 1~2개 짧은 문장(시각/청각 양쪽으로 표시 가능한 단위).
 */
export interface ReflectionResult {
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
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

  /** Phase 6 — Articulation 음성 답변 (Whisper 전사 결과). 길이 3 고정. */
  articulationAnswers: ArticulationAnswers;

  /** Phase 6 — Reflection 분석 결과 (Gemini). 아직 분석 전이면 null. */
  reflectionResult: ReflectionResult | null;
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

  /**
   * Phase 6 — Articulation 한 문항의 답변을 인덱스(0~2) 위치에 저장.
   * 다른 슬롯은 보존된다. Reflection 으로 넘어가기 전까지 누적된다.
   */
  setArticulationAnswer: (index: 0 | 1 | 2, text: string) => void;

  /** Phase 6 — Reflection 분석 결과 저장. null 을 주면 다시 분석 가능. */
  setReflectionResult: (result: ReflectionResult | null) => void;
}

type LearningStore = LearningState & LearningActions;

const EMPTY_TIMINGS: StepTimings = {
  category: 0,
  menu: 0,
  options: 0,
  payment: 0,
};

const EMPTY_ARTICULATION: ArticulationAnswers = ["", "", ""];

const INITIAL_STATE: LearningState = {
  currentMode: null,
  currentStep: 1,
  sessionStartTime: null,
  stepTimings: { ...EMPTY_TIMINGS },
  helpRequestCount: 0,
  displayMode: null,
  articulationAnswers: [...EMPTY_ARTICULATION] as ArticulationAnswers,
  reflectionResult: null,
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
      articulationAnswers: [...EMPTY_ARTICULATION] as ArticulationAnswers,
      reflectionResult: null,
    }),

  getSessionDuration: () => {
    const start = get().sessionStartTime;
    if (start === null) return 0;
    return Date.now() - start;
  },

  setDisplayMode: (mode) => set({ displayMode: mode }),

  setArticulationAnswer: (index, text) =>
    set((state) => {
      // 길이 3 고정 — 새 튜플을 만들어 immutable update.
      const next: ArticulationAnswers = [
        state.articulationAnswers[0],
        state.articulationAnswers[1],
        state.articulationAnswers[2],
      ];
      next[index] = text;
      return { articulationAnswers: next };
    }),

  setReflectionResult: (result) => set({ reflectionResult: result }),
}));
