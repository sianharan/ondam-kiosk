"use client";

/**
 * GlobalVoiceControls — 앱 전체에 한 번만 마운트되는 음성 보조 UI
 *
 * 포함
 *   - VoiceSettingsPanel (우측 상단, 토글 패널)
 *   - StopSpeakingButton (우측 하단, 발화 중일 때만 floating)
 *
 * layout.tsx 에 한 번만 두어 모든 라우트에서 자동 표시한다.
 */

import { StopSpeakingButton } from "./StopSpeakingButton";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";

export function GlobalVoiceControls() {
  return (
    <>
      <VoiceSettingsPanel />
      <StopSpeakingButton />
    </>
  );
}
