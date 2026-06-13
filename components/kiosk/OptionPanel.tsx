"use client";

/**
 * OptionPanel — 온도/사이즈/추가 옵션 선택 패널
 *
 * Phase 3-B 음성 통합
 *   - 진입 시 표시되는 옵션 종류에 맞춰 자동 발화 (5.2.2 d)
 *   - 라디오/체크박스는 Radix UI 의 키보드 패턴을 그대로 유지 (단발 선택은
 *     중간 단계이고 다음 단계 진입에 더블탭 게이트가 따로 있음)
 *   - 라디오 옵션 변경 시 "따뜻하게 선택했어요" 짧은 안내
 *   - 최종 "이대로 주문" 버튼은 VoiceButton (단일/더블 분리)
 */

import * as React from "react";

import { VoiceButton } from "@/components/voice/VoiceButton";
import { VoiceCoach } from "@/components/voice/VoiceCoach";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDoubleTap } from "@/lib/interaction/doubleTap";
import {
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
  type ExtraKey,
  type SizeKey,
  type Temperature,
} from "@/lib/kiosk-data/menu";
import { getModeConfig } from "@/lib/learning/modeConfigs";
import { ttsManager } from "@/lib/tts/fallbackTTS";
import { VOICE_SCRIPTS } from "@/lib/tts/voiceScripts";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { useOrderStore } from "@/stores/orderStore";
import { VOLUME_TO_AUDIO, useVoiceStore } from "@/stores/voiceStore";

export interface OptionPanelProps {
  onComplete: () => void;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function OptionPanel({ onComplete }: OptionPanelProps) {
  const selectedItem = useOrderStore((s) => s.selectedItem);
  const selectedTemperature = useOrderStore((s) => s.selectedTemperature);
  const selectedSize = useOrderStore((s) => s.selectedSize);
  const selectedExtras = useOrderStore((s) => s.selectedExtras);
  const setTemperature = useOrderStore((s) => s.setTemperature);
  const setSize = useOrderStore((s) => s.setSize);
  const toggleExtra = useOrderStore((s) => s.toggleExtra);
  const getTotalPrice = useOrderStore((s) => s.getTotalPrice);

  const isVoiceEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  // Phase 4-B — Fading 정책
  //   detailed/normal : 진입 안내 + 옵션 선택 시 짧은 음성 피드백
  //   minimal         : 진입 안내 X, 선택 시에만 짧은 피드백 (사용자가 명시적 조작)
  //   silent          : 모든 자동 발화 X (단일 탭 voiceLabel 발화는 VoiceButton 차원)
  const currentMode = useLearningStore((s) => s.currentMode);
  const verbosity = currentMode
    ? getModeConfig(currentMode).voiceVerbosity
    : "detailed";
  const announceEntry = verbosity === "detailed" || verbosity === "normal";
  const announceShortFeedback = verbosity !== "silent";

  const speakShort = React.useCallback(
    (text: string) => {
      if (!isVoiceEnabled) return;
      if (!announceShortFeedback) return;
      ttsManager.setVoice(voice);
      ttsManager.setSpeed(speed);
      ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
      void ttsManager.speak(text, { interrupt: true });
    },
    [isVoiceEnabled, voice, speed, volume, announceShortFeedback],
  );

  // 옵션 선택 동작 — 마우스/터치(onValueChange)와 키보드 더블탭(OptionTile)이 공유한다.
  const selectTemperature = React.useCallback(
    (t: Temperature) => {
      setTemperature(t);
      speakShort(t === "hot" ? "따뜻하게 골랐어요." : "차갑게 골랐어요.");
    },
    [setTemperature, speakShort],
  );
  const selectSize = React.useCallback(
    (s: SizeKey) => {
      setSize(s);
      speakShort(`${SIZE_OPTIONS[s].voiceLabel}로 골랐어요.`);
    },
    [setSize, speakShort],
  );

  // 버그 ①·② — 진입 시 첫 번째 옵션 그룹의 첫 라디오로 포커스.
  //   Base UI RadioGroup 은 Composite roving-tabindex 라, 선택값이 없는 온도 그룹은
  //   활성 항목(tabIndex 0)이 안 잡혀 ① 진입 포커스가 기본 선택된 사이즈 'tall' 로
  //   쏠리고 ② Tab 으로 온도 그룹에 도달하지 못한다(마우스로 한 번 눌러야 합류).
  //   첫 라디오에 명시적으로 포커스를 주면 CompositeItem.onFocus 가 그 항목을 활성
  //   인덱스로 등록(roving)해 ①·②가 함께 풀린다. 진입 직후 Composite 마운트/경쟁
  //   포커스보다 늦게 실행돼야 안정적이라 requestAnimationFrame 으로 미룬다.
  //   프로그램 포커스(touched=false)라 자동 선택·진입 VoiceCoach 안내를 끊지 않는다.
  const panelRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      // 사용자가 이미 패널 안을 조작 중이면 포커스를 가로채지 않는다.
      if (!panel || panel.contains(document.activeElement)) return;
      panel.querySelector<HTMLElement>('[role="radio"]')?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!selectedItem) {
    return (
      <p className="text-xl text-foreground/70" role="status">
        선택된 메뉴가 없어요. 이전 화면으로 돌아가 메뉴를 선택해주세요.
      </p>
    );
  }

