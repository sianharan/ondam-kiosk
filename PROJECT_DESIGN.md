# PROJECT_DESIGN.md

> **프로젝트명**: 온담(溫談) 카페 — 시각장애인 키오스크 학습 환경
> **연구 토대**: 상황학습이론(Lave & Wenger, 1991) + 인지적 도제이론(Collins, 2006)
> **표준 기반**: KS X 9211:2025 무인정보단말기 접근성 지침
> **개발 기간**: 2주 (학기 과제)
> **버전**: 2.1 (Collins 4차원 + 멀티 LLM 통합)

---

## 목차

1. 프로젝트 개요
2. 학술적 토대
3. 시뮬레이터 정체성과 설계 원칙
4. 교수설계 — Collins 4차원
5. 화면 흐름 — 10단계
6. KS X 9211:2025 충족 매트릭스
7. 데이터 모델
8. 기술 스택과 아키텍처
9. 폴더 구조
10. Phase별 개발 계획 (2주)
11. Claude Code 워크플로우 프롬프트
12. KS X 9211:2025 체크리스트
13. 검토자·참고문헌
14. 향후 확장 가능성
**15. AI API 통합 — GPT × Gemini 역할 분담** ⭐ NEW

---

## 1. 프로젝트 개요

### 1.1 핵심 정의

본 프로젝트는 **단순한 키오스크 시뮬레이터가 아니다.**

> **상황학습이론에 기반한, 시각장애인이 키오스크 사용 역량을 길러내는 학습 환경(Learning Environment)이다.**

키오스크는 학습의 **대상**이고, 시뮬레이터는 **학습 환경**이다. 안에는 학습자 + 학습 콘텐츠(키오스크) + 코치(AI) + 공동체 맥락(카페 환경)이 모두 포함된다.

### 1.2 핵심 목표

```
① 시각장애인 학습자가 다양한 실제 매장의 키오스크에
  적응 가능한 메타 전략(meta-strategy)을 체화
② Collins의 인지적 도제 6단계를 완전히 구현
③ "비판 없는 안전한 학습 공간" 제공으로
  PPT Level 1 인터뷰에서 드러난 "낙인 효과" 해소
```

### 1.3 본 연구의 학술적 기여

> **"본 연구는 Collins(2006)가 제시한 컴퓨터 기반 인지적 도제의 사회심리적 강점인 낙인 효과 해소(Without criticism)를 시각장애인 키오스크 교육에 적용하여, 시각장애인이 사회적 압박 없이 안전한 가상 환경에서 디지털 시민으로서의 정체성을 회복할 수 있는 학습 환경을 구현하였다."**

---

## 2. 학술적 토대

### 2.1 상황학습이론 (Lave & Wenger, 1991)

학습은 추상적 지식 전달이 아니라 **실제 상황 속의 참여**에서 일어난다.

핵심 개념:
- **합법적 주변적 참여(LPP)**: 초보자는 공동체의 주변에서 점차 중심으로 이동
- **실행 공동체(Community of Practice)**: 본 연구에서는 "당당하게 키오스크로 주문하는 일반 소비자" 공동체
- **상황 인지(Situated Cognition)**: 카페 소음, 대기 압박 등 맥락 변수도 학습 환경의 일부

### 2.2 인지적 도제이론 (Collins, 2006) — 본 연구의 핵심 골격

Collins는 학습 환경 설계를 **4차원**으로 구조화:

| 차원 | 의미 | 본 연구 적용 |
|------|------|------------|
| **Content** | 무엇을 가르치나 | 키오스크 표준 절차, 시각장애인 활용 노하우, 자가 모니터링, 적응 전략 |
| **Method** | 어떻게 가르치나 | 6단계 (Modeling → Coaching → Scaffolding → Articulation → Reflection → Exploration) |
| **Sequencing** | 어떤 순서로 | 복잡성 증가, 다양성 증가, 전역 → 국소 |
| **Sociology** | 어떤 사회적 맥락에서 | 상황학습, 실행 공동체, 내재 동기, **낙인 효과 해소** |

### 2.3 6가지 교수법 (Method)

| # | 교수법 | 정의 |
|---|--------|------|
| 1 | **Modeling (모델링)** | 전문가가 과제 수행 및 사고 과정을 외부로 소리 내어 시연 |
| 2 | **Coaching (코칭)** | 학습자 수행을 관찰하고 힌트·단서·피드백 제공 |
| 3 | **Scaffolding & Fading (스캐폴딩)** | 지지대를 일시 제공하고 실력 향상에 따라 점진적 제거 |
| 4 | **Articulation (명료화)** | 학습자가 자신의 지식·추론을 말로 명확하게 표현하도록 요구 |
| 5 | **Reflection (성찰)** | 자기 수행을 전문가·동료와 비교하여 메타인지적으로 분석 |
| 6 | **Exploration (탐색)** | 가이드 없이 학습자가 주도적으로 문제 정의·해결 |

### 2.4 컴퓨터 기반 인지적 도제의 3대 강점

Collins가 직접 강조한 가치:
1. **대규모(Large scale) 실현** — AI로 일대일 도제 확장
2. **목표 기반 시나리오** — 시뮬레이터는 단순 교재가 아닌 **자원 세트**
3. ⭐ **낙인 효과 해소** — 비판 없는(without criticism) 안전한 개별화 스캐폴딩

---

## 3. 시뮬레이터 정체성과 설계 원칙

### 3.1 정체성: 브랜드 중립 + 표준 충실

본 시뮬레이터는 **특정 매장(스타벅스, 메가커피 등)의 키오스크를 모사하지 않는다.**

| 원칙 | 구체적 적용 |
|------|----------|
| **표준 충실성** | KS X 9211:2025 모든 조항 보수적 적용 |
| **브랜드 중립** | 어느 브랜드도 닮지 않은 일반화된 디자인 |
| **명확성** | 화려한 디자인 X, 정보 위계 명확 |
| **공통 패턴 강조** | 카테고리 → 품목 → 옵션 → 결제의 보편 흐름 |
| **메타 학습** | 학습자가 "왜 이렇게 배치되는가"를 이해하게 함 |

### 3.2 카페 정체성

- **카페명**: 온담(溫談) 카페 — "따뜻한 이야기가 있는 곳"
- **AI 코치명**: 도담 — "어린아이가 별 탈 없이 잘 자라는 모양"의 순우리말
- **키오스크 유형**: 카페 카운터형 스탠드 키오스크 (한국 일반형)

### 3.3 디자인 원칙

