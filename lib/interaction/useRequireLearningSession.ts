/**
 * useRequireLearningSession — 학습 세션 안전 가드
 *
 * 두 가지 가드를 함께 제공한다.
 *
 * 1) v2.1 ─ "사후" 화면 (/articulation, /reflection, /complete) 직접 접근 차단
 *    정상 흐름에서는 직전 모드 페이지가 learningStore.setMode(...) 를 호출해
 *    currentMode 가 채워져 있으므로 통과한다.  새로고침이나 직접 URL 진입처럼
 *    setMode 가 한 번도 호출되지 않은 상태면 홈으로 보낸다.
 *
 * 2) v2.2 ─ /spatial-map 이후 모든 페이지에서 displayMode 미선택 차단
 *    환영 단계의 모드 선택을 건너뛰고 직접 진입한 경우 가로/세로 분기 자체가
 *    정의되지 않으므로 안전하게 홈으로 보낸다.  옵션 `requireDisplayMode: true`
 *    을 켜면 currentMode 와 무관하게 displayMode 만으로 판정한다 (Modeling
 *    단계인 /tutorial 처럼 학습 모드가 아직 비어 있을 수 있는 페이지용).
 *
 * ⚠️ 학습 store 는 sessionStorage 등에 영속화하지 않으므로
 *    페이지에서 F5 새로고침 시에도 mode 가 null 로 초기화되어
 *    홈으로 보내진다. 충돌(crash)은 발생하지 않는다.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useLearningStore } from "@/stores/learningStore";

export interface RequireLearningSessionOptions {
  /**
   * true 면 displayMode 만 체크하고 currentMode 는 무시한다.
   * /spatial-map, /tutorial 처럼 모드 진입 직전·직후 화면에서 사용.
   * 기본 false — currentMode 도 함께 요구 (사후 화면용).
   */
  requireDisplayMode?: boolean;
}

export function useRequireLearningSession(
  options: RequireLearningSessionOptions = {},
): { ready: boolean } {
  const { requireDisplayMode = false } = options;
  const router = useRouter();
  const currentMode = useLearningStore((s) => s.currentMode);
  const displayMode = useLearningStore((s) => s.displayMode);

  const ready = requireDisplayMode
    ? displayMode !== null
    : currentMode !== null && displayMode !== null;

  React.useEffect(() => {
    if (!ready) {
      router.replace("/");
    }
  }, [ready, router]);

  return { ready };
}
