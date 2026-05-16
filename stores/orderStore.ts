/**
 * 주문 상태 store (Zustand)
 * 한 번의 주문(카테고리 → 메뉴 → 옵션 → 결제) 흐름을 관리한다.
 */

import { create } from 'zustand';

import {
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
  type Category,
  type ExtraKey,
  type MenuItem,
  type SizeKey,
  type Temperature,
} from '@/lib/kiosk-data/menu';
import type { PaymentMethod } from '@/lib/kiosk-data/payment';

interface OrderState {
  selectedCategory: Category | null;
  selectedItem: MenuItem | null;
  selectedTemperature: Temperature | null;
  selectedSize: SizeKey;
  selectedExtras: ExtraKey[];
  selectedPayment: PaymentMethod | null;
  isPaymentInProgress: boolean;
  orderNumber: number | null;
}

interface OrderActions {
  setCategory: (category: Category) => void;
  setItem: (item: MenuItem) => void;
  setTemperature: (temperature: Temperature) => void;
  setSize: (size: SizeKey) => void;
  /** 켜져 있으면 끄고, 꺼져 있으면 켠다 */
  toggleExtra: (extra: ExtraKey) => void;
  setPayment: (method: PaymentMethod) => void;
  startPayment: () => void;
  completePayment: (orderNumber: number) => void;
  resetOrder: () => void;
  /** basePrice + size 추가금 + extras 합계 (원) */
  getTotalPrice: () => number;
}

type OrderStore = OrderState & OrderActions;

const INITIAL_STATE: OrderState = {
  selectedCategory: null,
  selectedItem: null,
  selectedTemperature: null,
  selectedSize: 'tall',
  selectedExtras: [],
  selectedPayment: null,
  isPaymentInProgress: false,
  orderNumber: null,
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  ...INITIAL_STATE,

  setCategory: (category) =>
    set({
      selectedCategory: category,
      // 카테고리가 바뀌면 하위 선택은 초기화
      selectedItem: null,
      selectedTemperature: null,
      selectedSize: 'tall',
      selectedExtras: [],
    }),

  setItem: (item) =>
    set({
      selectedItem: item,
      // 메뉴가 바뀌면 옵션도 초기화하되, 단일 온도 메뉴면 자동 적용
      selectedTemperature:
        item.options.temperature === 'hot'
          ? 'hot'
          : item.options.temperature === 'iced'
            ? 'iced'
            : null,
      selectedSize: 'tall',
      selectedExtras: [],
    }),

  setTemperature: (temperature) => set({ selectedTemperature: temperature }),

  setSize: (size) => set({ selectedSize: size }),

  toggleExtra: (extra) =>
    set((state) => ({
      selectedExtras: state.selectedExtras.includes(extra)
        ? state.selectedExtras.filter((e) => e !== extra)
        : [...state.selectedExtras, extra],
    })),

  setPayment: (method) => set({ selectedPayment: method }),

  startPayment: () => set({ isPaymentInProgress: true }),

  completePayment: (orderNumber) =>
    set({ isPaymentInProgress: false, orderNumber }),

  resetOrder: () => set({ ...INITIAL_STATE }),

  getTotalPrice: () => {
    const { selectedItem, selectedSize, selectedExtras } = get();
    if (!selectedItem) return 0;

    const sizeAdd = SIZE_OPTIONS[selectedSize].priceAdd;
    const extrasAdd = selectedExtras.reduce(
      (sum, key) => sum + EXTRA_OPTIONS[key].priceAdd,
      0,
    );
    return selectedItem.basePrice + sizeAdd + extrasAdd;
  },
}));
