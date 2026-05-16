"use client";

/**
 * /demo — 발표 시연용 직접 진입 라우트 (v2.2 Phase 3-C)
 *
 * 발표 자리에서 환영 단계를 거치지 않고 특정 디스플레이 모드로 바로 시연할 수 있게
 * 한다.  ?mode=vertical 또는 ?mode=horizontal 을 받아 learningStore.displayMode 에
 * 꽂아 넣고 즉시 /spatial-map 으로 보낸다.  잘못된 mode 면 환영(/)으로.
 *
 * 본 라우트는 KS X 9211 학습 흐름을 깨는 발표용 도구이므로,
 * 일반 사용자 안내에는 노출되지 않는다.  (도담 음성도 띄우지 않는다.)
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  useLearningStore,
  type DisplayMode,
} from "@/stores/learningStore";

function DemoRouter() {
  const router = useRouter();
  const params = useSearchParams();
  const setDisplayMode = useLearningStore((s) => s.setDisplayMode);

  React.useEffect(() => {
    const mode = params.get("mode");
    if (mode === "vertical" || mode === "horizontal") {
      setDisplayMode(mode as DisplayMode);
      router.replace("/spatial-map");
    } else {
      router.replace("/");
    }
  }, [params, router, setDisplayMode]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12 text-center"
      aria-live="polite"
    >
      <p className="text-2xl text-foreground/70 md:text-3xl">
        시연용 진입을 준비하고 있어요…
      </p>
    </main>
  );
}

export default function DemoPage() {
  // Next.js 15+ 에서 useSearchParams 는 클라이언트 Suspense 경계가 필요하다.
  return (
    <React.Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-2xl text-foreground/70">불러오는 중…</p>
        </main>
      }
    >
      <DemoRouter />
    </React.Suspense>
  );
}