```
[색상 — KS X 9211:2025 명도 대비 4.5:1 충족]
  · 베이스: 흰색 #FFFFFF + 진남색 #1A2A4A
  · 강조: 따뜻한 코랄 #E07856 (1색만)
  · 카테고리별 색상 블록:
    - 커피: 진한 갈색
    - 에이드: 청록
    - 티: 연두
    - 디저트: 베이지

[타이포그래피]
  · 폰트: Pretendard 또는 Noto Sans KR (한글 가독성)
  · 본문 크기: KS X 9211 7.25mm 이상 환산 → 화면상 약 24px 이상
  · 명도 대비: WCAG AAA (7:1) 기본 유지

[이미지]
  · 실사 사진 X (저작권 + 본 연구 정체성)
  · 단순 SVG 아이콘 + 카테고리 색상 블록
  · 메뉴명 텍스트가 시각적 주역

[컴포넌트]
  · shadcn/ui 기반 (Radix UI ARIA 자동)
  · 모든 인터랙티브 요소에 voiceLabel 부착
```

### 3.4 참고 자료 (브랜드 키오스크 X)

| 참고 대상 | 이유 |
|---------|------|
| KS X 9211:2025 | 정량 기준 절대 기준 |
| 정부24 무인민원발급기 | 한국 공공 접근성 모범 |
| 서울교통공사 발권기 | 시각장애인 모드 내장 사례 |
| NIA 2026 가이드 부속서 권장 시안 | 국내 표준 권장 패턴 |
| GOV.UK Design System | 국제 공공 접근성 최고 수준 |
| USDS Web Design System | WCAG AAA 기준 |

---

## 4. 교수설계 — Collins 4차원

### 4.1 Content (내용) — 무엇을 가르치는가

| 지식 유형 | 본 연구 내용 |
|---------|---------|
| **Domain Knowledge** (영역 지식) | 키오스크 표준 주문 절차 (카테고리 → 품목 → 옵션 → 결제) |
| **Heuristic** (휴리스틱) | 시각장애인이 키오스크를 효율적으로 다루는 노하우 (예: "단일 터치는 안내, 더블탭은 실행") |
| **Control** (제어 전략) | 자가 모니터링 — "지금 어느 단계인가?", "되돌릴 수 있나?" |
| **Learning** (학습 전략) | 새로운 키오스크 만났을 때의 적응 전략 — "카테고리 위치 먼저 음성으로 탐색" |

### 4.2 Method (방법) — 6단계 학습 흐름

각 단계의 핵심 특성:

| # | Collins 단계 | 시뮬레이터 모드 | 카페 소음 | AI 도움 | 학습자 자율성 |
|---|------------|---------------|---------|--------|----------|
| 1 | **Modeling** | Tutorial | 0dB | 100% | 0% |
| 2 | **Coaching** | Practice | 20~30dB | 80% | 20% |
| 3 | **Scaffolding** | Challenge | 40~50dB | 40% | 60% |
| 4 | **(Fading)** | Real Guided | 60dB | 10% | 90% |
| 5 | **Exploration** | Real Free | 60dB | 호출만 | 100% |
| 6 | **Articulation** | (모드 후) | — | 질문만 | — |
| 7 | **Reflection** | (모드 후) | — | 비교 안내 | — |

```
AI 도움  ████████████ → █████████ → ████ → █ → 호출만 → 질문 → 분석
학습자   ░░          → ░░░░       → ░░░░░░░░ → ░░░░░░░░░░░ → ████████████ → ████████ → ████████
        Tutorial    Practice     Challenge    Real Guided   Real Free   Articul.  Reflect.

        관찰      →   따라하기   →   혼자하기   →   실전적응   →   자기결정   →   회고
```

### 4.3 Sequencing (계열화) — 어떤 순서로

Collins의 3원칙 적용:

**① 복잡성 증가 (Complexity)**
- 카페 소음: 0dB → 30dB → 50dB → 60dB
- 결제 수단: 1종 → 2종 → 3종 → 무작위
- 시간 압박: 없음 → 약함 → 보통 → 실전

**② 다양성 증가 (Diversity)**
- 결제 수단 다양화 (카드/페이/쿠폰)
- Real Free에서 학습자가 자유롭게 시나리오 정의

**③ 전역 → 국소 (Global before Local)** ⭐ 시각장애인 핵심
- **2단계 공간 지도**에서 키오스크 전체 구조 먼저 음성 안내
- "이 키오스크는 화면이 가로 2열, 세로 4행으로 나뉘어 있어요. 좌측 상단부터…"
- 그 다음에 세부 조작 학습

### 4.4 Sociology (사회학) — 어떤 사회적 맥락에서

| 요소 | 본 연구 적용 |
|------|---------|
| **Situated Learning** | 카페 소음 레이어 (Howler.js로 모드별 BGM 전환) |
| **Community of Practice** | "당당한 일반 소비자" 정체성 부여, 도담의 친근한 말투 |
| **Intrinsic Motivation** | 외재 보상 X, "스스로 주문 완수" 자체가 보상 |
| **낙인 효과 해소** ⭐ | "비판 없는 코치", 실수 무한 허용, 뒷사람 시선 없음 |

본 연구의 가장 강력한 학술 기여는 **낙인 효과 해소**에 있다.

PPT Level 1 인터뷰의 핵심 발화:
- "뒤에 기다리는 사람들의 시선이 느껴져요. 미안함이 큽니다." → 낙인 효과
- "소비자로서 권리가 없다 느껴요." → 낙인 효과

→ AI 시뮬레이터 = 낙인 효과 해소 장치

---

## 5. 화면 흐름 — 10단계

### 5.1 전체 흐름

```
1. 환영 (Welcome)
2. 공간 지도 (Spatial Map) — 전역 → 국소 원칙
3. Tutorial (Modeling)
4. Practice (Coaching)
5. Challenge (Scaffolding & Fading)
6. Real Guided (Fading 완성)
7. Real Free (Exploration)
8. Articulation (명료화 — Bronze)
9. Reflection (성찰 — Silver)
10. 완료 (Completion)
```

### 5.2 각 단계 상세

#### 1. 환영
- "안녕하세요, 도담입니다. 온담 카페에 오신 걸 환영해요."
- 학습자 선호 음성 속도 설정 (1.0 / 1.25 / 1.5x)
- 시작 버튼 더블탭

