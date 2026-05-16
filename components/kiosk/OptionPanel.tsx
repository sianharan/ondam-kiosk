"use client";

/**
 * OptionPanel — 온도/사이즈/추가 옵션 선택 패널
 *
 * PROJECT_DESIGN.md 5.2 #3 옵션 단계 + 7.1 SIZE_OPTIONS/EXTRA_OPTIONS 기반.
 *
 * 선택된 메뉴의 options 에 따라 표시할 옵션이 달라진다:
 *  - temperature: 'both' 일 때만 RadioGroup (hot/iced)
 *  - size: true 일 때만 RadioGroup (tall/grande)
 *  - extras: true 일 때만 Checkbox (shot, syrup)
 */

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  EXTRA_OPTIONS,
  SIZE_OPTIONS,
  type ExtraKey,
  type SizeKey,
  type Temperature,
} from "@/lib/kiosk-data/menu";
import { useOrderStore } from "@/stores/orderStore";
import { cn } from "@/lib/utils";

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

  // 온도가 'both' 인데 아직 선택 안 했으면 다음 단계 잠금
  const temperatureSatisfied = showTemperature ? selectedTemperature !== null : true;

  return (
    <section className="flex flex-col gap-7">
      <header>
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          {selectedItem.name} 옵션 선택
        </h2>
        <p className="mt-2 text-xl text-foreground/70 md:text-2xl">
          원하시는 옵션을 골라주세요.
        </p>
      </header>

      {!hasAnyOption && (
        <p className="text-xl text-foreground/80">
          이 메뉴는 추가 옵션이 없어요. 바로 주문하실 수 있어요.
        </p>
      )}

      {/* ── 온도 선택 ─────────────────────────────────────── */}
      {showTemperature && (
        <fieldset className="rounded-2xl border border-foreground/15 bg-background p-6">
          <legend className="px-2 text-xl font-bold text-foreground md:text-2xl">
            온도
          </legend>
          <RadioGroup
            value={selectedTemperature ?? ""}
            onValueChange={(v) => setTemperature(v as Temperature)}
            className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            <OptionTile
              value="hot"
              checked={selectedTemperature === "hot"}
              label="따뜻하게"
              voiceLabel="따뜻하게"
            />
            <OptionTile
              value="iced"
              checked={selectedTemperature === "iced"}
              label="차갑게"
              voiceLabel="차갑게 (얼음 포함)"
            />
          </RadioGroup>
        </fieldset>
      )}

      {/* ── 사이즈 선택 ───────────────────────────────────── */}
      {showSize && (
        <fieldset className="rounded-2xl border border-foreground/15 bg-background p-6">
          <legend className="px-2 text-xl font-bold text-foreground md:text-2xl">
            사이즈
          </legend>
          <RadioGroup
            value={selectedSize}
            onValueChange={(v) => setSize(v as SizeKey)}
            className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            {(Object.keys(SIZE_OPTIONS) as SizeKey[]).map((key) => {
              const opt = SIZE_OPTIONS[key];
              const priceText =
                opt.priceAdd > 0 ? `+${formatPrice(opt.priceAdd)}` : "기본 가격";
              return (
                <OptionTile
                  key={key}
                  value={key}
                  checked={selectedSize === key}
                  label={`${opt.label} (${priceText})`}
                  voiceLabel={`${opt.voiceLabel}, ${priceText}`}
                />
              );
            })}
          </RadioGroup>
        </fieldset>
      )}

      {/* ── 추가 옵션 (Checkbox) ───────────────────────────── */}
      {showExtras && (
        <fieldset className="rounded-2xl border border-foreground/15 bg-background p-6">
          <legend className="px-2 text-xl font-bold text-foreground md:text-2xl">
            추가
          </legend>
          <div className="mt-3 flex flex-col gap-3">
            {(Object.keys(EXTRA_OPTIONS) as ExtraKey[]).map((key) => {
              const opt = EXTRA_OPTIONS[key];
              const isChecked = selectedExtras.includes(key);
              const priceText = `+${formatPrice(opt.priceAdd)}`;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors",
                    "hover:bg-muted/60",
                    "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent",
                    isChecked
                      ? "border-primary bg-primary/5"
                      : "border-foreground/15 bg-background",
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleExtra(key)}
                    aria-label={`${opt.voiceLabel}, ${priceText}`}
                    className="size-6"
                  />
                  <span className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-xl font-medium md:text-2xl">
                      {opt.label}
                    </span>
                    <span className="text-lg text-primary md:text-xl">
                      {priceText}
                    </span>
                  </span>
                </label>
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
        <button
          type="button"
          onClick={onComplete}
          disabled={!temperatureSatisfied}
          aria-label="이대로 주문하기. 장바구니 화면으로 이동합니다"
          className={cn(
            "rounded-2xl bg-accent px-8 py-5 text-2xl font-bold text-accent-foreground shadow-md transition-all",
            "hover:-translate-y-0.5 hover:shadow-lg",
            "focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-foreground/40 disabled:shadow-none disabled:hover:translate-y-0",
          )}
        >
          이대로 주문
        </button>
      </div>
    </section>
  );
}

// ── 내부 헬퍼: RadioGroup 의 한 칸 ──────────────────────────
interface OptionTileProps {
  value: string;
  checked: boolean;
  label: string;
  voiceLabel: string;
}

function OptionTile({ value, checked, label, voiceLabel }: OptionTileProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors",
        "hover:bg-muted/60",
        "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent",
        checked
          ? "border-primary bg-primary/5"
          : "border-foreground/15 bg-background",
      )}
    >
      <RadioGroupItem
        value={value}
        aria-label={voiceLabel}
        className="size-6"
      />
      <span className="text-xl font-medium md:text-2xl">{label}</span>
    </label>
  );
}
