"use client";

/**
 * usePrefetchVoiceLabels — 화면에 보이는 버튼/카드의 voiceLabel(nova) 오디오를
 * 마운트 시 미리 받아 캐시에 채운다.
 *
 * 목적: Tab 포커스·단일 탭 안내의 "처음 듣는 라벨" 지연을 사용자 조작 전에 흡수해,
 * 실제 발화 시 OpenAI 캐시 적중으로 즉시 재생되게 한다. (음색은 nova 로 일관 유지)
 *
 * - 음성 속도/음성이 바뀌면 새 캐시 키이므로 다시 prefetch 한다.
 * - 음성 비활성(isEnabled=false) 시 생략.
 * - prefetch 에 넘기는 (voice, speed) 는 단일 탭 핸들러가 speak 직전에 setVoice/
 *   setSpeed 로 적용하는 store 값과 동일하므로 캐시 키가 일치한다.
 */

import * as React from "react";

import { ttsManager } from "@/lib/tts/fallbackTTS";
import { useVoiceStore } from "@/stores/voiceStore";

export function usePrefetchVoiceLabels(labels: readonly string[]): void {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);

  // 매 렌더 새 배열이 들어와도 내용이 같으면 재실행하지 않도록 안정 키로 묶는다.
  const key = labels.join("");

  React.useEffect(() => {
    if (!isEnabled || !key) return;
    ttsManager.prefetch(labels, { voice, speed });
    // labels 는 key 로 안정화하므로 의존성에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isEnabled, voice, speed]);
}
