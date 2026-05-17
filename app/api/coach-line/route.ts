/**
 * POST /api/coach-line — Articulation 후속 코칭 (GPT-4o-mini)
 *
 * PROJECT_DESIGN.md 15.3 ② Step 3 / Phase 6 학습자 답변 흐름의 마지막 단계.
 *
 *   녹음 → /api/whisper → (저장) → /api/coach-line → 도담 후속 음성
 *
 * 학습자가 음성으로 답한 한 문항을 받아, 도담 톤으로 1~2문장 따뜻한 후속 멘트를
 * 생성한다. Articulation 의 3문항 각각에 대해 호출된다.
 *
 * 요청 (JSON)
 *   {
 *     answer:        string,      // Whisper 전사 결과
 *     questionIndex: 0 | 1 | 2,   // 어느 질문에 대한 답인지
 *     questionLabel: string,      // 화면에 보였던 짧은 라벨 (프롬프트 보조)
 *   }
 *
 * 응답
 *   200: { line: string }
 *   400/503/5xx: { line: 폴백 멘트, error } — 학습 흐름이 끊기지 않도록 항상 line 채움
 *
 * 폴백 원칙 (PROJECT_DESIGN 15.4)
 *   GPT 가 어떻게 실패해도 학습자에게 들려줄 line 은 비어 있지 않게.
 *   질문 인덱스별 정적 격려 멘트로 자연스럽게 메운다.
 *
 * 구현 메모
 *   - 'openai' 패키지 의존성 회피 — /api/gpt 와 동일하게 fetch 직접 호출.
 *   - 응답은 항상 평문 (JSON 강제 X) — TTS 가 그대로 발화.
 */

import { NextRequest } from "next/server";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `당신은 '도담'입니다. 시각장애인 학습자에게 카페 키오스크 사용법을 가르치는 따뜻한 코치입니다.

지금은 Articulation(명료화) 단계로, 학습자가 방금 한 주문을 음성으로 회상하고 있습니다.

원칙:
1. 존댓말, 격려 위주, 비판 금지 (Collins 2006 "without criticism")
2. 1~2문장, 80자 이내 (TTS 청취 부담 최소화)
3. 시각 표현 회피 — '카테고리/메뉴/옵션/결제' 같은 단계 이름 사용
4. 학습자 답변을 짧게 받아준 뒤 한 마디 격려로 마무리
5. 답변이 "(답변 없음)" 이면 부드럽게 괜찮다고 안심시키기`;

const FALLBACK_LINES: readonly string[] = [
  "잘 떠올려 주셨어요. 다음 질문으로 함께 가볼게요.",
  "솔직하게 말씀해주셔서 좋아요. 다음 질문으로 넘어가요.",
  "끝까지 답변해주셔서 고마워요. 잠시 함께 정리해볼게요.",
] as const;

const MAX_LINE_CHARS = 120;

interface CoachLineRequest {
  answer?: unknown;
  questionIndex?: unknown;
  questionLabel?: unknown;
}

export async function POST(request: NextRequest) {
  let body: CoachLineRequest;
  try {
    body = (await request.json()) as CoachLineRequest;
  } catch {
    return Response.json(
      { line: FALLBACK_LINES[0], error: "요청 형식이 잘못되었어요." },
      { status: 400 },
    );
  }

  const questionIndex = normalizeIndex(body.questionIndex);
  const answer =
    typeof body.answer === "string" && body.answer.trim().length > 0
      ? body.answer.trim()
      : "(답변 없음)";
  const questionLabel =
    typeof body.questionLabel === "string" && body.questionLabel.trim().length > 0
      ? body.questionLabel.trim()
      : "이번 질문";

  const fallbackLine = FALLBACK_LINES[questionIndex];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { line: fallbackLine, error: "OPENAI_API_KEY 가 설정되지 않았어요." },
      { status: 503 },
    );
  }

  const userPrompt = `질문: ${questionLabel}
학습자 답변(Whisper 전사): "${answer}"

이 답변을 받아주는 짧은 후속 코칭 1~2문장. 답변을 구체적으로 짚어 격려하고, 다음 질문으로 자연스럽게 넘어가는 톤.`;

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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    return Response.json(
      {
        line: fallbackLine,
        error: `OpenAI 호출 실패: ${err instanceof Error ? err.message : "네트워크 오류"}`,
      },
      { status: 502 },
    );
  }

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return Response.json(
      { line: fallbackLine, error: detail || "OpenAI 오류" },
      { status: openaiRes.status },
    );
  }

  let data: ChatCompletionResponse;
  try {
    data = (await openaiRes.json()) as ChatCompletionResponse;
  } catch {
    return Response.json(
      { line: fallbackLine, error: "응답 파싱 실패" },
      { status: 502 },
    );
  }

  const raw = data.choices?.[0]?.message?.content?.trim();
  const line = raw && raw.length > 0 ? clampLine(raw) : fallbackLine;

  return Response.json({ line });
}

function normalizeIndex(value: unknown): 0 | 1 | 2 {
  if (value === 0 || value === 1 || value === 2) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (n === 0 || n === 1 || n === 2) return n as 0 | 1 | 2;
  }
  return 0;
}

/**
 * GPT 가 가끔 따옴표·괄호로 감싸거나 길게 답할 수 있어
 * 한 문장 단위로 안전하게 잘라낸다. TTS 청취 부담 최소화.
 */
function clampLine(text: string): string {
  const cleaned = text
    .replace(/^["'`「『\s]+/, "")
    .replace(/["'`」』\s]+$/, "")
    .trim();
  if (cleaned.length <= MAX_LINE_CHARS) return cleaned;
  // 마침표/물음표/느낌표 근처에서 자르기 — 없으면 그냥 글자 수로 컷.
  const cut = cleaned.slice(0, MAX_LINE_CHARS);
  const lastStop = Math.max(
    cut.lastIndexOf("."),
    cut.lastIndexOf("?"),
    cut.lastIndexOf("!"),
    cut.lastIndexOf("요"),
  );
  return lastStop > 40 ? cut.slice(0, lastStop + 1) : cut;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}
