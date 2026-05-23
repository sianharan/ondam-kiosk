/**
 * TTSManager — OpenAI 우선 + Web Speech 폴백 통합 매니저
 *
 * 본 앱은 도담의 따뜻한 톤을 살리기 위해 OpenAI TTS(nova) 를 기본 음성으로 쓴다.
 * 하지만 다음 상황에는 학습 흐름이 끊기지 않도록 즉시 Web Speech 폴백을 쓴다.
 *
 *   - API 키 누락 (서버 503)
 *   - 네트워크 오류 / 한도 초과 / 5xx
 *   - 자동 재생 차단 등 클라이언트 측 실패
 *
 * 운영 규칙
 *   1) 세션 시작 시 preferOpenAI = true
 *   2) speak() 에서 OpenAI 실패하면 즉시 같은 텍스트를 Web Speech 로 재시도
 *   3) 연속 N 회 실패하면 세션 내내 폴백 고정 (반복 시도로 인한 지연 방지)
 *   4) 사용자가 settings 에서 음성을 다시 골랐을 때 preferOpenAI 재시도 가능
 *
 * 컴포넌트들은 이 파일의 ttsManager 만 import 하면 된다.
 */

import {
  OpenAITTSManager,
  TTSError,
  type OpenAIVoice,
  type SpeakOptions,
} from "./openaiTTS";
import { WebSpeechManager } from "./webSpeech";

const FAILURE_THRESHOLD = 2;

export type TTSEngine = "openai" | "webspeech";

export class TTSManager {
  private openai: OpenAITTSManager;
  private webSpeech: WebSpeechManager;

  private preferOpenAI = true;
  private consecutiveFailures = 0;
  /** 마지막에 실제로 사용된 엔진 — UI 표시용 */
  private lastEngine: TTSEngine = "openai";

  constructor() {
    this.openai = new OpenAITTSManager();
    this.webSpeech = new WebSpeechManager();
  }

  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    const trimmed = text?.trim();
    if (!trimmed) return;

    // interrupt 는 두 엔진 모두에 적용해야 함 (이전 발화가 어디서 났든 끊는다).
    if (options.interrupt) {
      this.openai.stop();
      this.webSpeech.stop();
    }

    if (this.preferOpenAI) {
      try {
        await this.openai.speak(trimmed, options);
        this.consecutiveFailures = 0;
        this.lastEngine = "openai";
        return;
      } catch (err) {
        // 실패 — Web Speech 로 즉시 재시도
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
          this.preferOpenAI = false;
        }
        if (typeof console !== "undefined") {
          console.warn(
            `[TTS] OpenAI 실패, Web Speech 로 폴백: ${
              err instanceof TTSError ? `${err.status} ${err.message}` : err
            }`,
          );
        }
      }
    }

    await this.webSpeech.speak(trimmed, { interrupt: options.interrupt });
    this.lastEngine = "webspeech";
  }

  /**
   * prefetch — 진행 버튼/카드 라벨(nova) 오디오를 화면 진입 시 미리 받아 캐시에 채운다.
   *
   * Tab/단일 탭 시 첫 발화도 캐시 적중으로 즉시 재생되도록 OpenAI 왕복 지연을
   * 사용자 조작 전에 흡수한다.  음색은 nova 로 일관 유지된다.
   * OpenAI 가 폴백으로 고정된 상태(연속 실패)면 prefetch 가 의미 없으므로 건너뛴다.
   */
  prefetch(
    texts: string | readonly string[],
    opts?: { voice?: OpenAIVoice; speed?: number },
  ): void {
    if (!this.preferOpenAI) return;
    const list = Array.isArray(texts) ? texts : [texts as string];
    for (const t of list) void this.openai.prefetch(t, opts?.voice, opts?.speed);
  }

  stop(): void {
    this.openai.stop();
    this.webSpeech.stop();
  }

  pause(): void {
    this.openai.pause();
    this.webSpeech.pause();
  }

  resume(): void {
    if (this.lastEngine === "openai") this.openai.resume();
    else this.webSpeech.resume();
  }

  setVoice(voice: OpenAIVoice): void {
    this.openai.setVoice(voice);
    // 사용자가 음성을 새로 골랐다 = OpenAI 재시도 의향. 카운터 리셋.
    this.consecutiveFailures = 0;
    this.preferOpenAI = true;
  }

  setSpeed(speed: number): void {
    this.openai.setSpeed(speed);
    this.webSpeech.setRate(speed);
  }

  /** voiceStore 와의 호환을 위해 setSpeed 의 별명 */
  setRate(rate: number): void {
    this.setSpeed(rate);
  }

  setVolume(volume: number): void {
    this.openai.setVolume(volume);
    this.webSpeech.setVolume(volume);
  }

  isSpeaking(): boolean {
    return this.openai.isSpeaking() || this.webSpeech.isSpeaking();
  }

  /** UI 가 현재 엔진(특히 폴백 상태)을 알아야 할 때 */
  getEngine(): TTSEngine {
    return this.lastEngine;
  }

  /** 폴백으로 고정됐는지 — settings UI 에서 안내용 */
  isFallbackForced(): boolean {
    return !this.preferOpenAI;
  }
}

/**
 * 앱 전역 싱글톤. 모든 음성 호출은 여기로.
 * (이전 speechManager 를 직접 import 하던 곳도 모두 이쪽으로 교체)
 */
export const ttsManager = new TTSManager();
