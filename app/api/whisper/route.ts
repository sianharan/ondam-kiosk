/**
 * POST /api/whisper — OpenAI Whisper 음성 전사 프록시
 *
 * 클라이언트의 MediaRecorder Blob 을 multipart/form-data 로 받아
 * OpenAI Whisper(whisper-1) 에 한국어 우선으로 전사 요청한다.
 * 키는 서버사이드에서만 사용 (OPENAI_API_KEY).
 *
 * 요청: multipart/form-data
 *   - audio: File (webm/opus 등 브라우저 MediaRecorder 출력)
 *
 * 응답
 *   200: { text: string }
 *   400: { error } — 오디오 누락 / 형식 오류
 *   503: { error } — API 키 미설정 → 클라이언트는 Web Speech 폴백 시도
 *   502/5xx: { error } — OpenAI 오류
 *
 * 구현 메모
 *   - 기존 /api/tts/route.ts 패턴(직접 fetch 호출)을 따라 'openai' 패키지 의존성 회피.
 *   - 전사 결과 텍스트는 의도 분류기(lib/llm/intentDetection.ts) 또는 GPT 라우트로 전달된다.
 *   - 음성은 절대 저장하지 않는다 (PROJECT_DESIGN.md 15.7 개인정보 고지).
 */

import { NextRequest } from "next/server";

const OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // OpenAI 한도 25MB

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "OPENAI_API_KEY 가 설정되지 않았어요. 폴백 음성 인식으로 진행해주세요.",
    );
  }

  let inbound: FormData;
  try {
    inbound = await request.formData();
  } catch {
    return jsonError(400, "요청 형식이 잘못되었어요 (multipart 파싱 실패).");
  }

  // FormDataEntryValue = File | string. 문자열 케이스를 먼저 배제해야 instanceof 가능.
  const audio = inbound.get("audio");
  if (audio === null || typeof audio === "string") {
    return jsonError(400, "audio 파일이 비어 있어요.");
  }
  if (audio.size === 0) {
    return jsonError(400, "녹음된 오디오가 비어 있어요.");
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError(400, "오디오가 너무 커요 (최대 25MB).");
  }

  // OpenAI 로 전달할 FormData 재구성.
  // multipart 경계와 헤더는 fetch 가 자동으로 설정한다 — Content-Type 직접 지정 금지.
  const outbound = new FormData();
  const fileName =
    "name" in audio && typeof audio.name === "string"
      ? audio.name
      : "recording.webm";
  outbound.append("file", audio, fileName);
  outbound.append("model", "whisper-1");
  outbound.append("language", "ko");
  outbound.append("response_format", "json");

  let openaiRes: Response;
  try {
    openaiRes = await fetch(OPENAI_WHISPER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: outbound,
    });
  } catch (err) {
    return jsonError(
      502,
      `OpenAI 호출 실패: ${err instanceof Error ? err.message : "네트워크 오류"}`,
    );
  }

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return jsonError(openaiRes.status, detail || "OpenAI Whisper 오류");
  }

  let data: { text?: string } = {};
  try {
    data = (await openaiRes.json()) as { text?: string };
  } catch {
    return jsonError(502, "Whisper 응답 본문이 잘못되었어요.");
  }

  return Response.json({ text: (data.text ?? "").trim() });
}

function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
