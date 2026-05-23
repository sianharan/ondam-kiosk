# Ambient Sound Assets

본 디렉터리는 Phase 5 카페 BGM 레이어가 재생하는 음원을 담는다.
`components/ambient/AmbientSound.tsx` 가 모드별로 자동 선택한다.

## 필요 파일

| 파일명 | 모드 | 목표 dB | 분위기 |
|---|---|---|---|
| `ambient-quiet.mp3`  | Practice              | 30dB | 약한 카페 (조용한 대화·식기) |
| `ambient-medium.mp3` | Challenge             | 50dB | 보통 카페 (대화·에스프레소 머신) |
| `ambient-loud.mp3`   | Real Guided / Real Free | 60dB | 실세계 카페 (대화·소음 활발) |

> Tutorial 은 0dB(무음) — `AmbientSound` 가 트랙을 로드하지 않는다.

## 권장 사양

- 포맷: MP3 (또는 OGG — `AmbientSound` 트랙 src 만 바꾸면 됨)
- 길이: 30초 ~ 2분 (루프 재생, 끊김 없이 자연스러운 페이드 추천)
- 비트레이트: 96~128kbps (web 용)
- 라이선스: **CC0 / Public Domain** 만 사용 (학기 과제 + 발표 안전)

## 다운로드 추천 출처

1. **Pixabay** — https://pixabay.com/sound-effects/search/cafe/
   - "Cafe Ambience" 류 검색, 무료·CC0 표기 확인
2. **Freesound** — https://freesound.org/search/?q=cafe&f=license:%22Creative+Commons+0%22
   - License 필터 = "Creative Commons 0" 필수
3. **YouTube Audio Library** — Public domain BGM (외부 다운로드 후 mp3 변환)

각 파일을 다운로드한 뒤 **위 파일명 그대로** 본 디렉터리에 저장하면 끝.

## 파일이 없을 때

`AmbientSound` 는 `onloaderror` 콜백으로 silent fallback 처리하므로,
파일이 없어도 학습 흐름은 멈추지 않는다.  콘솔에 경고 1줄만 찍힌다.