#### 2. 공간 지도 ⭐ 시각장애인 핵심
- 키오스크 전체 구조 음성 안내
- "이 키오스크는 가슴 높이 화면이고, 화면은 상단 카테고리, 중앙 메뉴, 하단 장바구니로 나뉘어요"
- "결제 카드 투입구는 화면 아래쪽 오른쪽에 있어요"
- 학습자가 "이해했어요" 더블탭 시 진행

#### 3. Tutorial (Modeling)
- 도담이 아메리카노 따뜻하게 주문 과정을 **사고 과정까지 음성으로 외현화**
- 카페 소음: 0dB (조용)
- 결제: 카드만
- 학습자 입력: 0% (관찰만)

```
도담의 사고 외현화 예시:
"음... 먼저 카테고리를 골라야 해요.
 아메리카노는 커피니까, 화면 왼쪽 위 '커피'를 더블탭할게요.
 [띵, 띵]
 좋아요, 커피 메뉴로 들어왔어요. 보통 아메리카노는 맨 위에 있어요..."
```

#### 4. Practice (Coaching)
- 학습자가 직접 수행, 도담은 즉시 피드백
- 카페 소음: 20~30dB (약함)
- 결제: 카드 + 모바일 페이 (학습자 선택)
- AI 도움: 80% (단계마다 안내)

#### 5. Challenge (Scaffolding & Fading)
- 도담의 안내가 점진적으로 줄어듦
- 카페 소음: 40~50dB
- 결제: 카드 + 페이 + 쿠폰 (다양화)
- AI 도움: 40% (학습자가 막힐 때만)

#### 6. Real Guided (Fading 완성)
- 정해진 시나리오, AI 도움 최소
- 카페 소음: 60dB (실세계)
- 결제: 3종 + 무작위 등장
- AI 도움: 10% (호출 시에만)

#### 7. Real Free (Exploration) ⭐
- **학습자가 자유롭게 메뉴 선택**
- 음성: "오늘은 어떤 음료를 드시고 싶으세요? 직접 골라보세요"
- 시나리오 정의권이 학습자에게 이양
- AI 도움: 호출 시에만

#### 8. Articulation (명료화 — Bronze)
4개 질문 음성+텍스트, 학습자 답변은 받지 않음 (회상 자체가 학습)

```
Q1. 방금 어떤 음료를 주문하셨나요? (30초 회상)
Q2. 카테고리는 어떻게 찾으셨어요?
Q3. 옵션 선택할 때 어디가 가장 어려웠나요?
Q4. 오늘 주문, 어떠셨나요?
```

#### 9. Reflection (성찰 — Silver)
단계별 시간 비교 + 7개 피드백 템플릿 자동 선택

```
┌──────────────────────────────────┐
│  📊 오늘 주문 결과                │
│                                  │
│  내 시간: 4분 23초                │
│  표준 시간: 2분 30초              │
│                                  │
│  단계별 비교:                     │
│   카테고리 선택  ▓▓▓░░  +15초    │
│   메뉴 선택    ▓▓▓▓▓  +40초    │  ← 어려웠어요!
│   옵션 선택    ▓░░░░  +5초     │
│   결제        ▓▓▓▓░  +53초    │
│                                  │
│  💡 다음 연습 팁:                 │
│  "메뉴 선택 단계에서 천천히       │
│   품목 이름을 들어보세요."        │
└──────────────────────────────────┘

+ 동일 내용 음성 안내
```

#### 10. 완료
- "오늘 한 시간 동안 정말 잘 해내셨어요"
- 학습 로그 저장
- 다시 시작 / 종료 버튼

---

## 6. KS X 9211:2025 충족 매트릭스

본 시뮬레이터가 충족하는 핵심 조항:

| 조항 | 내용 | 본 구현 |
|------|------|---------|
| 5.2.3 | 텍스트 크기 7.25mm 이상 | 화면 24px 이상 |
| 5.2.2 d) | 청각적 대체 콘텐츠 의무 | 모든 시각 정보 음성화 |
| 명도 대비 | 4.5:1 이상 | WCAG AAA (7:1) 기본 |
| 6.3.3 | 사용 후 음량 65dBA 이하 자동 초기화 | 세션 종료 시 리셋 |
| 6.3.6 | 다시 듣기 기능 | 모든 음성에 다시 듣기 버튼 |
| 6.3.7 | 읽기 종료 기능 | ESC / 더블탭 종료 |
| 6.5.2 | 키패드 음성 안내 | 결제 입력 시 키 위치 음성 |
| 7.6.6 | 선택과 실행 분리 (단일 터치 ≠ 더블탭) | 모든 인터랙션 더블탭 |
| 8.2.2 | 시간 제한 + 연장 기능 | 20초 전 알림 + 연장 |
| 광과민성 | 3Hz 미만 깜빡임 | CSS 애니메이션 검증 |
| 8.3.2 | 충분한 시간 제공 | 학습자 음성 속도 조절 |

---

## 7. 데이터 모델

### 7.1 메뉴 데이터 (lib/kiosk-data/menu.ts)

```typescript
export type Category = 'coffee' | 'ade' | 'tea' | 'dessert';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  basePrice: number;
  voiceLabel: string;          // TTS용 메뉴명
  description: string;         // 음성 설명
  options: {
    temperature?: 'hot' | 'iced' | 'both';
    size?: boolean;
    extras?: boolean;
  };
  iconSvg: string;
}

export const MENU: MenuItem[] = [
  // 커피 3종
  { id: 'americano', name: '아메리카노', category: 'coffee', basePrice: 4500, /* ... */ },
  { id: 'cafelatte', name: '카페라떼', category: 'coffee', basePrice: 5000, /* ... */ },
  { id: 'cappuccino', name: '카푸치노', category: 'coffee', basePrice: 5000, /* ... */ },
  // 에이드 2종
  { id: 'lemon-ade', name: '레몬에이드', category: 'ade', basePrice: 5500, /* ... */ },
  { id: 'grapefruit-ade', name: '자몽에이드', category: 'ade', basePrice: 5500, /* ... */ },
  // 티 2종
  { id: 'chamomile', name: '캐모마일', category: 'tea', basePrice: 5000, /* ... */ },
  { id: 'peppermint', name: '페퍼민트', category: 'tea', basePrice: 5000, /* ... */ },
  // 디저트 1종
  { id: 'croissant', name: '크로와상', category: 'dessert', basePrice: 3800, /* ... */ },
];

export const SIZE_OPTIONS = {
  tall: { label: '톨', priceAdd: 0 },
  grande: { label: '그란데', priceAdd: 500 },
};

export const EXTRA_OPTIONS = {
  shot: { label: '샷 추가', priceAdd: 500 },
  syrup: { label: '시럽 추가', priceAdd: 300 },
};
```

