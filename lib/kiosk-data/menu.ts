/**
 * 온담(溫談) 카페 메뉴 데이터
 * PROJECT_DESIGN.md 7.1절 기반.
 *
 * voiceLabel / description 은 시각장애인 학습자가 음성으로 듣기에
 * 자연스럽도록 작성한다 (KS X 9211:2025 5.2.2 d) — 청각적 대체 콘텐츠).
 */

export type Category = 'coffee' | 'ade' | 'tea' | 'dessert';

export type Temperature = 'hot' | 'iced';

export type SizeKey = 'tall' | 'grande';

export type ExtraKey = 'shot' | 'syrup';

export interface MenuItemOptions {
  /** 'hot' | 'iced' | 'both' — 'both' 면 학습자가 선택 */
  temperature?: 'hot' | 'iced' | 'both';
  /** 사이즈 옵션 사용 여부 */
  size?: boolean;
  /** 샷/시럽 추가 사용 여부 */
  extras?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  basePrice: number;
  /** TTS 발화용 라벨 (보통 name 과 동일하나 발음 보정용으로 분리) */
  voiceLabel: string;
  /** 1~2 문장. 시각장애인이 메뉴를 떠올릴 수 있는 묘사 */
  description: string;
  options: MenuItemOptions;
  /** 단순 SVG 마크업 — 카테고리 색상은 추후 컴포넌트 단에서 적용 */
  iconSvg: string;
}

const ICON_COFFEE_CUP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z"/><path d="M16 11h2a2 2 0 1 1 0 4h-2"/><path d="M7 4c0 1 1 1 1 2s-1 1-1 2"/><path d="M11 4c0 1 1 1 1 2s-1 1-1 2"/></svg>`;

const ICON_ADE_GLASS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12l-2 16a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L6 4z"/><path d="M7 10h10"/><circle cx="10" cy="14" r="0.8"/><circle cx="14" cy="16" r="0.8"/></svg>`;

const ICON_TEA_CUP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5z"/><path d="M16 12h2a2 2 0 1 1 0 4h-2"/><path d="M9 4c0 1.5 1 1.5 1 3"/><path d="M12 4c0 1.5 1 1.5 1 3"/></svg>`;

const ICON_CROISSANT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16c2-6 7-10 13-10 1 0 2 .2 3 .6-1 1-2 1.6-3 1.8-3 .6-6 2.4-8 5-1.4 1.8-3 3-5 2.6z"/><path d="M7 14l2 1"/><path d="M11 11l2 1"/><path d="M14 9l2 1"/></svg>`;

export const MENU: MenuItem[] = [
  // ─── 커피 3종 ───────────────────────────────────────────
  {
    id: 'americano',
    name: '아메리카노',
    category: 'coffee',
    basePrice: 4500,
    voiceLabel: '아메리카노',
    description: '쌉쌀하고 깊은 맛의 클래식 커피예요. 따뜻하게도, 차갑게도 즐기실 수 있어요.',
    options: { temperature: 'both', size: true, extras: true },
    iconSvg: ICON_COFFEE_CUP,
  },
  {
    id: 'cafelatte',
    name: '카페라떼',
    category: 'coffee',
    basePrice: 5000,
    voiceLabel: '카페라떼',
    description: '에스프레소에 부드러운 우유를 더한 고소한 라떼예요.',
    options: { temperature: 'both', size: true, extras: true },
    iconSvg: ICON_COFFEE_CUP,
  },
  {
    id: 'cappuccino',
    name: '카푸치노',
    category: 'coffee',
    basePrice: 5000,
    voiceLabel: '카푸치노',
    description: '거품이 풍성하고 진한 향이 매력인 이탈리안 스타일 커피예요.',
    options: { temperature: 'hot', size: true, extras: true },
    iconSvg: ICON_COFFEE_CUP,
  },

  // ─── 에이드 2종 ─────────────────────────────────────────
  {
    id: 'lemon-ade',
    name: '레몬에이드',
    category: 'ade',
    basePrice: 5500,
    voiceLabel: '레몬에이드',
    description: '상큼한 레몬의 신맛이 톡 쏘는 시원한 탄산 음료예요.',
    options: { temperature: 'iced', size: true, extras: false },
    iconSvg: ICON_ADE_GLASS,
  },
  {
    id: 'grapefruit-ade',
    name: '자몽에이드',
    category: 'ade',
    basePrice: 5500,
    voiceLabel: '자몽에이드',
    description: '쌉쌀한 자몽 과즙과 탄산이 어우러진 산뜻한 음료예요.',
    options: { temperature: 'iced', size: true, extras: false },
    iconSvg: ICON_ADE_GLASS,
  },

  // ─── 티 2종 ─────────────────────────────────────────────
  {
    id: 'chamomile',
    name: '캐모마일',
    category: 'tea',
    basePrice: 5000,
    voiceLabel: '캐모마일 차',
    description: '꽃 향이 은은하게 퍼지는 부드럽고 따뜻한 허브차예요.',
    options: { temperature: 'hot', size: false, extras: false },
    iconSvg: ICON_TEA_CUP,
  },
  {
    id: 'peppermint',
    name: '페퍼민트',
    category: 'tea',
    basePrice: 5000,
    voiceLabel: '페퍼민트 차',
    description: '입안이 시원해지는 박하 향의 산뜻한 허브차예요.',
    options: { temperature: 'hot', size: false, extras: false },
    iconSvg: ICON_TEA_CUP,
  },

  // ─── 디저트 1종 ─────────────────────────────────────────
  {
    id: 'croissant',
    name: '크로와상',
    category: 'dessert',
    basePrice: 3800,
    voiceLabel: '크로와상',
    description: '겉은 바삭하고 속은 부드러운 버터 향 가득한 빵이에요.',
    options: { size: false, extras: false },
    iconSvg: ICON_CROISSANT,
  },
];

export interface SizeOption {
  label: string;
  voiceLabel: string;
  priceAdd: number;
}

export const SIZE_OPTIONS: Record<SizeKey, SizeOption> = {
  tall: { label: '톨', voiceLabel: '톨 사이즈', priceAdd: 0 },
  grande: { label: '그란데', voiceLabel: '그란데 사이즈', priceAdd: 500 },
};

export interface ExtraOption {
  label: string;
  voiceLabel: string;
  priceAdd: number;
}

export const EXTRA_OPTIONS: Record<ExtraKey, ExtraOption> = {
  shot: { label: '샷 추가', voiceLabel: '에스프레소 샷 한 번 추가', priceAdd: 500 },
  syrup: { label: '시럽 추가', voiceLabel: '바닐라 시럽 추가', priceAdd: 300 },
};

/** 카테고리 한국어 라벨 (UI/음성 공용) */
export const CATEGORY_LABEL: Record<Category, string> = {
  coffee: '커피',
  ade: '에이드',
  tea: '티',
  dessert: '디저트',
};

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU.find((m) => m.id === id);
}

export function getMenuByCategory(category: Category): MenuItem[] {
  return MENU.filter((m) => m.category === category);
}
