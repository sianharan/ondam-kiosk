/**
 * doubleTap — 단일 터치 / 더블 탭 분리 훅
 *
 * KS X 9211:2025 7.6.6  "선택과 실행 분리"
 *   한 번의 터치(선택)는 정보 안내만, 두 번의 터치(실행)가 동작을 트리거한다.
 *   시각장애인이 잘못된 메뉴를 의도치 않게 실행하는 일을 막기 위함.
 *
 * 동작 규칙
 *   - 첫 클릭 후 DOUBLE_TAP_WINDOW_MS 안에 두 번째 클릭이 오면 더블탭
 *   - 그 시간이 지나면 첫 클릭을 단일 탭으로 확정
 *   - 두 번째 클릭이 오면 단일 탭 발화는 일어나지 않음 (취소)
 *
 * 키보드 접근성
 *   - Enter / Space 키도 같은 핸들러로 라우팅 (한 번/두 번)
 *   - 단, 가속 키보드 사용자를 위해 Shift+Enter 는 "단일 탭", Enter 는 "실행"
 *     으로 매핑할 수도 있으나 표준에서 요구하지 않으므로 일관성 우선:
 *     Enter/Space 도 "한 번 → 안내, 빠르게 두 번 → 실행" 동일 규칙 적용.
 */

"use client";

import * as React from "react";

const DOUBLE_TAP_WINDOW_MS = 300;

export type TapHandlers = {
  /** 한 번 터치: 정보 안내 (예: voiceLabel 발화) */
  onSingleTap: () => void;
  /** 두 번 터치(짧은 간격): 실행 */
  onDoubleTap: () => void;
};

export type DoubleTapBindings = {
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** 컴포넌트 언마운트 시 호출되어 보류 중인 단일 탭 타이머를 정리한다. */
  cleanup: () => void;
};

/**
 * 인터랙티브 요소(버튼/카드)에 단일/더블 탭 분리를 부착한다.
 *
 * 사용 예:
 *   const { onClick, onKeyDown } = useDoubleTap({
 *     onSingleTap: () => speak(voiceLabel),
 *     onDoubleTap: () => router.push("/next"),
 *   });
 *   <button onClick={onClick} onKeyDown={onKeyDown}>...</button>
 */
export function useDoubleTap(handlers: TapHandlers): DoubleTapBindings {
  // 항상 최신 핸들러를 보도록 ref 로 보관 (단발성 타이머 콜백에서 stale 참조 방지).
  const handlersRef = React.useRef(handlers);
  React.useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const pendingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastTapAtRef = React.useRef(0);

  const trigger = React.useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastTapAtRef.current;
    const hasPending = pendingTimerRef.current !== null;

    if (hasPending && elapsed <= DOUBLE_TAP_WINDOW_MS) {
      // 두 번째 탭 — 단일 탭 타이머 취소, 실행
      clearTimeout(pendingTimerRef.current!);
      pendingTimerRef.current = null;
      lastTapAtRef.current = 0;
      handlersRef.current.onDoubleTap();
      return;
    }

    // 첫 탭 — 짧은 윈도우 동안 두 번째 탭을 기다린다.
    lastTapAtRef.current = now;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      handlersRef.current.onSingleTap();
    }, DOUBLE_TAP_WINDOW_MS);
  }, []);

  const onClick = React.useCallback(() => {
    trigger();
  }, [trigger]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        trigger();
      }
    },
    [trigger],
  );

  const cleanup = React.useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { onClick, onKeyDown, cleanup };
}

/** 컴포넌트 외부(예: 이벤트 핸들러 내부)에서 더블탭 윈도우를 알아야 할 때. */
export const DOUBLE_TAP_WINDOW = DOUBLE_TAP_WINDOW_MS;