### 7.2 결제 수단 데이터 (lib/kiosk-data/payment.ts)

```typescript
export type PaymentMethod = 'card' | 'mobile-pay' | 'coupon';

export interface PaymentOption {
  id: PaymentMethod;
  label: string;
  voiceLabel: string;
  voiceInstruction: string;  // "카드를 단말기 아래쪽 투입구에 꽂아주세요"
}

// 모드별 점진 도입 (Collins Sequencing)
export const PAYMENT_BY_MODE = {
  tutorial: ['card'],
  practice: ['card', 'mobile-pay'],
  challenge: ['card', 'mobile-pay', 'coupon'],
  realGuided: ['card', 'mobile-pay', 'coupon'],
  realFree: ['card', 'mobile-pay', 'coupon'],
};
```

### 7.3 학습 로그 데이터 (lib/learning/logTypes.ts)

```typescript
export interface LearningSession {
  sessionId: string;
  startedAt: Date;
  completedAt?: Date;
  mode: 'tutorial' | 'practice' | 'challenge' | 'realGuided' | 'realFree';
  stepTimings: {
    category: number;       // ms
    menu: number;
    options: number;
    payment: number;
  };
  totalDurationMs: number;
  helpRequestCount: number;
  selectedItemId: string;
  selectedPayment: PaymentMethod;
}

// 표준 baseline (Reflection 비교용)
export const STANDARD_BASELINE = {
  category: 20000,
  menu: 30000,
  options: 25000,
  payment: 35000,
  total: 150000,  // 2분 30초
};
```

---

## 8. 기술 스택과 아키텍처

### 8.1 스택

```
Frontend:
  · Next.js 14 (App Router)
  · TypeScript
  · Tailwind CSS
  · shadcn/ui (Radix UI 기반, 접근성 자동)

State:
  · Zustand (주문 상태, 학습 진행도)

Audio:
  · Web Speech API (TTS)
  · Howler.js (카페 BGM)

AI / LLM (15장 상세):
  · OpenAI GPT-4o-mini (대사 생성)
  · Whisper API (음성 → 텍스트)
  · Google Gemini 2.5 Flash (분석)
  · 키 관리: Next.js API Route (서버사이드)

Storage:
  · localStorage (학습 로그)

Deploy:
  · Vercel (환경변수로 API 키 관리)
```

### 8.2 핵심 컴포넌트 아키텍처

```
┌─ KioskFrame (외관) ─────────────────────────┐
│                                            │
│ ┌─ ScreenRouter (10단계 화면) ────────────┐ │
│ │                                        │ │
│ │  현재 화면 컴포넌트                       │ │
│ │  + VoiceLabel 부착된 인터랙티브 요소      │ │
│ │                                        │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌─ VoiceCoach (도담) ─────────────────────┐ │
│ │  - 화면 진입 음성 안내                    │ │
│ │  - 더블탭 시 voiceLabel 발화              │ │
│ │  - "다시 듣기" / "도움" 호출 대응         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌─ AmbientSound (카페 소음) ──────────────┐ │
│ │  - 모드별 dB 자동 조절                   │ │
│ └────────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

---

## 9. 폴더 구조

```
ondam-kiosk/
├── app/
│   ├── page.tsx                  # 환영 화면
│   ├── spatial-map/page.tsx      # 공간 지도
│   ├── tutorial/page.tsx
│   ├── practice/page.tsx
│   ├── challenge/page.tsx
│   ├── real-guided/page.tsx
│   ├── real-free/page.tsx
│   ├── articulation/page.tsx
│   ├── reflection/page.tsx
│   ├── complete/page.tsx
│   │
│   └── api/                      # ⭐ 서버사이드 API (키 보호)
│       ├── coach-line/route.ts   # GPT 대사 생성
│       ├── transcribe/route.ts   # Whisper 음성 전사
│       ├── analyze/route.ts      # Gemini 답변 분석
│       └── reflect/route.ts      # Gemini + GPT 종합 피드백
│
├── components/
│   ├── kiosk/
│   │   ├── KioskFrame.tsx        # 키오스크 외관
│   │   ├── CategoryGrid.tsx      # 카테고리 4개
│   │   ├── MenuGrid.tsx          # 메뉴 그리드
│   │   ├── OptionPanel.tsx       # 온도/사이즈/추가
│   │   ├── CartSidebar.tsx       # 장바구니
│   │   └── PaymentDialog.tsx     # 결제
│   │
│   ├── voice/
│   │   ├── VoiceCoach.tsx        # 도담
│   │   ├── VoiceButton.tsx       # voiceLabel 자동 부착
│   │   ├── ReplayButton.tsx      # 다시 듣기
│   │   └── VoiceRecorder.tsx     # ⭐ Articulation 녹음
│   │
│   ├── ambient/
│   │   └── AmbientSound.tsx
│   │
│   └── ui/                       # shadcn/ui
│
├── lib/
│   ├── kiosk-data/
│   │   ├── menu.ts
│   │   ├── payment.ts
│   │   └── scenarios.ts
│   │
│   ├── tts/
│   │   ├── webSpeech.ts          # Web Speech API 추상화
│   │   └── voiceScripts.ts       # 모드별 음성 대본 (폴백)
│   │
│   ├── llm/                      # ⭐ LLM 통합
│   │   ├── openai.ts             # GPT 클라이언트
│   │   ├── gemini.ts             # Gemini 클라이언트
│   │   ├── prompts.ts            # 프롬프트 템플릿
│   │   └── fallback.ts           # API 실패 시 폴백 스크립트
│   │
│   ├── learning/
│   │   ├── logTypes.ts
│   │   ├── reflectionEngine.ts   # 7개 피드백 템플릿 (폴백)
│   │   └── baseline.ts
│   │
│   └── interaction/
│       └── doubleTap.ts          # 단일/더블탭 분리
│
├── stores/
│   ├── orderStore.ts
│   ├── voiceStore.ts
│   └── learningStore.ts
│
├── docs/
│   └── KS_X_9211_2025_체크리스트.md
│
├── .env.local                    # ⭐ API 키 (gitignore 필수)
│   # OPENAI_API_KEY=sk-...
│   # GEMINI_API_KEY=...
│
└── public/
    ├── sounds/
    │   ├── ambient-quiet.mp3
    │   ├── ambient-medium.mp3
    │   └── ambient-loud.mp3
    └── icons/
        └── menu/
