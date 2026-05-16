"use client";

/**
 * HintButton — Challenge(Scaffolding & Fading) 모드의 학습자 주도 도움 버튼
 *
 * Collins 의 Scaffolding & Fading 단계에서는 도담이 먼저 말하지 않고, 학습자가
 * 막혔다고 느낄 때 직접 도움을 요청한다.  자동 안내가 줄어든 만큼 "내가 도움을
 * 청해도 되는 안전한 공간" 신호로 명시적 버튼이 필요하다.
 *
 *   - 화면 진입 후 appearAfterMs 가 지나야 등장 (학습자에게 충분한 시도 시간)
 *   - 단일 탭 = "힌트가 필요하세요 버튼" 안내 (VoiceButton 표준)
 *   - 더블 탭 = 힌트 본문 발화
 *   - 사용 후 30초 쿨다운 — 같은 화면에서 반복 의존을 막되, 정말 막히면 다시
 *   - position='inline' : 컨텐츠 흐름 안에 가운데 정렬
 *     position='floating': 우하단 떠 있는 형태 (페이지 전역 도움)
 *
 * KS X 9211 호환
 *   - 7.6.6 선택/실행 분리(단일↔더블) — VoiceButton 패턴 그대로
 *   - 5.2.2 d) 청각 대체 — 발화 + aria-live
 */

import * as React from "react";

import { VoiceButton } from "@/components/voice/VoiceButton";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { cn } from "@/lib/utils";

const COOLDOWN_MS = 30_000;

export interface HintButtonProps {
  /** 더블 탭 시 발화할 힌트 본문 */
  hintText: string;
  /** 화면 진입 후 등장까지의 지연 (기본 15초) */
  appearAfterMs?: number;
  /** 배치 — 흐름 내 inline 또는 우하단 floating */
  position?: "inline" | "floating";
  /** 부모가 시연 단계 등으로 명시적 비활성을 원할 때 */
  disabled?: boolean;
}

export function HintButton({
  hintText,
  appearAfterMs = 15_000,
  position = "inline",
  disabled = false,
}: HintButtonProps) {
  const [visible, setVisible] = React.useState(false);
  const [used, setUsed] = React.useState(false);

  // hintText 가 바뀌면 (stage 변경) 다시 처음부터 카운트다운 + 쿨다운 리셋
  React.useEffect(() => {
    setVisible(false);
    setUsed(false);
    const t = setTimeout(() => setVisible(true), appearAfterMs);
    return () => clearTimeout(t);
  }, [hintText, appearAfterMs]);

  const handleHint = React.useCallback(() => {
    setUsed(true);
    // 큐에 들어가도 학습자가 막혔을 때라 다음 음성과 충돌 가능성이 낮다.
    // 그래도 interrupt 로 진행 중이던 자동 안내가 있었다면 끊고 힌트 먼저.
    void ttsManager.speak(hintText, { interrupt: true });

    const t = setTimeout(() => setUsed(false), COOLDOWN_MS);
    return () => clearTimeout(t);
  }, [hintText]);

  if (disabled || !visible || used) return null;

  return (
    <div
      role="region"
      aria-label="도담의 힌트 도움말"
      className={cn(
        position === "floating"
          ? "fixed bottom-24 right-6 z-30"
          : "mx-auto flex justify-center",
      )}
    >
      <VoiceButton
        voiceLabel="힌트가 필요하세요 버튼이에요. 두 번 두드리면 도담이 도와드려요."
        onActivate={handleHint}
        variant="ghost"
        className={cn(
          "px-6 py-4 text-lg md:text-xl",
          position === "floating"
            ? "shadow-lg ring-2 ring-accent/40 bg-background"
            : "",
        )}
      >
        <span aria-hidden="true" className="mr-2">
          💡
        </span>
        힌트가 필요하세요?
      </VoiceButton>
    </div>
  );
}
