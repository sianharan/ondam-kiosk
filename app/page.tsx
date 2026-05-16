"use client";

/**
 * / (1/10) — 환영
 *
 * PROJECT_DESIGN.md 5.2 #1 "환영" 화면.
 * 키오스크 외관 안에 도담의 인사 + 시작 버튼.
 * 음성 안내(도담 발화)는 Phase 3 에서 활성화.
 */

import { useRouter } from "next/navigation";

import { KioskFrame } from "@/components/kiosk/KioskFrame";

export default function Home() {
  const router = useRouter();

  return (
    <KioskFrame currentStep={1} title="환영">
      <section
        className="flex flex-col items-center gap-6 py-4 text-center"
        aria-labelledby="welcome-title"
      >
        <span aria-hidden="true" className="text-5xl md:text-6xl">
          🌿
        </span>

        <h2
          id="welcome-title"
          className="text-4xl font-bold leading-snug text-primary md:text-5xl"
        >
          안녕하세요, 도담입니다.
        </h2>

        <p className="max-w-xl text-2xl leading-relaxed text-foreground md:text-3xl">
          온담 카페에 오신 걸 환영해요. 따뜻한 이야기가 있는 곳에서,
          함께 키오스크를 배워봐요.
        </p>

        <p className="max-w-xl text-xl leading-relaxed text-foreground/70 md:text-2xl">
          모두 열 단계로 진행해요. 한 단계씩 천천히 따라오시면 돼요.
        </p>

        <button
          type="button"
          onClick={() => router.push("/spatial-map")}
          aria-label="시작하기. 다음 단계 공간 지도로 이동합니다"
          className="mt-3 rounded-2xl bg-accent px-12 py-5 text-2xl font-bold text-accent-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none md:text-3xl"
        >
          시작하기
        </button>
      </section>
    </KioskFrame>
  );
}
