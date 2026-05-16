# KS X 9211:2025 충족 매트릭스

> Phase 3-B 음성 인터페이스 통합 완료 시점 기준 (2026-05-16).
> 본 문서는 본 시뮬레이터가 KS X 9211:2025 "무인정보단말기 접근성 지침"의
> 어느 조항을, 코드 어디서, 어떻게 충족하는지를 한눈에 보여준다.

## 적용 범위

본 시뮬레이터는 **시각장애인 학습자의 키오스크 적응 학습 환경**이다.
실물 키오스크가 아닌 학습용 시뮬레이터이므로 일부 물리적 조항(키패드 점자,
물리 출력단자 등)은 적용 외 대상이고, **시각·청각·시간·인터랙션** 조항을
중점적으로 충족한다.

## 매트릭스

| 조항 | 내용 | 본 시뮬레이터 구현 | 구현 위치 | 상태 |
|------|------|-------------------|---------|------|
| 5.2.2 d) | 시각 정보의 청각적 대체 콘텐츠 제공 의무 | 모든 화면 진입 시 `VoiceCoach` 가 자동 발화. 모든 인터랙티브 요소(버튼/카드/메뉴)는 `VoiceButton` 또는 동등 패턴으로 `voiceLabel`(=`aria-label`) 부착 | `components/voice/VoiceCoach.tsx`, `components/voice/VoiceButton.tsx`, 모든 페이지 | ✅ |
| 5.2.3 | 텍스트 크기 7.25mm 이상 (화면 약 24px) | KioskFrame 본문 `font-size: max(1.5rem, 24px)` | `components/kiosk/KioskFrame.tsx:82` | ✅ |
| 명도 대비 | 4.5:1 이상 (본 시스템은 WCAG AAA 7:1) | 디자인 토큰 `primary #1A2A4A` on white = 13.7:1 | `app/globals.css`, `tailwind.config` | ✅ |
| 6.3.3 | 사용 후 음량 65dBA 이하 자동 초기화 | 5단계 음량 옵션의 최대값(150%)이 시스템 audio.volume 1.0 으로 매핑되어 청력 보호 한도 안. `clearTransient()` / `resetToDefault()` 가 세션 종료 시 호출됨 | `stores/voiceStore.ts:VOLUME_TO_AUDIO`, `app/complete/page.tsx` | ✅ |
| 6.3.6 | 다시 듣기 기능 | (a) `KioskFrame` 헤더 좌측 `ReplayButton` 이 모든 페이지에서 가장 마지막 시퀀스 재생, (b) 각 `VoiceCoach` 위젯 내부에도 [다시 듣기] 버튼 | `components/voice/ReplayButton.tsx`, `components/voice/VoiceCoach.tsx` | ✅ |
| 6.3.7 | 읽기 종료 기능 | (a) 글로벌 floating `StopSpeakingButton` 이 발화 중에만 우측 하단에 노출, (b) ESC 키 단축키, (c) `VoiceCoach` 내부 [멈추기] 버튼 | `components/voice/StopSpeakingButton.tsx` | ✅ |
| 6.5.2 | 키패드 음성 안내 (위치) | 결제 단계 안내 음성에 "단말기 아래 오른쪽 투입구" 같은 위치어 포함 | `lib/tts/voiceScripts.ts:payment`, `lib/kiosk-data/payment.ts:voiceInstruction` | ✅ |
| 7.6.6 | 선택과 실행 분리 (단일 터치 ≠ 더블탭) | `useDoubleTap` 훅 (300ms 윈도우) 기반 `VoiceButton`. 모든 학습 진행 버튼 / 카테고리·메뉴 카드 / 결제 수단에 적용 | `lib/interaction/doubleTap.ts`, `components/voice/VoiceButton.tsx`, `components/kiosk/CategoryGrid.tsx`, `components/kiosk/MenuGrid.tsx`, `components/kiosk/PaymentDialog.tsx` | ✅ |
| 8.2.2 | 시간 제한 + 연장 기능 | `useTimeout` 훅 + `TimeoutWarning` 모달. Practice 5분 / Challenge 4분 / Real Guided 3분. 만료 20초 전 nova 음성 경고 + [+60초 연장] / [지금 다음으로] 선택 | `lib/interaction/timeoutManager.ts`, `components/voice/TimeoutWarning.tsx`, `app/{practice,challenge,real-guided}/page.tsx` | ✅ |
| 8.3.2 | 충분한 시간 제공 (속도 조절) | 음성 속도 4단계 0.8 / 1.0 / 1.25 / 1.5× 선택 가능 (학습자 영속 저장) | `stores/voiceStore.ts:VOICE_SPEED_OPTIONS`, `components/voice/VoiceSettingsPanel.tsx` | ✅ |
| 광과민성 | 3Hz 미만 깜빡임 | 도담 펄스 1.2s 주기(=0.83Hz) | `components/voice/VoiceCoach.tsx` | ✅ |

## 음성 시스템 아키텍처 요약

