/**
 * POST /api/gpt — GPT-4o-mini 동적 대사 생성 (도담 페르소나)
 *
 * 학습자가 음성으로 발화한 질문 / 요청에 대해 도담 톤의 짧은 응답을 만든다.
 * PROJECT_DESIGN.md 15.3 ① Real Free 단계 + 15.8 학술적 정당화의 핵심 구현.
 *
 * 요청 (JSON)
 *   { userInput: string, context?: string }
 *     - userInput: Whisper 가 전사한 학습자 발화 텍스트
 *     - context  : 현재 학습 단계 식별자 (예: "mode-select", "tutorial-category")
 *
 * 응답
 *   200: { response: string }
 *   400: { error } — userInput 누락
 *   503: { response: 폴백 멘트, error } — API 키 미설정
 *   5xx: { response: 폴백 멘트, error } — OpenAI 오류 (response 는 항상 채워서
 *       클라이언트가 끊김 없이 발화할 수 있도록 함)
 *
 * 페르소나 원칙
 *   1) 존댓말, 비판 금지, 격려 위주
 *   2) 최대 80자 / 1~2문장 (TTS 청취 부담 최소화)
 *   3) 시각 표현 회피 — 위치·모양 대신 "다음 단계", "장바구니" 같은 의미 단위
 *   4) 친근하지만 격식 유지 — 시각장애인 성인 학습자 존중
 *
 * 구현 메모
 *   - 'openai' 패키지 미설치 → /api/tts/route.ts 와 동일하게 fetch 직접 호출.
 *   - 폴백 멘트는 lib/llm/fallback (미래 작업) 대신 본 라우트에 인라인 — Phase 4-AI-A 범위.
 */

import { NextRequest } from "next/server";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `당신은 '도담'입니다. 시각장애인 학습자에게 카페 키오스크 사용법을 가르치는 따뜻한 코치입니다.

원칙:
1. 존댓말 사용
2. 비판하지 않고 격려
3. 짧고 명확하게 (최대 80자, 1~2문장)
4. 시각적 표현(위치, 색깔, 모양) 대신 음성 친화적 안내 (단계, 카테고리 이름, 장바구니 등)
5. 친근하지만 격식 유지

학습자의 질문이나 요청에 도담의 톤으로 응답하세요.`;

const FALLBACK_RESPONSE = "지금은 답하기가 어려워요. 잠시 후 다시 말씀해주세요.";

interface GPTRequest {
  userInput?: string;
  context?: string;
}

export async function POST(request: NextRequest) {
  let body: GPTRequest;
  try {
    body = (await request.json()) as GPTRequest;
  } catch {
    return Response.json(
      { response: FALLBACK_RESPONSE, error: "요청 형식이 잘못되었어요." },
      { status: 400 },
    );
  }

  const userInput = body.userInput?.trim();
  if (!userInput) {
    return Response.json(
      { response: FALLBACK_RESPONSE, error: "userInput 이 비어 있어요." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        response: FALLBACK_RESPONSE,
        error: "OPENAI_API_KEY 가 설정되지 않았어요.",
      },
      { status: 503 },
    );
  }

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  if (body.context && body.context.trim()) {
    messages.push({
      role: "system",
      content: `현재 학습 단계: ${body.context.trim()}`,
    });
  }
  messages.push({ role: "user", content: userInput });

  let openaiRes: Response;
  try {
    openaiRes = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 120,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    return Response.json(
      {
        response: FALLBACK_RESPONSE,
        error: `OpenAI 호출 실패: ${err instanceof Error ? err.message : "네트워크 오류"}`,
      },
      { status: 502 },
    );
  }

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return Response.json(
      { response: FALLBACK_RESPONSE, error: detail || "OpenAI 오류" },
      { status: openaiRes.status },
    );
  }

  let data: ChatCompletionResponse;
  try {
    data = (await openaiRes.json()) as ChatCompletionResponse;
  } catch {
    return Response.json(
      { response: FALLBACK_RESPONSE, error: "응답 파싱 실패" },
      { status: 502 },
    );
  }

  const content =
    data.choices?.[0]?.message?.content?.trim() ?? FALLBACK_RESPONSE;

  return Response.json({ response: content });
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}
