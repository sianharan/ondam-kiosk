/**
 * Web Speech API 추상화 — WebSpeechManager
 *
 * Phase 3-A: 브라우저 내장 TTS만 사용한다. AI 동적 멘트는 Phase 4-AI.
 *
 * KS X 9211:2025 충족 포인트
 *   - 5.2.2 d) 청각적 대체 콘텐츠   → 모든 텍스트를 speak() 로 발화
 *   - 6.3.6  다시 듣기 기능         → speak(interrupt:true) 로 재생
 *   - 6.3.7  읽기 종료 기능         → stop() 즉시 중단 (ESC / 더블탭 종료)
 *   - 8.3.2  충분한 시간 제공       → setRate(0.8 ~ 1.5) 학습자 조절
 *
 * 설계 메모
 *   - SSR 환경에서도 import 가능하도록 window 접근은 lazy.
 *   - 한국어 음성(ko-KR)을 자동 선택. 미설치 시 첫 ko* 또는 default 폴백.
 *   - 발화 큐: speak() 는 Promise<void> 반환, 끝나야 다음이 시작.
 *   - options.interrupt=true 면 현재/대기 모두 비우고 새로 발화.
 *   - 페이지 이동 시 사용자가 stop() 을 호출해 중복 발화를 막는다.
 */

const KOREAN_LANG_PREFIX = "ko";

type SpeakOptions = {
  /** 현재 발화 + 대기 큐를 모두 비우고 즉시 새 음성 시작 */
  interrupt?: boolean;
};

type QueueItem = {
  text: string;
  resolve: () => void;
  reject: (err: unknown) => void;
};

export class WebSpeechManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private utteranceQueue: QueueItem[] = [];
  private rate = 1.0;
  private volume = 1.0;
  private cachedKoreanVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;

  constructor() {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    this.synth = window.speechSynthesis;

    // 브라우저에 따라 voice 목록이 비동기로 채워진다.
    const tryLoad = () => {
      const voices = this.synth?.getVoices() ?? [];
      if (voices.length > 0) {
        this.voicesLoaded = true;
        this.cachedKoreanVoice = this.pickKoreanVoice(voices);
      }
    };
    tryLoad();
    this.synth.addEventListener?.("voiceschanged", tryLoad);
  }

  /**
   * 텍스트를 발화한다.
   *  - 기본: 대기 큐에 추가, 앞 발화가 끝나면 시작
   *  - interrupt=true: 현재/대기 모두 비우고 즉시 시작
   *  - 음성이 끝나거나(reject 없는 onend) 강제 중단되면 resolve
   */
  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!this.synth) {
      // 환경 미지원: 학습 흐름은 막지 않는다 (조용히 즉시 완료).
      return Promise.resolve();
    }

    const trimmed = text?.trim();
    if (!trimmed) return Promise.resolve();

    if (options.interrupt) {
      this.flushQueue();
      this.synth.cancel();
      this.currentUtterance = null;
    }

    return new Promise<void>((resolve, reject) => {
      this.utteranceQueue.push({ text: trimmed, resolve, reject });
      // 현재 발화가 없으면 즉시 다음 항목 진행.
      if (!this.currentUtterance) {
        this.advanceQueue();
      }
    });
  }

  pause(): void {
    this.synth?.pause();
  }

  resume(): void {
    this.synth?.resume();
  }

  /** 즉시 중단 — 현재 발화/대기 큐 모두 폐기. KS X 9211 6.3.7. */
  stop(): void {
    this.flushQueue();
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  setRate(rate: number): void {
    // SpeechSynthesisUtterance.rate 유효 범위 0.1 ~ 10. 학습용은 0.5 ~ 2.0.
    this.rate = Math.min(2.0, Math.max(0.5, rate));
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  isSpeaking(): boolean {
    return !!this.synth?.speaking;
  }

  /** 한국어(ko-KR 우선) 음성. 환경 미지원 또는 미설치 시 null. */
  getKoreanVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    if (this.cachedKoreanVoice) return this.cachedKoreanVoice;
    const voices = this.synth.getVoices();
    this.cachedKoreanVoice = this.pickKoreanVoice(voices);
    return this.cachedKoreanVoice;
  }

  /** voices 가 비동기로 늦게 로드된 경우 확인하는 헬퍼. */
  hasVoicesLoaded(): boolean {
    return this.voicesLoaded;
  }

  // ── private ────────────────────────────────────────────

  private advanceQueue(): void {
    if (!this.synth) return;
    const next = this.utteranceQueue.shift();
    if (!next) {
      this.currentUtterance = null;
      return;
    }

    const u = new SpeechSynthesisUtterance(next.text);
    u.lang = "ko-KR";
    u.rate = this.rate;
    u.volume = this.volume;
    u.pitch = 1.0;

    const voice = this.getKoreanVoice();
    if (voice) u.voice = voice;

    u.onend = () => {
      this.currentUtterance = null;
      next.resolve();
      this.advanceQueue();
    };

    u.onerror = (ev) => {
      this.currentUtterance = null;
      // 사용자가 stop() 으로 끊은 경우(interrupted/canceled)는 정상 종료로 취급.
      const reason = (ev as SpeechSynthesisErrorEvent).error;
      if (reason === "interrupted" || reason === "canceled") {
        next.resolve();
      } else {
        next.reject(new Error(`SpeechSynthesis error: ${reason}`));
      }
      this.advanceQueue();
    };

    this.currentUtterance = u;
    this.synth.speak(u);
  }

  private flushQueue(): void {
    // 대기 중인 발화들은 모두 정상 종료로 resolve — 호출자(await) 가 멈추지 않게.
    const pending = this.utteranceQueue;
    this.utteranceQueue = [];
    for (const item of pending) item.resolve();
  }

  private pickKoreanVoice(
    voices: SpeechSynthesisVoice[],
  ): SpeechSynthesisVoice | null {
    if (!voices.length) return null;
    // 1순위: ko-KR 정확히
    const exact = voices.find((v) => v.lang === "ko-KR");
    if (exact) return exact;
    // 2순위: ko* 로 시작
    const prefix = voices.find((v) =>
      v.lang.toLowerCase().startsWith(KOREAN_LANG_PREFIX),
    );
    if (prefix) return prefix;
    return null;
  }
}

/**
 * 앱 전역 싱글톤. import 시점에 한 번만 생성.
 * SSR 단계에서는 synth=null 인 빈 매니저로 안전하게 동작한다.
 */
export const speechManager = new WebSpeechManager();
