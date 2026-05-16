/**
 * TimeoutManager + useTimeout
 *
 * KS X 9211:2025 8.2.2  "시간 제한 + 연장 기능"
 *   - 학습자에게 정해진 시간이 지나면 자동 진행
 *   - 만료 20초 전에 음성 + 시각으로 경고
 *   - 학습자가 명시적으로 연장(60초 추가)할 수 있어야 함
 *
 * 본 모듈은 두 가지 형태를 제공한다:
 *   1) TimeoutManager (low-level 클래스) — Phase 4 비-React 흐름에서도 재사용 가능
 *   2) useTimeout (React 훅) — 페이지 컴포넌트에서 1줄로 적용
 */

"use client";

import * as React from "react";

export interface TimeoutCallbacks {
  /** 만료 warningTime ms 전에 호출 (기본 만료 20초 전) */
  onWarning: () => void;
  /** 만료 시 호출 — 페이지가 자동 진행, 데이터 폐기 등 */
  onExpire: () => void;
}

export class TimeoutManager {
  /** 만료까지 남은 ms — start 시점에 현재 시간 + timeout */
  private expireAt: number | null = null;
  private warningTime: number;
  private mainTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: TimeoutCallbacks | null = null;
  private warned = false;

  constructor(warningLeadMs = 20_000) {
    this.warningTime = warningLeadMs;
  }

  /**
   * 새 타이머를 시작한다. timeoutMs 가 0 이하면 무제한으로 간주 (시작 안 함).
   */
  start(timeoutMs: number, callbacks: TimeoutCallbacks): void {
    this.cancel();
    if (timeoutMs <= 0) return;
    this.callbacks = callbacks;
    this.warned = false;
    this.expireAt = Date.now() + timeoutMs;
    this.schedule();
  }

  /** 처음부터 다시 시작 — 학습자가 화면을 만졌을 때 idle reset 등 */
  reset(): void {
    if (!this.expireAt || !this.callbacks) return;
    const total = this.expireAt - Date.now();
    if (total <= 0) return;
    // 같은 timeoutMs 로 다시 시작
    this.start(total, this.callbacks);
  }

  /** 추가 시간 부여 (학습자가 "더 시간 주세요" 선택) */
  extend(additionalMs: number): void {
    if (!this.expireAt || !this.callbacks) return;
    this.expireAt += additionalMs;
    this.warned = false;
    this.schedule();
  }

  /** 남은 ms — 진행률 표시용 */
  getRemainingMs(): number {
    if (!this.expireAt) return 0;
    return Math.max(0, this.expireAt - Date.now());
  }

  cancel(): void {
    if (this.mainTimer) clearTimeout(this.mainTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    this.mainTimer = null;
    this.warningTimer = null;
    this.expireAt = null;
    this.callbacks = null;
    this.warned = false;
  }

  // ── 내부 ────────────────────────────────────────────

  private schedule(): void {
    if (!this.expireAt || !this.callbacks) return;
    const now = Date.now();
    const remaining = this.expireAt - now;
    const warningAt = remaining - this.warningTime;

    if (this.mainTimer) clearTimeout(this.mainTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);

    if (!this.warned && warningAt > 0) {
      this.warningTimer = setTimeout(() => {
        this.warned = true;
        this.callbacks?.onWarning();
      }, warningAt);
    } else if (!this.warned) {
      // 이미 경고 시점이 지난 상태에서 start 한 경우 즉시 경고
      this.warned = true;
      this.callbacks?.onWarning();
    }

    this.mainTimer = setTimeout(() => {
      this.callbacks?.onExpire();
      this.cancel();
    }, Math.max(0, remaining));
  }
}

/**
 * 페이지에서 1줄로 쓰는 React 훅.
 *
 * 예:
 *   useTimeout({
 *     timeoutMs: 5 * 60 * 1000,
 *     onWarning: () => setWarningVisible(true),
 *     onExpire: () => router.push("/timeout"),
 *   });
 *
 * timeoutMs 가 0 이하면 무제한 — 훅이 아무 일도 하지 않음.
 */
export interface UseTimeoutOptions extends TimeoutCallbacks {
  timeoutMs: number;
  /** 만료 전 경고를 띄울 시점 (기본 20s) */
  warningLeadMs?: number;
  /** false 면 즉시 cancel — 페이지가 일시 비활성일 때 (기본 true) */
  enabled?: boolean;
}

export function useTimeout({
  timeoutMs,
  warningLeadMs = 20_000,
  onWarning,
  onExpire,
  enabled = true,
}: UseTimeoutOptions) {
  const managerRef = React.useRef<TimeoutManager | null>(null);
  const onWarningRef = React.useRef(onWarning);
  const onExpireRef = React.useRef(onExpire);

  // 최신 콜백 사용 — manager 가 stale closure 를 잡지 않도록.
  React.useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);
  React.useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  if (managerRef.current === null) {
    managerRef.current = new TimeoutManager(warningLeadMs);
  }

  React.useEffect(() => {
    const manager = managerRef.current!;
    if (!enabled || timeoutMs <= 0) {
      manager.cancel();
      return;
    }
    manager.start(timeoutMs, {
      onWarning: () => onWarningRef.current(),
      onExpire: () => onExpireRef.current(),
    });
    return () => manager.cancel();
  }, [timeoutMs, enabled, warningLeadMs]);

  return {
    extend: (ms: number) => managerRef.current?.extend(ms),
    reset: () => managerRef.current?.reset(),
    cancel: () => managerRef.current?.cancel(),
    getRemainingMs: () => managerRef.current?.getRemainingMs() ?? 0,
  };
}

/** 모드별 학습 시간 한도 (PROJECT_DESIGN 보충). ms 단위. 0 = 무제한 */
export const MODE_TIMEOUTS: Record<
  "tutorial" | "practice" | "challenge" | "realGuided" | "realFree",
  number
> = {
  tutorial: 0, // 시연 모드 — 무제한
  practice: 5 * 60 * 1000,
  challenge: 4 * 60 * 1000,
  realGuided: 3 * 60 * 1000,
  realFree: 0, // 자유 탐색 — 무제한
};
