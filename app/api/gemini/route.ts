/**
 * POST /api/gemini — Reflection 답변 분석 (Gemini 2.5 Flash)
 *
 * PROJECT_DESIGN.md 15.3 ③ Reflection 단계의 분석부.
 * Articulation 단계에서 학습자가 음성으로 답한 3개 텍스트를 받아,
 * Gemini 가 학습자의 강점/약점/다음 단계를 짧은 문장 리스트로 돌려준다.
 *
 * 요청 (JSON)
 *   {
 *     articulationAnswers: [string, string, string],
 *     completedScenario?: string,    // 예: "real-free / 아메리카노 따뜻하게 톨"
 *   }
 *
 * 응답
 *   200: { strengths: string[], weaknesses: string[], nextSteps: string[] }
 *   400: 위 형태 + error — 폴백 분석을 항상 함께 채워서 학습 흐름이 멈추지 않게.
 *   503: 폴백 + error — GEMINI_API_KEY 미설정
 *   502/5xx: 폴백 + error — Gemini 오류
 *
 * 폴백 원칙 (PROJECT_DESIGN 15.4)
 *   어떤 실패가 나도 strengths / weaknesses / nextSteps 키는 비어 있지 않게 채운다.
 *   학습자에게는 "끝까지 참여한 점" 자체가 인지적 도제의 가장 큰 성과.
 *
 * 구현 메모
 *   - '@google/generative-ai' 패키지 의존성 회피 — 기존 /api/gpt 패턴처럼 fetch 직접 호출.
 *   - responseMimeType: 'application/json' 으로 Gemini 가 JSON 만 반환하도록 강제.
 *   - 모델은 v1beta 의 gemini-2.5-flash. 무료 한도 (500 RPD) 충분.
 */

import { NextRequest } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const runtime = "nodejs";

interface AnalysisShape {
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
}

const FALLBACK_ANALYSIS: AnalysisShape = {
  strengths: ["오늘 학습에 끝까지 참여하셨어요."],
  weaknesses: [],
  nextSteps: ["다음에 또 함께 천천히 연습해봐요."],
};

interface GeminiRequest {
  articulationAnswers?: unknown;
  completedScenario?: string;
}

export async function POST(request: NextRequest) {
  let body: GeminiRequest;
  try {
    body = (await request.json()) as GeminiRequest;
  } catch {
    return Response.json(
      { ...FALLBACK_ANALYSIS, error: "요청 형식이 잘못되었어요." },
      { status: 400 },
    );
  }

  const answers = normalizeAnswers(body.articulationAnswers);
  if (!answers) {
    return Response.json(
      { ...FALLBACK_ANALYSIS, error: "articulationAnswers 가 비어 있어요." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ...FALLBACK_ANALYSIS, error: "GEMINI_API_KEY 가 설정되지 않았어요." },
      { status: 503 },
    );
  }

  const completedScenario =
    body.completedScenario?.trim() || "Real Free 단계의 자유 주문 시나리오";

  const prompt = buildPrompt(answers, completedScenario);

  let geminiRes: Response;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      }),
    });
  } catch (err) {
    return Response.json(
      {
        ...FALLBACK_ANALYSIS,
        error: `Gemini 호출 실패: ${err instanceof Error ? err.message : "네트워크 오류"}`,
      },
      { status: 502 },
    );
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text();
    return Response.json(
      { ...FALLBACK_ANALYSIS, error: detail || "Gemini 오류" },
      { status: geminiRes.status },
    );
  }

  let raw: GeminiResponse;
  try {
    raw = (await geminiRes.json()) as GeminiResponse;
  } catch {
    return Response.json(
      { ...FALLBACK_ANALYSIS, error: "Gemini 응답 파싱 실패" },
      { status: 502 },
    );
  }

  const text = raw.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    return Response.json(
      { ...FALLBACK_ANALYSIS, error: "Gemini 응답이 비어 있어요." },
      { status: 502 },
    );
  }

  const parsed = safeParseAnalysis(text);
  return Response.json(parsed);
}

/**
 * 학습자 답변을 [answer1, answer2, answer3] 길이 3 튜플로 정규화한다.
 * 빈 문자열은 "답변 없음" 으로 치환해 Gemini 가 자연스럽게 처리할 수 있도록.
 */
function normalizeAnswers(value: unknown): [string, string, string] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const arr = value.slice(0, 3).map((v) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : "(답변 없음)",
  );
  return [arr[0], arr[1], arr[2]] as [string, string, string];
}

function buildPrompt(
  answers: [string, string, string],
  completedScenario: string,
): string {
  return `당신은 시각장애인 학습자의 키오스크 학습 코치 '도담'을 돕는 학습 분석가입니다.
아래 학습자의 음성 답변을 따뜻하고 구체적으로 분석해주세요.

학습자 답변 (Whisper 전사 결과 — 표기/맞춤법은 그대로 존중):
1. 주문한 메뉴: ${answers[0]}
2. 가장 쉬웠던 부분: ${answers[1]}
3. 가장 어려웠던 부분: ${answers[2]}

완료한 학습 시나리오: ${completedScenario}

분석 원칙:
- 격려 위주, 비판 금지 (Collins 2006 "without criticism")
- 시각적 묘사 대신 '카테고리/메뉴/옵션/결제' 같은 단계 이름 사용
- 각 항목 1~2문장, 80자 이내. 시각장애인 학습자가 음성으로 들을 것이므로 한국어 자연스럽게.

JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "nextSteps": ["...", "..."]
}

각 배열은 최소 1개, 최대 2개. weaknesses 는 학습자가 명확히 어려움을 호소하지 않았다면 빈 배열도 허용.`;
}

/**
 * Gemini 응답 텍스트에서 JSON 만 안전하게 뽑아 AnalysisShape 로 정규화한다.
 *
 *   - responseMimeType 지정으로 99% 의 경우 깨끗한 JSON 이 오지만,
 *     모델이 가끔 코드펜스(\`\`\`json ... \`\`\`)를 두르거나 키를 누락할 수 있어
 *     첫 { 부터 마지막 } 까지 잘라 다시 파싱한다.
 *   - 분석 키가 모두 비면 FALLBACK_ANALYSIS 의 해당 키로 보강.
 */
function safeParseAnalysis(text: string): AnalysisShape {
  const cleaned = stripCodeFences(text);
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return FALLBACK_ANALYSIS;
  }
  const slice = cleaned.slice(jsonStart, jsonEnd + 1);
  let obj: unknown;
  try {
    obj = JSON.parse(slice);
  } catch {
    return FALLBACK_ANALYSIS;
  }
  if (typeof obj !== "object" || obj === null) return FALLBACK_ANALYSIS;
  const record = obj as Record<string, unknown>;
  const strengths = toStringArray(record.strengths);
  const weaknesses = toStringArray(record.weaknesses);
  const nextSteps = toStringArray(record.nextSteps);

  return {
    strengths: strengths.length > 0 ? strengths : FALLBACK_ANALYSIS.strengths,
    weaknesses,
    nextSteps: nextSteps.length > 0 ? nextSteps : FALLBACK_ANALYSIS.nextSteps,
  };
}

function stripCodeFences(text: string): string {
  // ```json ... ``` 또는 ``` ... ``` 형태의 코드펜스 제거
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 3); // 안전 상한
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}
