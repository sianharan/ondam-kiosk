/**
 * OpenAITTSManager — 브라우저에서 /api/tts 를 통해 OpenAI TTS 를 재생한다.
 *
 * 인터페이스는 lib/tts/webSpeech.ts 의 WebSpeechManager 와 동일하게 맞춰
 * lib/tts/fallbackTTS.ts 의 통합 매니저가 자유롭게 둘을 교체할 수 있도록 한다.
 *
 * 흐름
 *   speak(text) → /api/tts POST → mp3 blob → Audio.play()
 *   speak() 는 Promise<void> 를 반환하고 재생이 끝났을 때 resolve.
 *   options.interrupt = true 면 현재 재생 + 대기 큐 모두 폐기 후 즉시 새 발화.
 *
 * 메모리 캐시
 *   동일 (text, voice, speed) 조합은 LRU 메모리 캐시(blob URL)에 보관해 재호출을 피한다.
 *   탭이 살아있는 동안만 유효. 폴백 매니저가 OpenAI 실패 후 같은 텍스트로 다시 시도하는
 *   경우에도 cache hit 으로 재시도 비용을 줄인다.
 */

const TTS_ENDPOINT = "/api/tts";
// 학습 스크립트 + 화면별 버튼/카드 라벨 prefetch 분까지 담아야 하므로 넉넉히.
const CACHE_LIMIT = 64;

export type OpenAIVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

export type SpeakOptions = {
  /** 현재 발화 + 대기 큐를 비우고 즉시 새 음성 시작 */
  interrupt?: boolean;
  /** 한 회 호출에 한해 voice/speed 를 덮어쓰고 싶을 때 */
  voiceOverride?: OpenAIVoice;
  speedOverride?: number;
};

type QueueItem = {
  text: string;
  voice: OpenAIVoice;
  speed: number;
  resolve: () => void;
  reject: (err: unknown) => void;
};

export class OpenAITTSManager {
  private voice: OpenAIVoice = "nova";
  private speed = 1.0;
  private volume = 1.0;

  private audio: HTMLAudioElement | null = null;
  private currentItem: QueueItem | null = null;
  private queue: QueueItem[] = [];

  /** blob URL 캐시: 키 = `${voice}|${speed}|${text}` */
  private cache = new Map<string, string>();

  constructor() {
    if (typeof window === "undefined") return;
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.volume = this.volume;
  }

  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (typeof window === "undefined" || !this.audio) {
      return Promise.resolve();
    }
    const trimmed = text?.trim();
    if (!trimmed) return Promise.resolve();

    const voice = options.voiceOverride ?? this.voice;
    const speed = clamp(options.speedOverride ?? this.speed, 0.5, 2.0);

    if (options.interrupt) {
      this.flushQueue();
      this.haltAudio();
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ text: trimmed, voice, speed, resolve, reject });
      if (!this.currentItem) this.advance();
    });
  }

  /**
   * prefetch — 재생하지 않고 (voice, speed, text) 오디오를 미리 받아 캐시에 채운다.
   * 화면 진입 시 호출해 두면 이후 speak() 가 캐시 적중으로 즉시 재생된다(왕복 지연 흡수).
   * 이미 캐시에 있으면 네트워크 호출 없이 끝난다. 실패는 조용히 무시한다.
   */
  async prefetch(
    text: string,
    voiceOverride?: OpenAIVoice,
    speedOverride?: number,
  ): Promise<void> {
    if (typeof window === "undefined" || !this.audio) return;
    const trimmed = text?.trim();
    if (!trimmed) return;
    const voice = voiceOverride ?? this.voice;
    const speed = clamp(speedOverride ?? this.speed, 0.5, 2.0);
    try {
      await this.getOrFetchAudioUrl(trimmed, voice, speed);
    } catch {
      /* 프리페치 실패는 무시 — 실제 speak 때 재시도/폴백 */
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  resume(): void {
    void this.audio?.play().catch(() => {
      /* 사용자 제스처 필요 등 — 조용히 무시 */
    });
  }

  stop(): void {
    this.flushQueue();
    this.haltAudio();
  }

  setVoice(voice: OpenAIVoice): void {
    this.voice = voice;
  }

  /** rate 와 동일 — 인터페이스 호환을 위한 별명 */
  setRate(rate: number): void {
    this.setSpeed(rate);
  }

  setSpeed(speed: number): void {
    this.speed = clamp(speed, 0.5, 2.0);
  }

  setVolume(volume: number): void {
    this.volume = clamp(volume, 0, 1);
    if (this.audio) this.audio.volume = this.volume;
  }

  isSpeaking(): boolean {
    return !!this.currentItem;
  }

  getVoice(): OpenAIVoice {
    return this.voice;
  }

  // ── 내부 ─────────────────────────────────────────────

  private async advance(): Promise<void> {
    if (!this.audio) return;
    const next = this.queue.shift();
    if (!next) {
      this.currentItem = null;
      return;
    }
    this.currentItem = next;

    try {
      const url = await this.getOrFetchAudioUrl(
        next.text,
        next.voice,
        next.speed,
      );
      // 재생 도중 stop/interrupt 로 currentItem 이 비워졌거나 바뀌었으면 정상 종료.
      if (this.currentItem !== next) {
        next.resolve();
        return;
      }

      await this.playUrl(url);
      // playUrl 종료 시점에 currentItem 이 우리가 아니면 stop 이 끊은 것 — resolve.
      next.resolve();
    } catch (err) {
      // stop/interrupt 가 audio.error 를 유발했다면 currentItem 이 비어 있다.
      if (this.currentItem !== next) {
        next.resolve();
      } else {
        next.reject(err);
      }
    } finally {
      if (this.currentItem === next) this.currentItem = null;
      this.advance();
    }
  }

  private async getOrFetchAudioUrl(
    text: string,
    voice: OpenAIVoice,
    speed: number,
  ): Promise<string> {
    const key = `${voice}|${speed}|${text}`;
    const cached = this.cache.get(key);
    if (cached) {
      // LRU 갱신
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }

    const res = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
    });
    if (!res.ok) {
      let detail = "";
      try {
        const data = await res.json();
        detail =
          (data as { error?: string }).error ?? `HTTP ${res.status}`;
      } catch {
        detail = `HTTP ${res.status}`;
      }
      throw new TTSError(detail, res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    // LRU 삽입 (한도 초과 시 가장 오래된 항목 폐기)
    if (this.cache.size >= CACHE_LIMIT) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldUrl = this.cache.get(oldestKey);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, url);

    return url;
  }

  private playUrl(url: string): Promise<void> {
    const audio = this.audio!;
    return new Promise<void>((resolve, reject) => {
      const onEnded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        // src 가 비어지면 abort 로 종료된다.
        reject(new TTSError("Audio playback error", 0));
      };
      const cleanup = () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
      };
      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("error", onError, { once: true });

      audio.src = url;
      audio.currentTime = 0;
      void audio.play().catch((err) => {
        cleanup();
        // 사용자 제스처 없이 자동재생 차단 등 — TTSError 로 래핑.
        reject(new TTSError(`play() failed: ${err?.message ?? err}`, 0));
      });
    });
  }

  private haltAudio(): void {
    const audio = this.audio;
    if (!audio) return;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      /* ignore */
    }
    this.currentItem = null;
  }

  private flushQueue(): void {
    const pending = this.queue;
    this.queue = [];
    for (const item of pending) item.resolve();
  }
}

export class TTSError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TTSError";
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
