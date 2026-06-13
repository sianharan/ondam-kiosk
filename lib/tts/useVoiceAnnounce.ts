"use client";

/**
 * useVoiceAnnounce — voiceStore 설정(voice/speed/volume)을 반영한 "안내 발화" + 키보드
 * 포커스 안내 onFocus 를 한 번에 제공하는 공용 훅.
 *
 * useDoubleTap/VoiceButton 을 쓰지 않는 단순 버튼(멈추기·음성설정·다시듣기·건너뛰기·
 * 시간연장·복구 등)에 "단일 탭 안내"와 "Tab 포커스 안내"를 일관되게 붙이기 위함.
 * (카드/진행 버튼은 이미 useDoubleTap·VoiceButton 의 onFocus 로 동일 동작을 한다.)
 *
 *   const { onFocus } = useVoiceAnnounce();
 *   <button onFocus={onFocus} aria-label="...">  // Tab 포커스 시 aria-label 발화
 *
 * - speak(label)  : voiceStore 설정을 매니저에 적용하고 interrupt 로 즉시 발화.
 *                   isEnabled=false 면 아무것도 하지 않는다.
 * - onFocus       : useFocusAnnounce 게이트를 통과(키보드 Tab/화살표 이동)했을 때만
 *                   currentTarget 의 aria-label 을 speak 한다. 마우스/터치/자동 포커스 무시.
 *
 * 한 핸들러를 여러 버튼(.map)에 재사용할 수 있다 — 라벨이 아닌 currentTarget 의
 * aria-label 을 읽기 때문.  interrupt 발화라 직전 안내를 끊고 현재 위치를 즉시 알린다.
 */

import * as React from "react";

import { useFocusAnnounce } from "@/lib/interaction/doubleTap";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

export interface VoiceAnnounce {
  speak: (label: string) => void;
  onFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export function useVoiceAnnounce(): VoiceAnnounce {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const speak = React.useCallback(
    (label: string) => {
      if (!isEnabled || !label) return;
      ttsManager.setVoice(voice);
      ttsManager.setSpeed(speed);
      ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
      void ttsManager.speak(label, { interrupt: true });
    },
    [isEnabled, voice, speed, volume],
  );

  const onFocus = useFocusAnnounce(speak);

  return { speak, onFocus };
}
