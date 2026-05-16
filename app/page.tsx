"use client";

import { Button } from "@/components/ui/button";

export default function Home() {
  const handleStart = () => {
    console.log("시작하기 클릭됨");
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-foreground"
      aria-labelledby="welcome-title"
    >
      <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1
          id="welcome-title"
          className="text-6xl font-bold tracking-tight text-primary md:text-7xl"
        >
          온담 카페
        </h1>

        <p
          className="text-2xl leading-relaxed text-foreground md:text-3xl"
          style={{ fontSize: "max(1.5rem, 24px)" }}
        >
          시각장애인 키오스크 학습 환경
        </p>

        <p className="text-xl leading-relaxed text-foreground/80 md:text-2xl">
          따뜻한 이야기가 있는 곳에서, 도담과 함께 키오스크를 배워봐요.
        </p>

        <Button
          type="button"
          onClick={handleStart}
          aria-label="시작하기. 더블탭하여 학습을 시작합니다"
          className="mt-4 h-auto rounded-2xl bg-primary px-12 py-6 text-2xl font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none md:text-3xl"
        >
          시작하기
        </Button>
      </div>
    </main>
  );
}