  const showTemperature = selectedItem.options.temperature === "both";
  const showSize = Boolean(selectedItem.options.size);
  const showExtras = Boolean(selectedItem.options.extras);
  const hasAnyOption = showTemperature || showSize || showExtras;

  const temperatureSatisfied = showTemperature
    ? selectedTemperature !== null
    : true;

  // 진입 안내 — 표시되는 옵션 종류에 맞춰
  const entrySequence: string[] = [
    `${selectedItem.voiceLabel} 옵션을 골라주세요.`,
    ...(showTemperature ? [VOICE_SCRIPTS.options.temperature] : []),
    ...(showSize ? [VOICE_SCRIPTS.options.size] : []),
    ...(showExtras ? [VOICE_SCRIPTS.options.extras] : []),
    ...(!hasAnyOption
      ? ["이 메뉴는 추가 옵션이 없어요. 바로 주문하실 수 있어요."]
      : []),
  ];

  return (
    <section ref={panelRef} className="flex flex-col gap-7">
      <header>
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          {selectedItem.name} 옵션 선택
        </h2>
        <p className="mt-2 text-xl text-foreground/70 md:text-2xl">
          원하시는 옵션을 골라주세요.
        </p>
      </header>

      {announceEntry && (
        <VoiceCoach message={entrySequence} sequenceGapMs={500} />
      )}

      {!hasAnyOption && (
        <p className="text-xl text-foreground/80">
          이 메뉴는 추가 옵션이 없어요. 바로 주문하실 수 있어요.
        </p>
      )}

      {/* ── 온도 선택 ─────────────────────────────────────── */}
      {showTemperature && (
        // fieldset 을 flex 컨테이너로 두면 <legend> 가 네이티브의 "테두리 위 걸침"
        // 특수 렌더링을 잃고 카드 안쪽 일반 흐름으로 들어온다 — 섹션 제목이 둥근 라인
        // 밖으로 튀어나와 보이던 문제 해결(세 섹션 동일, 크로스 브라우저 안정).
        <fieldset className="flex flex-col gap-4 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/15">
          <legend className="text-xl font-bold text-foreground md:text-2xl">
            온도
          </legend>
          <RadioGroup
            value={selectedTemperature ?? ""}
            onValueChange={(v) => selectTemperature(v as Temperature)}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <OptionTile
              value="hot"
              checked={selectedTemperature === "hot"}
              label="따뜻하게"
              voiceLabel="따뜻하게"
              onSelect={() => selectTemperature("hot")}
            />
            <OptionTile
              value="iced"
              checked={selectedTemperature === "iced"}
              label="차갑게"
              voiceLabel="차갑게 (얼음 포함)"
              onSelect={() => selectTemperature("iced")}
            />
          </RadioGroup>
        </fieldset>
      )}

      {/* ── 사이즈 선택 ───────────────────────────────────── */}
      {showSize && (
        <fieldset className="flex flex-col gap-4 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/15">
          <legend className="text-xl font-bold text-foreground md:text-2xl">
            사이즈
          </legend>
          <RadioGroup
            value={selectedSize}
            onValueChange={(v) => selectSize(v as SizeKey)}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            {(Object.keys(SIZE_OPTIONS) as SizeKey[]).map((key) => {
              const opt = SIZE_OPTIONS[key];
              const priceText =
                opt.priceAdd > 0
                  ? `+${formatPrice(opt.priceAdd)}`
                  : "기본 가격";
              return (
                <OptionTile
                  key={key}
                  value={key}
                  checked={selectedSize === key}
                  label={`${opt.label} (${priceText})`}
                  voiceLabel={`${opt.voiceLabel}, ${priceText}`}
                  onSelect={() => selectSize(key)}
                />
              );
            })}
          </RadioGroup>
        </fieldset>
      )}

      {/* ── 추가 옵션 (Checkbox) ───────────────────────────── */}
      {showExtras && (
        <fieldset className="flex flex-col gap-4 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/15">
          <legend className="text-xl font-bold text-foreground md:text-2xl">
            추가
          </legend>
          <div className="flex flex-col gap-3">
            {(Object.keys(EXTRA_OPTIONS) as ExtraKey[]).map((key) => {
              const opt = EXTRA_OPTIONS[key];
              const isChecked = selectedExtras.includes(key);
              const priceText = `+${formatPrice(opt.priceAdd)}`;
              return (
                <ExtraTile
                  key={key}
                  checked={isChecked}
                  label={opt.label}
                  voiceLabel={`${opt.voiceLabel}, ${priceText}`}
                  priceText={priceText}
                  onToggle={() => {
                    toggleExtra(key);
                    speakShort(
                      isChecked
                        ? `${opt.voiceLabel} 뺐어요.`
                        : `${opt.voiceLabel} 더했어요.`,
                    );
                  }}
                />
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── 총 가격 + 진행 버튼 ────────────────────────────── */}
      <div
        className="flex flex-col gap-4 rounded-2xl bg-muted/60 p-6 md:flex-row md:items-center md:justify-between"
        aria-live="polite"
      >
        <div>
          <p className="text-lg text-foreground/70">현재 총 가격</p>
          <p className="text-3xl font-bold text-primary md:text-4xl">
            {formatPrice(getTotalPrice())}
          </p>
        </div>
        <VoiceButton
          voiceLabel={`이대로 주문 버튼이에요. 총 가격 ${formatPrice(getTotalPrice())}. 두 번 두드리면 장바구니 화면으로 가요.`}
          onActivate={onComplete}
          disabled={!temperatureSatisfied}
          className="md:text-2xl"
        >
          이대로 주문
        </VoiceButton>
      </div>
    </section>
  );
}

/**
 * Base UI 가 mergeProps(makeEventPreventable)로 합성 이벤트에 주입하는 메서드.
 * 소비자 keydown 핸들러에서 호출하면 Base UI 내장 키 처리를 끈다.
 */
type BaseUIKeyEvent = React.KeyboardEvent & {
  preventBaseUIHandler?: () => void;
};

interface OptionTileProps {
  value: string;
  checked: boolean;
  label: string;
  voiceLabel: string;
  /** 키보드 두 번째 입력(실행)에서 호출 — 실제 선택 + 음성 피드백 */
  onSelect: () => void;
}

function OptionTile({
  value,
  checked,
  label,
  voiceLabel,
  onSelect,
}: OptionTileProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  // 버그 ② — 카테고리/메뉴 라디오와 동일한 더블탭 패턴(KS X 9211 §7.6.6).
  //   한 번 두드리면 옵션 설명을 발화하고, 두 번 두드리면 실제로 선택한다.
  const handleSingle = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
    void ttsManager.speak(voiceLabel, { interrupt: true });
  }, [isEnabled, voice, speed, volume, voiceLabel]);

  const handleDouble = React.useCallback(() => {
    ttsManager.stop();
    onSelect();
  }, [onSelect]);

  const { onKeyDown, onFocus } = useDoubleTap({
    onSingleTap: handleSingle,
    onDoubleTap: handleDouble,
  });

  // 버그 ③ — Enter/Space 더블탭(KS X 9211 §7.6.6). Base UI useButton 은 Space/Enter
  //   를 내장 click(=즉시 선택)으로 처리한다. mergeProps 가 keydown 에 주입하는
  //   preventBaseUIHandler() 를 호출하면 useButton 이 baseUIHandlerPrevented 를 보고
  //   내장 처리를 건너뛴다(useButton.js). 그 뒤 더블탭 게이트로만 라우팅 — 1차=음성,
  //   2차=onSelect 직접 선택. 화살표 키는 흘려보내 그룹 내 이동/선택을 그대로 둔다.
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      (e as BaseUIKeyEvent).preventBaseUIHandler?.();
      onKeyDown(e);
    },
    [onKeyDown],
  );

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors",
        "hover:bg-muted/60",
        // CategoryGrid·MenuGrid 와 동일하게 :focus 기반(모달리티 무관)으로 포커스 링을
        // 노출한다. 진입 시 따뜻하게로 주는 프로그램 포커스가 마우스 진입(:focus-visible
        // OFF)에서도 보여야, 기본 선택된 톨만 강조돼 보이는 혼동을 없앤다.
        "has-[:focus]:ring-4 has-[:focus]:ring-accent",
        checked
          ? "border-primary bg-primary/5"
          : "border-foreground/15 bg-background",
      )}
    >
      <RadioGroupItem
        value={value}
        aria-label={voiceLabel}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        // 버그 — Base UI RadioGroup 의 roving-tabindex 는 그룹당 1개만 Tab 정지점이라
        //   Tab 이 "따뜻하게 → (차갑게 건너뜀) → 톨 → (그란데 건너뜀) → 샷 추가" 로 튄다.
        //   이 키오스크는 화살표가 아닌 Tab 만으로 모든 항목을 순회하는 모델(체크박스도
        //   각각 Tab 정지점)이라, 각 라디오를 명시적으로 tabIndex 0 으로 만들어
        //   "따뜻하게 → 차갑게 → 톨 → 그란데" 순회를 복원한다. CompositeItem 의
        //   roving tabIndex(=isHighlighted?0:-1)는 elementProps 가 뒤에서 덮어쓴다
        //   (useFocusableWhenDisabled 는 composite 일 때 tabIndex 를 안 건드림).
        //   화살표 이동은 그대로 동작한다.
        tabIndex={0}
        className="size-6"
      />
      <span className="text-xl font-medium md:text-2xl">{label}</span>
    </label>
  );
}

