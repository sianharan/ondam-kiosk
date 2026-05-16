/**
 * useRequireLearningSession
 *
 * /articulation, /reflection, /complete 같은 "사후" 화면이 정상 학습 흐름을
 * 거치지 않고 직접 접근됐을 때 홈(/)으로 안전하게 리다이렉트한다.
 *
 * 정상 흐름에서는 직전 모드 페이지가 learningStore.setMode(...) 를 호출해
 * currentMode 가 채워져 있으므로 통과한다.
 *
 * ⚠️ 학습 store 는 sessionStorage 등에 영속화하지 않으므로
 *    페이지에서 F5 새로고침 시에도 mode 가 null 로 초기화되어
 *    홈으로 보내진다. 충돌(crash)은 발생하지 않는다.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useLearningStore } from "@/stores/learningStore";

export function useRequireLearningSession(): { ready: boolean } {
  const router = useRouter();
  const currentMode = useLearningStore((s) => s.currentMode);

  React.useEffect(() => {
    if (currentMode === null) {
      router.replace("/");
    }
  }, [currentMode, router]);

  return { ready: currentMode !== null };
}