```

---

## 10. Phase별 개발 계획 (2주)

| Week | 일 | Phase | 작업 |
|------|---|-------|------|
| **W1** | 1~2 | Phase 1 | Next.js 세팅, Vercel 연결, 디자인 토큰, shadcn/ui 초기화 |
| | 3~4 | Phase 2 | 키오스크 외관 + 정적 화면 10단계 (음성 X) |
| | 5~6 | Phase 3a | Web Speech API 추상화, 더블탭 분리, voiceLabel 부착 |
| | 7 | Phase 3b | KS X 9211:2025 조항 적용 (시간 제한, 다시 듣기 등) |
| **W2** | 8 | Phase 4 | 5개 학습 모드 차별화 + 스캐폴딩 (기본 스크립트) |
| | 9 | Phase 4-AI | ⭐ GPT API 연동 (Real Free 동적 대사 + 폴백) |
| | 10 | Phase 5 | 카페 소음 레이어 (Howler.js), 모드별 BGM 전환 |
| | 11 | Phase 6 | Articulation (Whisper + Gemini 분석) + Reflection (Gemini + GPT) |
| | 12 | Phase 7 | 결제 시뮬레이션 3종 + 통합 테스트 |
| | 13 | Phase 8 | 버그 수정, axe-core 접근성 검증, **API 폴백 시연 검증** |
| | 14 | Phase 9 | 보고서 마무리, Vercel 환경변수 설정 + 최종 배포 |

⭐ **여유 1일** 확보 (LLM 통합 부담으로 v2.0보다 여유 줄어듦, 폴백 스크립트 우선 구축으로 위험 분산)

---

## 11. Claude Code 워크플로우 프롬프트

### 11.1 Phase 1 — 프로젝트 초기화

```
첨부한 PROJECT_DESIGN.md를 읽고, Phase 1을 수행해줘.

- Next.js 14 + TypeScript + Tailwind 프로젝트 생성
- shadcn/ui 초기화 (Button, Card, Dialog, RadioGroup, Checkbox)
- 폴더 구조는 설계서 9장을 따라줘
- 디자인 토큰 정의 (tailwind.config.ts):
  · primary: 진남색 #1A2A4A
  · accent: 코랄 #E07856
  · category-coffee: 진한 갈색
  · category-ade: 청록
  · category-tea: 연두
  · category-dessert: 베이지
- Pretendard 폰트 적용
- 빈 랜딩 페이지에 "온담 카페" 타이틀과 [시작하기] 더블탭 버튼
- 접근성: 모든 버튼에 명확한 aria-label, focus outline, 키보드 내비게이션
```

### 11.2 Phase 2 — 정적 화면 10단계

```
Phase 2를 수행해줘.

- 설계서 5장의 10단계 화면을 모두 정적으로 구현
- lib/kiosk-data/menu.ts에 8종 메뉴 데이터 정의 (설계서 7.1)
- lib/kiosk-data/payment.ts에 결제 수단 데이터 (설계서 7.2)
- 각 화면 간 라우터 연결 (Next.js App Router)
- 주문 상태는 stores/orderStore.ts (Zustand)로 관리
- 음성은 아직 넣지 말고, 시각 사용자 기준으로 끝까지 주문 완료되도록
- 키오스크 외관 (KioskFrame.tsx): 카페 카운터형, 화면 가로 2열 / 세로 4행
```

### 11.3 Phase 3 — 음성 인터페이스 ⭐

```
Phase 3을 수행해줘.
설계서 6장 KS X 9211:2025 요구사항을 반드시 충족해야 해.

특히 중요:
- 7.6.6 선택과 실행 분리: 단일 터치 = 정보 안내만, 더블탭 = 실행
- 6.3.6 다시 듣기 / 6.3.7 읽기 종료
- 6.3.3 사용 후 음량 65dBA 이하 자동 초기화
- 8.2.2 시간 제한 + 20초 전 연장 알림
- 5.2.2 d) 모든 시각 정보의 청각적 대체 콘텐츠

lib/tts/webSpeech.ts에서 Web Speech API 추상화:
- speak(text, options) — 비동기 큐 관리
- stop() — 즉시 중단
- replay() — 마지막 발화 재생

components/voice/VoiceCoach.tsx (도담):
- 화면 진입 시 자동 음성 안내
- 모든 인터랙티브 요소에 voiceLabel prop 연결
- 단일 터치 → voiceLabel 발화 / 더블탭 → 실행

lib/interaction/doubleTap.ts:
- 300ms 이내 두 번 터치 = 더블탭
- 그 외 = 단일 터치
```

### 11.4 Phase 4 — 5개 학습 모드 차별화

```
Phase 4를 수행해줘.

설계서 4.2의 6단계 학습 흐름에 따라 각 모드 차별화:

[Tutorial - Modeling]
- 학습자 입력 비활성화 (관찰만)
- 도담이 사고 과정까지 외현화하며 자동 시연
- 결제는 카드만

[Practice - Coaching]
- 학습자 직접 수행
- 각 단계마다 도담의 안내 음성
- 결제는 카드 + 모바일 페이 선택

[Challenge - Scaffolding & Fading]
- 도담 안내 줄어듦 (학습자 막힐 때만)
- 결제 3종 모두 등장
- 도움 호출 버튼

[Real Guided - Fading 완성]
- 미리 정해진 시나리오 (아메리카노 따뜻하게)
- 도담 도움 최소 (호출 시에만)

[Real Free - Exploration]
- 학습자가 자유롭게 메뉴 선택
- "오늘은 어떤 음료를 드시고 싶으세요?"
- 학습 로그 기록 시작 (stepTimings)
```

### 11.5 Phase 5 — 카페 소음 레이어

```
Phase 5를 수행해줘.

components/ambient/AmbientSound.tsx:
- Howler.js로 카페 BGM 관리
- 모드별 자동 볼륨 조절:
  · Tutorial: 0dB (음소거)
  · Practice: 30dB
  · Challenge: 50dB
  · Real Guided / Real Free: 60dB
- 페이드인/페이드아웃 부드럽게

public/sounds/ 에 무료 카페 ambient 음원 3종 준비
```

### 11.6 Phase 6 — Articulation + Reflection

```
Phase 6을 수행해줘.

[Articulation (Bronze)]
- 설계서 5.2의 4개 질문을 음성 + 텍스트로 순차 제시
- 학습자 답변은 받지 않음 (회상 자체가 학습)
- 각 질문 후 30초 대기 + 다음 버튼

