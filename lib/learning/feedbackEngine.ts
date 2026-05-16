/**
 * feedbackEngine — 모드별 즉시/지연 피드백 생성기 (Phase 4-A)
 *
 * Practice(Coaching) 모드에서 학습자의 매 행동(카테고리/메뉴/옵션/결제 선택)에
 * 즉시 음성 피드백을 돌려주기 위한 모듈.  Challenge / RealGuided / RealFree 에는
 * delayed / silent 피드백 정책을 적용해 Collins 의 Fading 원리를 구현한다.
 *
 * 호출 패턴(Practice 페이지)
 *   const text = generateFeedback({ type: 'category_selected', category: '커피' }, 'practice');
 *   if (text && shouldSpeakFeedback('practice')) await ttsManager.speak(text);
 */

import type { LearningMode } from '@/lib/kiosk-data/payment';

import { getFeedbackMode, getModeConfig } from './modeConfigs';

export type FeedbackEvent =
  | { type: 'category_selected'; category: string }
  | { type: 'menu_selected'; itemName: string }
  | { type: 'option_selected'; option: string }
  | { type: 'payment_selected'; method: string }
  | { type: 'error'; reason: string }
  | { type: 'long_pause'; duration: number };

export function generateFeedback(
  event: FeedbackEvent,
  mode: LearningMode,
): string | null {
  const config = getModeConfig(mode);

  if (config.feedbackOnError === 'silent') {
    return null;
  }

  switch (event.type) {
    case 'category_selected':
      if (config.feedbackVerbosity === 'detailed') {
        return `잘하셨어요! ${event.category} 카테고리를 골라주셨네요.`;
      }
      return '좋아요.';

    case 'menu_selected':
      if (config.feedbackVerbosity === 'detailed') {
        return `${event.itemName}을 선택하셨네요. 다음 단계로 가볼까요?`;
      }
      return '좋아요.';

    case 'option_selected':
      if (config.feedbackVerbosity === 'detailed') {
        return `${event.option}을 선택하셨어요.`;
      }
      return null;

    case 'payment_selected':
      if (config.feedbackVerbosity === 'detailed') {
        return `${event.method}으로 결제하시는군요. 안내해드릴게요.`;
      }
      return null;

    case 'error':
      if (config.feedbackVerbosity === 'detailed') {
        return '괜찮아요. 다시 한 번 천천히 해볼까요?';
      }
      return null;

    case 'long_pause':
      if (config.feedbackVerbosity === 'detailed' && event.duration > 30_000) {
        return '어려우시면 다시 듣기 버튼을 눌러주세요.';
      }
      return null;

    default: {
      // 컴파일타임 exhaustiveness 검사
      const _exhaustive: never = event;
      void _exhaustive;
      return null;
    }
  }
}

/** ttsManager.speak 직전에 호출 — 모드가 immediate 일 때만 true */
export function shouldSpeakFeedback(mode: LearningMode): boolean {
  return getFeedbackMode(mode) === 'immediate';
}