interface ExtraTileProps {
  checked: boolean;
  label: string;
  voiceLabel: string;
  priceText: string;
  /** 키보드 두 번째 입력(실행)에서 호출 — 실제 토글 + 음성 피드백 */
  onToggle: () => void;
}

/**
 * ExtraTile — 추가 옵션(샷/시럽 등) 체크박스. OptionTile(라디오)과 동일한
 * 더블탭 + 키보드 포커스 발화 패턴(KS X 9211 §7.6.6)을 체크박스에 적용한다.
 *   - Tab/화살표로 포커스 도착 → voiceLabel 발화(키보드 모달리티에서만).
 *   - 한 번 두드림 → 옵션 설명 발화, 두 번 두드림 → 실제 토글.
 *   - 마우스/터치 클릭은 onCheckedChange 로 즉시 토글(기존 동작 유지).
 */
function ExtraTile({
  checked,
  label,
  voiceLabel,
  priceText,
  onToggle,
}: ExtraTileProps) {
  const isEnabled = useVoiceStore((s) => s.isEnabled);
  const voice = useVoiceStore((s) => s.voice);
  const speed = useVoiceStore((s) => s.speed);
  const volume = useVoiceStore((s) => s.volume);

  const handleSingle = React.useCallback(() => {
    if (!isEnabled) return;
    ttsManager.setVoice(voice);
    ttsManager.setSpeed(speed);
    ttsManager.setVolume(VOLUME_TO_AUDIO[volume]);
    void ttsManager.speak(voiceLabel, { interrupt: true });
  }, [isEnabled, voice, speed, volume, voiceLabel]);

  const handleDouble = React.useCallback(() => {
    ttsManager.stop();
    onToggle();
  }, [onToggle]);

  const { onKeyDown, onFocus } = useDoubleTap({
    onSingleTap: handleSingle,
    onDoubleTap: handleDouble,
  });

  // OptionTile 과 동일 — Base UI useButton 의 Space/Enter 즉시 토글을
  // preventBaseUIHandler() 로 끄고 더블탭 게이트로만 라우팅한다.
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      (e as BaseUIKeyEvent).preventBaseUIHandler?.();
      onKeyDown(e);
    },
    [onKeyDown],
  );

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors",
        "hover:bg-muted/60",
        "has-[:focus]:ring-4 has-[:focus]:ring-accent",
        checked
          ? "border-primary bg-primary/5"
          : "border-foreground/15 bg-background",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={voiceLabel}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        className="size-6"
      />
      <span className="flex flex-1 items-center justify-between gap-3">
        <span className="text-xl font-medium md:text-2xl">{label}</span>
        <span className="text-lg text-primary md:text-xl">{priceText}</span>
      </span>
    </label>
  );
}