[Reflection (Silver)]
- lib/learning/reflectionEngine.ts:
  · 학습자 stepTimings vs STANDARD_BASELINE 비교
  · 7개 피드백 템플릿 중 자동 선택 (가장 시간 차이 큰 단계)
- 시각: 단계별 막대그래프
- 청각: 동일 내용 음성 안내
```

### 11.7 Phase 7 — 결제 시뮬레이션

```
Phase 7을 수행해줘.

components/kiosk/PaymentDialog.tsx:
- 모드별 결제 수단 노출 (설계서 7.2 PAYMENT_BY_MODE)
- 카드: "카드 투입구는 화면 아래쪽 오른쪽에 있어요"
- 페이: "휴대폰 화면을 키오스크 하단 인식기에 대주세요"
- 쿠폰: "쿠폰 바코드를 키오스크 하단 스캐너에 보여주세요"
- 결제 처리: 3초 대기 + 가짜 승인 효과음
- 완료: "결제 완료. 주문번호 47번입니다."

⚠️ 실제 결제 시스템 연동 절대 X
```

### 11.8 디버깅 시

```
docs/KS_X_9211_2025_체크리스트.md 작성:
- 11개 핵심 조항을 체크리스트화 (설계서 6장)
- Claude Code에 "이 기능이 KS X 9211 어느 조항을 위반하는지 확인해줘"로 검증
```

---

## 12. KS X 9211:2025 체크리스트 (docs/ 디렉터리에 생성)

```markdown
# KS X 9211:2025 충족 체크리스트

## 시각 정보
- [ ] 5.2.3 한글 텍스트 7.25mm 이상 (화면 24px+)
- [ ] 명도 대비 4.5:1 이상 (WCAG AA), AAA 권장
- [ ] 3Hz 미만 깜빡임만 사용

## 청각 정보
- [ ] 5.2.2 d) 모든 시각 정보에 청각 대체 콘텐츠
- [ ] 6.3.3 사용 종료 시 음량 65dBA 이하 초기화
- [ ] 6.3.6 다시 듣기 버튼
- [ ] 6.3.7 읽기 종료 버튼
- [ ] 5.3.3 c) 음소거 옵션

## 인터랙션
- [ ] 7.6.6 단일 터치 ≠ 더블탭 분리
- [ ] 6.5.2 키패드 음성 안내

## 시간 제어
- [ ] 8.3.2 충분한 시간 + 20초 전 연장 알림
- [ ] 8.2.2 시간 연장 기능

## 도움
- [ ] 단계별 "도움 호출" 버튼
- [ ] 이전 단계로 이동 (실수 복구)
```

---

## 13. 검토자 정보 및 참고문헌

### 13.1 검토 권고 대상
- 한국시각장애인연합회 (Level 2 인터뷰 협조 기관)
- 한국디지털접근성진흥원
- Level 1 학습자 (인터뷰 대상자)

### 13.2 핵심 참고 자료

**표준·법령**
1. **KS X 9211:2025** 무인정보단말기 접근성 지침 (2025-12-23 개정)
2. **KS X 9211:2022** (전 버전, 비교용)
3. **2026 무인정보단말기 설치·운영 가이드** (NIA, 2026.2)
4. **장애인·고령자 정보접근 고시 별표 5** (과기정통부, 2025-10-20 개정)
5. **장애인차별금지법 시행령** (2025-11-18 시행)
6. **디지털포용법** (2026-1-22 시행)

**학술**
7. Collins, A. (2006). *Cognitive Apprenticeship.* In R. K. Sawyer (Ed.), The Cambridge Handbook of the Learning Sciences.
8. Lave, J., & Wenger, E. (1991). *Situated Learning: Legitimate Peripheral Participation.*
9. Miller, G. A. (1956). The magical number seven, plus or minus two. *Psychological Review.*
10. 이문오·김보미·신준영 (2026). 키오스크로 통하는 하루: 중증 발달장애인 키오스크 교육 실증 연구. *디지털콘텐츠학회논문지, 27(1).*
11. Kim. 8주차 상황학습이론 강의자료 (연세대).
12. Web Content Accessibility Guidelines (WCAG) 2.1.

### 13.3 관련 KS 표준
- KS X ISO/IEC 9995 (키보드 배열)
- ITU-T E.161 (4×3 키패드)
- KS X OT0003 한국형 웹 콘텐츠 접근성 지침 2.2
- KS A 0001:2023 (표준 서식)

---

## 14. 향후 확장 가능성

- **다른 키오스크 유형 모듈화**: 패스트푸드, 무인민원, ATM
- **다국어 지원**: 영어, 중국어 (KS 10.2.1)
- **수어 안내 추가**: 청각장애인 대상 확장
- **AI 음성 인식 고도화**: 자연어 주문 ("따뜻한 아메리카노 한 잔이요")
- **학습 분석 대시보드**: 시각장애인 디지털 역량 패턴 연구 데이터 축적
- **Articulation Silver/Gold**: 학습자 음성 녹음 및 분석
- **Reflection Gold**: 동료 학습자 수행과의 비교

---

## 15. AI API 통합 — GPT × Gemini 역할 분담 ⭐

### 15.1 통합 개요

본 시뮬레이터는 **단일 LLM 의존이 아닌 멀티 모델 아키텍처**를 채택한다. OpenAI GPT와 Google Gemini를 역할 분담하여 통합 활용함으로써 (1) 응답 안정성, (2) 분석 정확도, (3) 비용 효율성을 동시에 확보한다.

```
┌─────────────────────────────────────────────────────────┐
│  GPT (대사 생성 담당) — "예술적 표현"                     │
│  ───────────────────────────────────────                │
│  · 학습자가 직접 듣는 모든 "도담의 말"                    │
│  · Real Free 동적 음성 안내                              │
│  · Articulation 후속 코칭 (따뜻한 대화)                  │
│  · Reflection 맞춤 피드백 대사                           │
│  · 모델: GPT-4o-mini ($0.15 / $0.60 per 1M tokens)      │
│  · 학술적 정당화: Collins의 "개별화된 스캐폴딩"            │
│                                                        │
│  ═══════════════════════════════════════════════         │
│                                                        │
│  Gemini (분석 담당) — "객관적 판단"                       │
│  ───────────────────────────────────────                │
│  · 학습자 답변의 정확성·완전성 평가                       │
│  · stepTimings 패턴 분석                                 │
│  · 메타인지 발달 신호 포착 (자발적 회상 등)                │
│  · 모델: Gemini 2.5 Flash (무료 한도 활용)              │
│         500 RPD, 10 RPM, 250K TPM 무료                  │
│  · 학술적 정당화: 메타인지 분석의 정량적 포착             │
│                                                        │
│  ═══════════════════════════════════════════════         │
│                                                        │
│  Whisper (음성 인식 담당)                                │
│  ───────────────────────────────────────                │
│  · 학습자 Articulation 답변을 텍스트로 전사               │
│  · 모델: GPT-4o-mini Transcribe ($0.003/min)            │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

