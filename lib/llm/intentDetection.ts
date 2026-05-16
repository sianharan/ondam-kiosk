/**
 * intentDetection — Whisper 전사 텍스트 → 의도 분류
 *
 * 학습자 발화의 의도를 7개 카테고리로 분류한다. 단순 의도(인사/긍정/부정)는
 * GPT 호출 없이 정적 응답으로 처리하여 응답 지연·API 비용을 줄인다 (15.6 참고).
 * 그 외 의도는 호출 측이 /api/gpt 로 위임한다.
 *
 * 매칭 규칙
 *   - 첫 번째로 매칭된 규칙의 의도를 반환 (위에서 아래 우선순위)
 *   - 모두 미매칭이면 'unknown' → GPT 호출
 *   - 공백 / 빈 문자열 → 'unknown'
 *
 * 메모
 *   - 학습 단계 context 를 받지만 현재는 응답 분기에 사용하지 않는다.
 *     Phase 4-AI-B 에서 context 별 맞춤 응답으로 확장.
 *   - KS X 9211 의 "다시 듣기"·"도움" 명령은 본 모듈을 거치지 않고 별도 버튼에서 처리.
 *     음성으로 "도와줘" 라고 발화한 경우는 help_request 로 잡아 GPT 가 응답.
 */

export type Intent =
  | "help_request"
  | "ask_categories"
  | "ask_explanation"
  | "request_restart"
  | "affirmative"
  | "negative"
  | "greeting"
  | "unknown";

interface IntentRule {
  intent: Intent;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "help_request",
    patterns: [
      /도와\s*줘|도와\s*주세요|도움|막혔|어떻게\s*해|모르겠/i,
    ],
  },
  {
    intent: "ask_categories",
    patterns: [/카테고리|메뉴\s*종류|뭐\s*있어|뭐가\s*있/i],
  },
  {
    intent: "ask_explanation",
    patterns: [/이게\s*뭐|설명해|뭐예요|뭐인가|뭐죠/i],
  },
  {
    intent: "request_restart",
    patterns: [/처음|다시\s*해|리셋|초기화/i],
  },
  {
    intent: "affirmative",
    patterns: [/^응$|^네$|^그래$|^좋아|^좋아요|^맞아요?$/i],
  },
  {
    intent: "negative",
    patterns: [/^아니|아니요|취소|싫어/i],
  },
  {
    intent: "greeting",
    patterns: [/안녕|하이|하잉|반가|도담아/i],
  },
];

export function detectIntent(text: string): Intent {
  const trimmed = text.trim();
  if (!trimmed) return "unknown";

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        return rule.intent;
      }
    }
  }
  return "unknown";
}

/**
 * 의도별 정적 응답 — 단순 의도는 GPT 호출 없이 즉시 답한다 (지연·비용 최소화).
 *
 *   - null 반환 → 호출 측이 /api/gpt 로 위임
 *   - context 는 학습 단계 식별자 (mode-select / tutorial / practice / challenge
 *     / real-guided / real-free). 인사 응답에 맞춤 멘트를 부여하여 학습자가
 *     자신의 현재 단계를 청각적으로 재확인하도록 한다.
 *
 * 단계별 인사 멘트는 Collins 6단계 교수법의 학습자 위치 단서를 반영.
 */
export function getIntentResponse(
  intent: Intent,
  context?: string,
): string | null {
  switch (intent) {
    case "affirmative":
      return "네, 알겠어요.";
    case "negative":
      return "괜찮아요. 다른 걸 해볼까요?";
    case "greeting":
      return GREETING_BY_CONTEXT[context ?? ""] ?? GREETING_DEFAULT;
    default:
      return null;
  }
}

const GREETING_DEFAULT = "안녕하세요! 무엇을 도와드릴까요?";

const GREETING_BY_CONTEXT: Record<string, string> = {
  "mode-select":
    "안녕하세요! 어떤 키오스크로 연습할지 골라볼까요?",
  tutorial:
    "안녕하세요! 따라보기 단계예요. 도담이 먼저 시연해드릴게요.",
  practice:
    "안녕하세요! 이번엔 직접 해보는 단계예요. 천천히 골라도 괜찮아요.",
  challenge:
    "안녕하세요! 도움이 줄어든 단계예요. 막히면 힌트 버튼을 눌러주세요.",
  "real-guided":
    "안녕하세요! 실전 같은 단계예요. 도담은 호출하실 때만 답할게요.",
  "real-free":
    "안녕하세요! 자유롭게 주문하는 단계예요. 원하시는 메뉴를 골라보세요.",
};
