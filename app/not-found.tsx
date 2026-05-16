"use client";

/**
 * 404 — 한국어 안내 페이지
 * 라우트 외 경로 접근 시 표시. KS X 9211:2025 5.2.2 d) (청각 대체) 대비
 * aria-live 와 충분한 본문 크기(24px+) 유지.
 */

import Link from "next/link";

import { KioskFrame } from "@/components/kiosk/KioskFrame";

export default function NotFound() {
  return (
    <KioskFrame title="페이지를 찾을 수 없어요">
      <section
        className="flex flex-col items-center gap-6 py-6 text-center"
        role="alert"
        aria-live="assertive"
      >
        <span aria-hidden="true" className="text-6xl md:text-7xl">
          🧭
        </span>
        <h2 className="text-4xl font-bold text-primary md:text-5xl">
          찾을 수 없는 페이지예요
        </h2>
        <p className="max-w-xl text-2xl leading-relaxed text-foreground md:text-3xl">
          주소가 잘못되었거나, 이미 사라진 페이지일 수 있어요. 처음 화면에서
          다시 시작해 보세요.
        </p>

        <Link
          href="/"
          aria-label="홈으로. 환영 화면으로 이동합니다"
          className="mt-3 inline-flex items-center rounded-2xl bg-accent px-10 py-5 text-2xl font-bold text-accent-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none"
        >
          홈으로
        </Link>
      </section>
    </KioskFrame>
  );
}