### 15.2 역할 분담 근거

| 항목 | GPT | Gemini |
|------|-----|--------|
| **한국어 자연스러움** | ⭐⭐⭐ | ⭐⭐ |
| **응답 속도** | 빠름 | 매우 빠름 (Flash) |
| **무료 한도** | 적음 (유료) | 넉넉 (Flash 500 RPD 무료) |
| **분석 정확도** | 좋음 | 매우 좋음 (1M 컨텍스트) |
| **본 연구 담당** | **학습자 대면 대사** | **백그라운드 분석** |

### 15.3 구현 지점 (3개 학습 단계)

#### ① Real Free 단계 — GPT 단독 (대사 생성)

```typescript
// app/api/coach-line/route.ts
import { OpenAI } from 'openai';

export async function POST(req: Request) {
  const { context } = await req.json();
  // context = { menuName, temperature, size, extras, nextStep }
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 시각장애인을 돕는 친근한 카페 키오스크 코치 '도담'입니다.
- 비판 없이, 격려하는 어조
- KS X 9211 준수 (구체적 위치 안내)
- 1~2문장, 30자 이내 권장
- 시각장애인이 듣기 좋은 자연스러운 한국어`,
      },
      {
        role: 'user',
        content: `학습자가 다음을 선택: ${JSON.stringify(context)}
다음 단계 안내 멘트 생성`,
      },
    ],
    max_tokens: 100,
    temperature: 0.7,
  });
  
  return Response.json({
    line: response.choices[0].message.content,
  });
}
```

#### ② Articulation 단계 — Whisper + Gemini + GPT 협업

**Step 1: Whisper로 음성 전사**
```typescript
// app/api/transcribe/route.ts
const formData = await req.formData();
const audioFile = formData.get('audio') as File;

const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'gpt-4o-mini-transcribe',
  language: 'ko',
});

return Response.json({ text: transcription.text });
```

**Step 2: Gemini로 정확성 분석**
```typescript
// app/api/analyze/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const prompt = `
실제 주문: ${JSON.stringify(actualOrder)}
학습자 답변: "${learnerAnswer}"

다음 JSON으로 분석:
{
  "recalledItems": ["회상한 항목들"],
  "missedItems": ["빠진 항목들"],
  "accuracy": 0.0~1.0,
  "metaCognitiveSignals": ["메타인지 발달 신호"],
  "encouragementPoints": ["칭찬할 점"]
}
`;

const result = await model.generateContent(prompt);
return Response.json(JSON.parse(result.response.text()));
```

**Step 3: GPT로 따뜻한 후속 코칭 생성**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '도담 페르소나...' },
    {
      role: 'user',
      content: `분석 결과: ${JSON.stringify(analysisFromGemini)}
이 결과에 기반해 학습자에게 따뜻한 후속 코칭 1~2문장.
- 정확히 회상한 항목 구체적으로 칭찬
- 빠진 항목은 부정하지 않고 자연스럽게 보충`,
    },
  ],
  max_tokens: 150,
});
```

#### ③ Reflection 단계 — Gemini 분석 + GPT 대사

```typescript
// app/api/reflect/route.ts

// Step 1: Gemini가 학습 데이터 종합 분석
const geminiAnalysis = await gemini.generateContent(`
학습 데이터:
- 총 시간: ${session.totalDurationMs}ms (표준: 150000ms)
- 단계별 시간 차이: ${JSON.stringify(stepDelta)}
- 도움 호출: ${session.helpRequestCount}회
- 다시 듣기: ${session.replayCount}회 (단계별: ${replayByStep})

JSON으로 분석:
{
  "weakestStep": "가장 어려웠던 단계",
  "strongestStep": "가장 잘한 단계",
  "patterns": ["관찰된 행동 패턴"],
  "nextLearningTip": "다음 연습 핵심 조언"
}
`);

// Step 2: GPT가 분석 결과를 따뜻한 피드백 대사로 변환
const coachLine = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '도담 페르소나...' },
    {
      role: 'user',
      content: `분석: ${JSON.stringify(geminiAnalysis)}
이 분석을 학습자에게 따뜻하게 3~4문장으로 전달.
- 잘한 점 먼저
- 개선점은 구체적 행동 제안으로
- 격려로 마무리`,
    },
  ],
  max_tokens: 250,
});
```

### 15.4 폴백(Fallback) 전략 ⚠️ 필수

API 실패 시에도 시뮬레이터가 멈추지 않도록 **3중 폴백** 구축.

```typescript
// lib/llm/fallback.ts

async function getCoachLine(context: Context): Promise<string> {
  try {
    // 1차: GPT API
    return await callGPT(context);
  } catch (gptError) {
    console.warn('GPT failed, falling back to Gemini');
    try {
      // 2차: Gemini API
      return await callGeminiAsBackup(context);
    } catch (geminiError) {
      console.warn('Both APIs failed, using static script');
      // 3차: 정적 스크립트 (반드시 작동)
      return getStaticFallback(context);
    }
  }
}

// 정적 폴백 — 모든 가능한 상황에 대비한 기본 멘트
const STATIC_FALLBACKS = {
  itemSelected: (item: string) => `${item}를 선택하셨네요. 좋아요.`,
  optionConfirmed: () => '옵션을 확인했어요. 다음 단계로 갈게요.',
  paymentReady: () => '결제 단계예요. 결제 수단을 선택해주세요.',
  // ... 모든 핵심 시나리오
};
```

**시연 시 안전성**: GPT/Gemini 둘 다 다운돼도 시뮬레이터는 정상 작동. 학습 경험만 약간 단조로워질 뿐 학습 자체는 가능.

### 15.5 API 키 보안

```bash
# .env.local (gitignore 필수)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Vercel 배포 시 — 대시보드에서 환경변수 등록
# Settings → Environment Variables
```

**절대 금지**:
- ❌ 클라이언트 코드(`'use client'`)에서 API 호출
- ❌ `NEXT_PUBLIC_OPENAI_API_KEY` 같은 변수명 (브라우저에 노출됨)
- ❌ git commit에 키 포함

**필수**:
- ✅ Next.js API Route(서버사이드)에서만 호출
- ✅ 환경변수는 `OPENAI_API_KEY` (NEXT_PUBLIC_ 접두사 X)
- ✅ `.env.local`을 `.gitignore`에 추가

### 15.6 비용 추정 (학기 과제 기준)

```
[세션 1회 = 약 27분]