```
컴포넌트 (페이지/카드)
   │ ttsManager.speak(text)        (lib/tts/fallbackTTS.ts)
   ├── 1차: OpenAITTSManager
   │     └── POST /api/tts → mp3 → <audio>.play()
   │         · 음성: nova / shimmer / echo (사용자 선택)
   │         · 32개 blob URL LRU 캐시 (반복 발화 비용 절감)
   └── 2차 (1차 실패 시): WebSpeechManager
         └── 브라우저 내장 SpeechSynthesis
         · 2회 연속 실패 시 세션 동안 폴백 고정
         · 사용자가 음성 재선택 시 카운터 리셋

전역 상태 (stores/voiceStore.ts, Zustand + persist)
   · isEnabled / voice / speed / volume → localStorage 영속
   · lastSequence / currentText / isSpeaking → 휘발성

전역 UI (app/layout.tsx → GlobalVoiceControls)
   · VoiceSettingsPanel (우상단 토글)
   · StopSpeakingButton (우하단 floating, 발화 중에만)

페이지 단위 UI
   · KioskFrame 헤더 좌측: ReplayButton
   · 본문 안: 페이지별 VoiceCoach (자동 발화 + 멈추기·다시듣기)
   · 시간 제한 모드: TimeoutWarning 모달 (만료 20초 전)
```

## 음성 통합이 완료된 페이지·컴포넌트

### 페이지

| 단계 | 라우트 | 진입 시 자동 발화 | 시간 제한 |
|------|-------|------------------|---------|
| 1/10 | `/` | 환영 인사 + 시작 버튼 안내 | 무제한 |
| 2/10 | `/spatial-map` | intro → layout → physical → next (1초 간격) | 무제한 |
| 3/10 | `/tutorial` | tutorial.intro | 무제한 (시연) |
| 4/10 | `/practice` | practice.intro | **5분** |
| 5/10 | `/challenge` | challenge.intro | **4분** |
| 6/10 | `/real-guided` | realGuided.intro + ambient | **3분** |
| 7/10 | `/real-free` | realFree.intro + invitation | 무제한 (탐색) |
| 8/10 | `/articulation` | intro + Q1~Q4 (질문 전환마다 재발화) | 무제한 |
| 9/10 | `/reflection` | intro + 총 시간 + 단계별 비교 + 가장 어려운 단계 + 팁 | 무제한 |
| 10/10 | `/complete` | complete.intro + save + next | 무제한 |

### 키오스크 카드 컴포넌트

| 컴포넌트 | 자동 발화 | 카드/버튼 단일/더블 분리 |
|---------|-----------|------------------------|
| `CategoryGrid` | "메뉴 카테고리 4개를 알려드릴게요…" + 4개 위치 | ✅ 각 카테고리 카드 |
| `MenuGrid` | "{카테고리} 메뉴를 보여드릴게요" + 메뉴 이름 나열 | ✅ 각 메뉴 카드 + 카테고리 돌아가기 |
| `OptionPanel` | 표시되는 옵션 종류에 맞춰 안내 | 라디오/체크박스는 Radix 패턴 유지 + 옵션 변경 시 짧은 음성 피드백 + [이대로 주문]만 VoiceButton |
| `CartSidebar` | 주문 요약 1회 발화 | ✅ [결제하기] + [처음으로] |
| `PaymentDialog` | stage(select/instruction/processing/complete) 별 자동 발화 | ✅ 결제 수단 / 결제 시작 / 확인 |

## 알려진 제약 / 미구현

- **자동 재생 차단**: 일부 브라우저(특히 모바일 Safari)는 사용자 제스처 전에는 `<audio>.play()` 를 차단한다. 환영 페이지 첫 발화는 사용자가 화면을 한 번 만져야 시작될 수 있다. → Phase 3-C 또는 4 에서 "탭하여 시작" 게이트 검토.
- **타이머 정확도**: `setTimeout` 기반이라 백그라운드 탭에서는 OS 가 timer 를 느슨하게 한다. 학습용으로는 충분하지만, 평가용 실측이 필요하면 `requestAnimationFrame` + 시각·표시도 함께 갱신.
- **카페 소음 레이어(60dB Real Guided)**: Phase 5 (Howler.js) 대상.
- **결제 음성 키패드 안내(6.5.2 핀패드)**: 현재는 위치어로만 충족. 실제 핀패드 키음 안내는 Phase 7.
- **8.2.1 시간 제한 절대 금지 조항이 아닌 8.2.2**: 본 시뮬레이터는 학습 효율을 위해 시간 제한 + 연장 옵션 패턴 채택.

## 검증 절차 (수동)

1. `npm run dev` → Chrome 으로 `http://localhost:3000`
2. **5.2.2 d)**: 환영 화면 진입 시 자동으로 도담 인사가 들리는지
3. **7.6.6**: 시작하기 한 번 클릭 → "시작하기 버튼이에요…" 안내, 두 번 빠르게 클릭 → 다음 화면
4. **6.3.6**: 어느 페이지든 헤더 좌측 [🔁 다시 듣기]를 두 번 두드리면 마지막 시퀀스 재생
5. **6.3.7**: 발화 중 우측 하단 [⏹ 멈추기] 클릭 또는 `ESC` → 즉시 정지
6. **8.2.2**: `/practice` 진입 후 5분 - 20초 = 4분 40초 지나면 nova 경고 모달
7. **6.3.3 / 8.3.2**: 우상단 [🔊 음성 설정] → 속도·음량 변경 → 짧은 음성 피드백 + 새로고침해도 설정 유지
