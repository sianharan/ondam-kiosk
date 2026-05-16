/**
 * 모드별 차별화 설정 — Phase 4-A
 *
 * Collins 의 인지적 도제 6+1 단계를 본 시뮬레이터의 5개 학습 모드에 매핑한다
 * (PROJECT_DESIGN.md 4.2 — Method).  각 모드는 도움 수준(helpLevel), 음성
 * 상세도(voiceVerbosity), 자동 시연 여부(enableAutoDemo), 시간 제한 등으로
 * 차별화된다.  이 설정 객체가 5개 모드 페이지 + 공용 컴포넌트들의 단일 진실
 * 공급원(single source of truth) 역할을 한다.
 *
 *   Tutorial   → Modeling             (100% 도움 — 도담이 보여줌)
 *   Practice   → Coaching             (80% 도움 — 즉시 피드백)
 *   Challenge  → Scaffolding & Fading (40% 도움 — 점진 감소)
 *   RealGuided → Fading 완성          (10% 도움 — 호출만)
 *   RealFree   → Exploration          (학습자 주도)
 */

import type { LearningMode } from '@/lib/kiosk-data/payment';

export interface ModeConfig {
  mode: LearningMode;
  /** 화면 흐름 단계 (PROJECT_DESIGN 5.1 — 1~10 중 해당 모드) */
  step: number;
  title: string;
  /** Collins 단계 라벨 (Modeling / Coaching / ...) */
  philosophy: string;

  /** 1(최대 도움) ~ 5(자율). ModeBanner 도트 시각화 */
  helpLevel: 1 | 2 | 3 | 4 | 5;
  /** TTS 안내 상세도 */
  voiceVerbosity: 'detailed' | 'normal' | 'minimal' | 'silent';

  /** ModeBanner / OrderFlow 에서 힌트 노출 여부 */
  showHints: boolean;
  /** 메뉴 미리보기 (옵션 진입 전 메뉴 설명) 노출 여부 */
  showMenuPreview: boolean;
  /** Tutorial 처럼 도담이 자동 시연하는지 */
  enableAutoDemo: boolean;

  /** 모드 페이지 시간 제한 (ms). null = 무제한 */
  timeoutMs: number | null;

  /** 오류/오선택 발생 시 피드백 타이밍 */
  feedbackOnError: 'immediate' | 'delayed' | 'silent';
  feedbackVerbosity: 'detailed' | 'normal' | 'minimal';
}

export const MODE_CONFIGS: Record<LearningMode, ModeConfig> = {
  tutorial: {
    mode: 'tutorial',
    step: 3,
    title: 'Tutorial — 함께 배워보기',
    philosophy: 'Modeling',
    helpLevel: 1,
    voiceVerbosity: 'detailed',
    showHints: true,
    showMenuPreview: true,
    enableAutoDemo: true,
    timeoutMs: null,
    feedbackOnError: 'immediate',
    feedbackVerbosity: 'detailed',
  },
  practice: {
    mode: 'practice',
    step: 4,
    title: 'Practice — 직접 해보기',
    philosophy: 'Coaching',
    helpLevel: 2,
    voiceVerbosity: 'detailed',
    showHints: true,
    showMenuPreview: true,
    enableAutoDemo: false,
    timeoutMs: 300_000,
    feedbackOnError: 'immediate',
    feedbackVerbosity: 'detailed',
  },
  challenge: {
    mode: 'challenge',
    step: 5,
    title: 'Challenge — 도전해보기',
    philosophy: 'Scaffolding & Fading',
    helpLevel: 3,
    voiceVerbosity: 'normal',
    showHints: true,
    showMenuPreview: false,
    enableAutoDemo: false,
    timeoutMs: 240_000,
    feedbackOnError: 'delayed',
    feedbackVerbosity: 'normal',
  },
  realGuided: {
    mode: 'realGuided',
    step: 6,
    title: 'Real Guided — 실전 1단계',
    philosophy: 'Fading',
    helpLevel: 4,
    voiceVerbosity: 'minimal',
    showHints: false,
    showMenuPreview: false,
    enableAutoDemo: false,
    timeoutMs: 180_000,
    feedbackOnError: 'silent',
    feedbackVerbosity: 'minimal',
  },
  realFree: {
    mode: 'realFree',
    step: 7,
    title: 'Real Free — 자유 주문',
    philosophy: 'Exploration',
    helpLevel: 5,
    voiceVerbosity: 'silent',
    showHints: false,
    showMenuPreview: false,
    enableAutoDemo: false,
    timeoutMs: null,
    feedbackOnError: 'silent',
    feedbackVerbosity: 'minimal',
  },
};

/** ModeBanner 의 helpLevel 도트 옆에 함께 표시되는 한국어 설명 */
export const HELP_LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '최대 도움 (시연 모드)',
  2: '많은 도움 (코칭)',
  3: '점진 감소',
  4: '최소 도움',
  5: '자율 (학습자 주도)',
};

export function getModeConfig(mode: LearningMode): ModeConfig {
  return MODE_CONFIGS[mode];
}

export function shouldShowAutoDemo(mode: LearningMode): boolean {
  return MODE_CONFIGS[mode].enableAutoDemo;
}

export function getFeedbackMode(
  mode: LearningMode,
): 'immediate' | 'delayed' | 'silent' {
  return MODE_CONFIGS[mode].feedbackOnError;
}
