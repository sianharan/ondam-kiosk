# 온담(溫談) 카페 — 시각장애인 키오스크 학습 환경

> **단순한 키오스크 시뮬레이터가 아닙니다.** 상황학습이론(Lave & Wenger, 1991)과 인지적 도제이론(Collins, 2006)에 기반한, 시각장애인이 키오스크 사용 역량을 길러내는 **학습 환경(Learning Environment)** 입니다. 카페 코치 "도담"이 모델링 → 코칭 → 스캐폴딩/페이딩 → 명료화 → 성찰 → 탐색의 6단계로 학습자를 안내합니다.

본 프로젝트는 KS X 9211:2025 무인정보단말기 접근성 지침을 보수적으로 적용하며, Collins(2006)가 강조한 **낙인 효과 해소(without criticism)** 를 컴퓨터 기반 인지적 도제로 구현해 시각장애인의 디지털 시민 정체성 회복을 목표로 합니다. 자세한 설계는 [`PROJECT_DESIGN.md`](./PROJECT_DESIGN.md)를 참고하세요.

## 기술 스택

- **프레임워크**: Next.js (App Router) + TypeScript
- **스타일**: Tailwind CSS v4, shadcn/ui (Radix UI 기반 — ARIA 자동)
- **폰트**: Pretendard (한글 가독성)
- **상태 관리**: Zustand (예정)
- **오디오**: Web Speech API (TTS), Howler.js (카페 BGM, 예정)
- **AI**: OpenAI GPT-4o-mini (도담 대사), Whisper (음성 전사), Google Gemini 2.5 Flash (분석)
- **배포**: Vercel

## 실행 방법

1. 의존성 설치
   ```bash
   npm install
   ```

2. `.env.local` 파일에 API 키 설정
   ```bash
   OPENAI_API_KEY=sk-...
   GEMINI_API_KEY=AIza...
   ```
   > `.env.local`은 `.gitignore`에 포함되어 커밋되지 않습니다.

3. 개발 서버 실행
   ```bash
   npm run dev
   ```
   브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## 폴더 구조

```
app/                  Next.js App Router 페이지 + API 라우트
components/
  kiosk/              KioskFrame, CategoryGrid, MenuGrid, ...
  voice/              VoiceCoach (도담), VoiceButton, VoiceRecorder
  ambient/            AmbientSound (카페 BGM)
  ui/                 shadcn/ui 컴포넌트
lib/
  kiosk-data/         메뉴·결제 데이터
  tts/                Web Speech API 추상화
  llm/                OpenAI / Gemini 클라이언트, 폴백 스크립트
  learning/           학습 로그, Reflection 엔진
  interaction/        더블탭 분리 등 인터랙션 헬퍼
stores/               Zustand 스토어
docs/                 KS X 9211:2025 체크리스트 등
public/               정적 자산 (BGM, 아이콘)
```

## 개발 단계

설계서 10장에 따라 2주 9개 Phase로 진행합니다.

- **Phase 1**: 프로젝트 초기화 (이 단계)
- **Phase 2**: 정적 화면 10단계
- **Phase 3**: 음성 인터페이스 (Web Speech, 더블탭, KS X 9211 충족)
- **Phase 4**: 5개 학습 모드 차별화 + GPT 연동
- **Phase 5**: 카페 소음 레이어
- **Phase 6**: Articulation (Whisper + Gemini) + Reflection
- **Phase 7**: 결제 시뮬레이션
- **Phase 8**: 접근성 검증 + 폴백 시연
- **Phase 9**: Vercel 배포