GPT-4o-mini (대사 생성):
- Real Free 안내: 10회 × 200토큰 = 2,000토큰
- Articulation 코칭: 4회 × 300토큰 = 1,200토큰
- Reflection 피드백: 1회 × 500토큰 = 500토큰
- 도움 호출: 5회 × 200토큰 = 1,000토큰
계: 4,700토큰 (입력/출력 평균)
비용: 약 $0.003 (4원)

Whisper Transcribe (gpt-4o-mini-transcribe):
- Articulation 음성 4회 × 평균 30초 = 2분
비용: 2분 × $0.003 = $0.006 (8원)

Gemini 2.5 Flash:
- Articulation 분석 4회 + Reflection 1회 = 5회
- 무료 한도 (500 RPD) 내 → $0
─────────────────────────────────────────
세션당 합계: 약 $0.009 (약 12원)

[학기 100세션 가정]
약 1,200원

[발표 시연 안전 마진]
$10 (약 13,000원)로 충분
```

→ **거의 무시할 수준의 비용**

### 15.7 개인정보·윤리 고지

본 시뮬레이터는 학습자 음성을 OpenAI/Google API 서버로 전송함. 보고서에 명시 필요:

> *"본 시뮬레이터는 학습자의 Articulation 답변 음성을 OpenAI Whisper API와 Google Gemini API로 전송하여 분석한다. 원본 음성은 저장되지 않으며, 분석 결과 텍스트만 학습 로그에 기록된다. 학습자에게는 사전 동의를 구한다."*

학습자 동의 화면 (1단계 환영 이후 삽입):
```
[화면]
"이 시뮬레이터는 학습 효과를 위해 학습자의 음성을 
 잠시 AI 서버에 보내 분석해요. 음성은 저장되지 않아요.
 동의하시면 시작 버튼을 더블탭해주세요."

[ 동의하고 시작 ]  [ 음성 분석 없이 시작 ]
                   ↑ 폴백 모드로 작동
```

### 15.8 학술적 정당화 (보고서 인용용)

> **"본 시뮬레이터는 OpenAI GPT-4o-mini와 Google Gemini 2.5 Flash를 역할 분담하여 통합 활용한다. GPT는 학습자에게 직접 전달되는 도담의 자연어 대사 생성을 담당하여 Collins(2006)가 강조한 '개별화된 스캐폴딩(individualized scaffolding)'을 구현하며, Gemini는 학습자 음성 답변의 정확성 분석 및 학습 데이터 패턴 분석을 담당하여 메타인지 발달을 정량적으로 포착한다. 이는 단일 LLM 의존이 아닌 멀티 모델 아키텍처를 통한 '컴퓨터 기반 인지적 도제의 AI 시대 확장형'으로서, 응답 안정성과 분석 정확도를 동시에 확보하기 위한 설계 결정이다. 특히 Articulation 단계에서 Whisper API를 통한 학습자 음성의 실시간 전사·분석은 시각장애인 학습자의 메타인지 발달의 직접적 증거(예: 사이즈·옵션의 자발적 회상)를 포착할 수 있도록 설계되었다."**

### 15.9 Claude Code 추가 프롬프트

#### Phase 4-AI (W2 Day 9)

```
GPT API 통합을 수행해줘.

1. lib/llm/openai.ts 클라이언트 모듈 작성
2. app/api/coach-line/route.ts 작성:
   - POST 요청 받기 (context: order/step 정보)
   - GPT-4o-mini 호출 (시스템 프롬프트: 설계서 15.3)
   - 응답 텍스트 반환

3. lib/llm/fallback.ts 작성:
   - 3중 폴백 (GPT → Gemini → 정적 스크립트)
   - STATIC_FALLBACKS 객체에 모든 시나리오 기본 멘트

4. app/real-free/page.tsx에 연동:
   - 학습자 선택 시 /api/coach-line 호출
   - 응답을 Web Speech API로 음성 출력
   - 로딩 중에는 "잠시만요" 음성

5. .env.local.example 작성 (실제 키 X)
```

#### Phase 6 (W2 Day 11)

```
Articulation + Reflection AI 통합 구현.

[Articulation]
1. components/voice/VoiceRecorder.tsx:
   - 더블탭으로 녹음 시작/종료
   - Web Audio API + MediaRecorder
   - 30초 자동 종료
   - Blob을 FormData로 변환

2. app/api/transcribe/route.ts:
   - Whisper (gpt-4o-mini-transcribe) 호출
   - 한국어 설정 (language: 'ko')

3. app/api/analyze/route.ts:
   - lib/llm/gemini.ts 통해 Gemini 2.5 Flash 호출
   - 분석 프롬프트 (설계서 15.3 Step 2)
   - JSON 응답 파싱

4. 학습자 답변 흐름:
   녹음 → /api/transcribe → /api/analyze → /api/coach-line(GPT)
   → 도담 후속 음성

[Reflection]
1. app/api/reflect/route.ts:
   - Gemini 분석 + GPT 대사 (설계서 15.3)
   - learningStore에서 session 데이터 가져오기
   
2. app/reflection/page.tsx:
   - 시각: 단계별 막대그래프
   - 청각: GPT 생성 도담 음성
   - 폴백: lib/learning/reflectionEngine.ts의 7개 템플릿
```

---

**END OF DOCUMENT**

> *이 설계서(v2.1)는 KS X 9211:2025, 2026 NIA 가이드, Lave & Wenger(1991) 상황학습이론, Collins(2006) 인지적 도제이론을 통합 기반으로 작성되었으며, OpenAI GPT-4o-mini와 Google Gemini 2.5 Flash의 멀티 LLM 아키텍처를 통해 인지적 도제의 AI 시대 확장형을 시도한 교육훈련 프로그램 개발용 문서입니다.*
>
> *본 시뮬레이터는 단순한 키오스크 시뮬레이터가 아닌, 시각장애인의 디지털 시민 정체성 회복을 위한 학습 환경(Learning Environment)임을 다시 한번 강조합니다.*
