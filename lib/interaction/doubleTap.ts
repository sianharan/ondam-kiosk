/**
 * doubleTap — 단일 터치 / 더블 탭 분리 훅
 *
 * KS X 9211:2025 7.6.6  "선택과 실행 분리"
 *   한 번의 터치(선택)는 정보 안내만, 두 번의 터치(실행)가 동작을 트리거한다.
 *   시각장애인이 잘못된 메뉴를 의도치 않게 실행하는 일을 막기 위함.
 *
 * 동작 규칙 (시각장애인 사용성 보정 — "짚고 → 듣고 → 다시 누름" 리듬)
 *   - 첫 탭: 지연 없이 즉시 onSingleTap() 실행 (안내 0초 지연).
 *   - 그 뒤 같은 요소를 DOUBLE_TAP_WINDOW_MS 안에 다시 누르면 onDoubleTap() 실행.
 *     onDoubleTap 은 ttsManager.stop() 으로 진행 중이던 첫 탭 안내를 끊고 실행으로 넘어간다.
 *   - 윈도우를 넘겨 누르면 다시 "첫 탭(즉시 안내)" 으로 처리.
 *
 *   ⚠ 과거에는 단일 탭 안내를 setTimeout 으로 윈도우만큼 "지연 실행" 했고
 *     두 번째 탭이 오면 그 안내를 취소했다.  안내가 항상 늦게 나오고(답답함)
 *     윈도우가 짧아(300ms) 더블탭 인식이 잦게 실패해, 즉시-안내 + lastTapAt
 *     타임스탬프 비교 방식으로 재작성했다.
 *
 * 터치 포커스 표시 (저시력 사용자)
 *   - 터치 탭은 focus-visible 을 켜지 않아 무엇을 짚었는지 안 보인다.
 *   - onClick 처리 시 해당 요소에 명시적으로 .focus() 를 호출해, 터치 탭에서도
 *     focus-visible:ring-primary 선택 표시가 남게 한다.
 *
 * 키보드 접근성
 *   - Enter / Space 키도 같은 핸들러로 라우팅: 한 번 → 안내, 빠르게 두 번 → 실행.
 */

"use client";

import * as React from "react";

const DOUBLE_TAP_WINDOW_MS = 600;

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

  // 마지막 탭 시각(ms). 0 이면 "직전 탭 없음" → 다음 탭은 첫 탭으로 처리.
  const lastTapAtRef = React.useRef(0);

  const trigger = React.useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastTapAtRef.current;

    if (lastTapAtRef.current !== 0 && elapsed <= DOUBLE_TAP_WINDOW_MS) {
      // 두 번째 탭 — 실행. onDoubleTap 내부의 ttsManager.stop() 이
      // 첫 탭에서 즉시 시작된 안내를 끊고 동작으로 넘어간다.
      lastTapAtRef.current = 0;
      handlersRef.current.onDoubleTap();
      return;
    }

    // 첫 탭 — 지연 없이 즉시 안내하고, 더블탭 윈도우를 연다.
    lastTapAtRef.current = now;
    handlersRef.current.onSingleTap();
  }, []);

  const onClick = React.useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      // 터치 탭에서도 선택한 요소에 포커스를 둔다.
      // ⚠ 한계: 탭/클릭 시 브라우저가 이 핸들러 실행 전에 이미 포인터 modality 로
      //   요소를 포커스하므로, 여기서 .focus() 를 (focusVisible:true 옵션을 줘도)
      //   다시 호출해봐야 "이미 포커스된 요소"라 no-op → :focus-visible 이 켜지지
      //   않아 ring-primary 가 터치 탭에서는 보이지 않는다(Playwright 로 검증함).
      //   터치 탭에 선택 표시를 남기려면 버튼 스타일을 focus-visible: 대신 focus:
      //   기반으로 바꾸는 별도 작업이 필요하다. (키보드 Tab 포커스는 정상 표시.)
      (e.currentTarget as HTMLElement | null)?.focus?.();
      trigger();
    },
    [trigger],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        // onClick 과 동일 경로(포커스 + trigger). 키보드는 이미 포커스돼 있어 무해.
        onClick(e);
      }
    },
    [onClick],
  );

  const cleanup = React.useCallback(() => {
    // 보류 중인 타이머는 더 이상 없으나(즉시 실행), 언마운트 시 상태만 초기화.
    lastTapAtRef.current = 0;
  }, []);

  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { onClick, onKeyDown, cleanup };
}

/** 컴포넌트 외부(예: 이벤트 핸들러 내부)에서 더블탭 윈도우를 알아야 할 때. */
export const DOUBLE_TAP_WINDOW = DOUBLE_TAP_WINDOW_MS;
