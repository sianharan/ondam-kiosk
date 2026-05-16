/**
 * 결제 수단 데이터
 * PROJECT_DESIGN.md 7.2절 기반.
 *
 * 모드별 점진 도입은 Collins Sequencing("복잡성 증가")에 따라
 * Tutorial → Practice → Challenge 순으로 결제 수단을 늘려준다.
 */

export type PaymentMethod = 'card' | 'mobile-pay' | 'coupon';

export interface PaymentOption {
  id: PaymentMethod;
  /** 화면 표시용 짧은 라벨 */
  label: string;
  /** TTS 발화용 라벨 */
  voiceLabel: string;
  /** KS X 9211:2025 6.5.2 — 결제 단계 위치 안내 음성 */
  voiceInstruction: string;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'card',
    label: '신용/체크카드',
    voiceLabel: '신용 또는 체크카드',
    voiceInstruction: '카드를 단말기 아래쪽 투입구에 꽂아주세요.',
  },
  {
    id: 'mobile-pay',
    label: '모바일 페이',
    voiceLabel: '모바일 페이',
    voiceInstruction: '휴대폰 화면을 키오스크 하단 인식기에 가까이 대주세요.',
  },
  {
    id: 'coupon',
    label: '쿠폰',
    voiceLabel: '쿠폰 결제',
    voiceInstruction: '쿠폰 바코드를 키오스크 하단 스캐너에 보여주세요.',
  },
];

export type LearningMode =
  | 'tutorial'
  | 'practice'
  | 'challenge'
  | 'realGuided'
  | 'realFree';

/** 학습 모드별 노출 결제 수단 (Collins Sequencing — 복잡성 증가) */
export const PAYMENT_BY_MODE: Record<LearningMode, PaymentMethod[]> = {
  tutorial: ['card'],
  practice: ['card', 'mobile-pay'],
  challenge: ['card', 'mobile-pay', 'coupon'],
  realGuided: ['card', 'mobile-pay', 'coupon'],
  realFree: ['card', 'mobile-pay', 'coupon'],
};

export function getPaymentOption(id: PaymentMethod): PaymentOption | undefined {
  return PAYMENT_OPTIONS.find((p) => p.id === id);
}

export function getPaymentsForMode(mode: LearningMode): PaymentOption[] {
  const allowed = PAYMENT_BY_MODE[mode];
  return PAYMENT_OPTIONS.filter((p) => allowed.includes(p.id));
}
