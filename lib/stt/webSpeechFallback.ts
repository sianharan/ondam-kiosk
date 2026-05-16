"use client";

/**
 * Web Speech 폴백 — Whisper API 실패 시 2차 인식 경로
 *
 * 별도 마이크 세션을 새로 열어 SpeechRecognition(webkit 포함) 으로 짧게 인식한다.
 * 정확도는 Whisper 보다 낮지만 (특히 한국어), 네트워크 실패 / API 한도 초과 시에도
 * 학습자가 다시 말하지 않고 도담의 응답을 받을 수 있도록 한다.
 *
 * 동작 규칙
 *   - Chrome / Edge / Safari iOS 일부에서만 지원. Firefox 미지원.
 *   - 한국어(ko-KR), 단일 인식 (continuous=false), 최종 결과만 반환.
 *   - 호출 측이 사용자에게 "한 번 더 말씀해주세요" 라고 안내한 뒤 즉시 호출하는 흐름이 안전.
 *
 * 참고
 *   - SpeechRecognition 은 Whisper 와 달리 Blob 을 받지 않는다 — 실시간 마이크만 사용.
 *   - 따라서 Whisper 가 받은 녹음 Blob 을 재활용할 수 없고, 새 발화가 필요하다.
 */

interface MinimalSpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isWebSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * 새 마이크 세션으로 1회성 음성 인식 수행.
 *   - timeoutMs(기본 8초) 안에 결과 없으면 abort 후 빈 문자열 반환.
 *   - 인식 결과가 빈 문자열이어도 reject 가 아닌 resolve('') — 호출 측이 안내 멘트 분기.
 *   - 환경 미지원 시 즉시 throw.
 */
export async function recognizeWithWebSpeech(
  options: { timeoutMs?: number; lang?: string } = {},
): Promise<string> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    throw new Error("이 브라우저는 Web Speech 인식을 지원하지 않아요.");
  }

  const recognition = new Ctor();
  recognition.lang = options.lang ?? "ko-KR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  return new Promise<string>((resolve, reject) => {
    let resolved = false;
    const settle = (text: string) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      resolve(text);
    };
    const fail = (err: Error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      reject(err);
    };

    const timer = setTimeout(() => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      settle("");
    }, options.timeoutMs ?? 8_000);

    recognition.onresult = (event) => {
      const first = event.results[0]?.[0];
      const text = first?.transcript ?? "";
      settle(text.trim());
    };
    recognition.onerror = (event) => {
      // no-speech / aborted 는 사용자에게 그냥 빈 결과로 돌려 줘 안내 분기 가능하게.
      if (event.error === "no-speech" || event.error === "aborted") {
        settle("");
        return;
      }
      fail(new Error(`Web Speech 오류: ${event.error ?? "unknown"}`));
    };
    recognition.onend = () => {
      // result 없이 end 면 빈 결과로 정리.
      settle("");
    };

    try {
      recognition.start();
    } catch (err) {
      fail(err instanceof Error ? err : new Error("Web Speech 시작 실패"));
    }
  });
}
