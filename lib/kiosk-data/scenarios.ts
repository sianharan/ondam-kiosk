/**
 * 학습 시나리오 + Reflection 비교용 표준 베이스라인
 * PROJECT_DESIGN.md 5.2 / 7.3절 기반.
 */

import type { ExtraKey, SizeKey, Temperature } from './menu';

export interface MainScenario {
  id: string;
  name: string;
  /** 목표 메뉴의 MenuItem.id */
  targetItem: string;
  targetTemperature: Temperature;
  targetSize: SizeKey;
  targetExtras: ExtraKey[];
  /** 학습자에게 음성 + 텍스트로 안내될 시나리오 설명 */
  description: string;
}

/**
 * 본 학기 과제 기본 시나리오 — Real Guided 모드의 정해진 주문.
 * "아메리카노 따뜻하게, 톨 사이즈, 추가 옵션 없음"
 */
export const MAIN_SCENARIO: MainScenario = {
  id: 'S1',
  name: '아메리카노 따뜻하게 주문',
  targetItem: 'americano',
  targetTemperature: 'hot',
  targetSize: 'tall',
  targetExtras: [],
  description: '카운터에서 따뜻한 아메리카노 한 잔을 주문해보세요.',
};

export interface StepBaseline {
  /** 카테고리 선택 단계 표준 시간 (ms) */
  category: number;
  /** 메뉴 선택 단계 표준 시간 (ms) */
  menu: number;
  /** 옵션(온도/사이즈/추가) 선택 단계 표준 시간 (ms) */
  options: number;
  /** 결제 단계 표준 시간 (ms) */
  payment: number;
  /** 전체 표준 시간 (ms) — 약 2분 30초 */
  total: number;
}

/**
 * Reflection 단계에서 학습자 stepTimings 와 비교하기 위한 베이스라인.
 * 비장애 일반 사용자의 평균 수행 시간이 아닌, 시각장애 학습자가
 * KS X 9211 음성 안내 흐름을 충분히 듣고 따라했을 때의 권장 시간이다.
 */
export const STANDARD_BASELINE: StepBaseline = {
  category: 20_000,
  menu: 30_000,
  options: 25_000,
  payment: 35_000,
  total: 150_000,
};
