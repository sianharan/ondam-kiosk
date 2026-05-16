/**
 * POST /api/tts — OpenAI Text-to-Speech 프록시
 *
 * 클라이언트에서 OPENAI_API_KEY 를 노출하지 않기 위해 서버사이드 라우트로 감싼다.
 * 음성은 mp3 스트림으로 반환되어 <audio> 또는 blob URL 로 즉시 재생 가능.
 *
 * 요청 본문 (JSON)
 *   { text: string, voice?: "nova" | "shimmer" | "echo" | ..., speed?: number }
 *
 * 응답
 *   200: audio/mpeg 바이너리 (mp3)
 *   400: 잘못된 요청 (text 누락 등)
 *   429/5xx: OpenAI 측 오류 — 본문에 사유 전달, 클라이언트는 Web Speech 로 폴백
 *
 * 캐싱
 *   - 동일 문장은 학습 흐름에서 반복 발화되므로 60분 캐시.
 *   - voice/speed 가 다르면 별개 캐시 키 (URL 쿼리/본문 해시 기반은 미래 작업).
 *   - 현재는 단순 Cache-Control 만 부여 — 같은 텍스트라도 클라이언트 fetch 캐시가
 *     URL 동일 시점에만 적중. 본 라우트는 POST 라 브라우저 HTTP 캐시는 사실상
 *     동작하지 않으므로, 클라이언트 측 메모리 LRU 캐시를 openaiTTS.ts 에서 보강.
 */

import { NextRequest } from "next/server";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const ALLOWED_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;
type AllowedVoice = (typeof ALLOWED_VOICES)[number];

interface TTSRequest {
  text?: string;
  voice?: string;
  speed?: number;
  /** 'tts-1' (빠름·저렴) | 'tts-1-hd' (고품질) */
  model?: "tts-1" | "tts-1-hd";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "OPENAI_API_KEY 가 설정되지 않았어요. 폴백 음성으로 안내해드릴게요.",
    );
  }

  let body: TTSRequest;
  try {
    body = (await request.json()) as TTSRequest;
  } catch {
    return jsonError(400, "요청 형식이 잘못되었어요 (JSON 파싱 실패).");
  }

  const text = body.text?.trim();
  if (!text) {
    return jsonError(400, "text 가 비어 있어요.");
  }
  if (text.length > 4000) {
    // OpenAI 한도 4096 — 약간 여유.
    return jsonError(400, "텍스트가 너무 길어요. 4000자 이내로 줄여주세요.");
  }

  const voice: AllowedVoice = ALLOWED_VOICES.includes(
    body.voice as AllowedVoice,
  )
    ? (body.voice as AllowedVoice)
    : "nova";

  // speed: OpenAI 유효 범위 0.25 ~ 4.0. 학습용은 0.5 ~ 2.0.
  const speed = clamp(typeof body.speed === "number" ? body.speed : 1.0, 0.5, 2.0);

  const model = body.model === "tts-1-hd" ? "tts-1-hd" : "tts-1";

  let openaiRes: Response;
  try {
    openaiRes = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        speed,
        response_format: "mp3",
      }),
    });
  } catch (err) {
    return jsonError(
      502,
      `OpenAI 호출 실패: ${err instanceof Error ? err.message : "네트워크 오류"}`,
    );
  }

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return jsonError(openaiRes.status, detail || "OpenAI TTS 오류");
  }

  if (!openaiRes.body) {
    return jsonError(502, "OpenAI 응답 본문이 비어 있어요.");
  }

  return new Response(openaiRes.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      // 동일 문장 반복 발화가 잦은 학습 흐름이라 1시간 캐시.
      // POST 라 브라우저는 거의 안 쓰지만, 프록시/엣지 캐시에는 유효.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
