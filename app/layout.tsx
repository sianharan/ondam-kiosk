import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "온담 카페 — 시각장애인 키오스크 학습 환경",
  description:
    "Collins(2006) 인지적 도제이론 기반, 시각장애인이 키오스크 사용 역량을 길러내는 학습 환경",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily:
            "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
