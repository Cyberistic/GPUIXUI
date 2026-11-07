export interface TipTiming {
  readonly delay: number;

  readonly closeGrace: number;

  readonly skipDelay: number;

  readonly exitWindow: number;
}

export const tipTiming: TipTiming = {
  delay: 0,
  closeGrace: 80,
  skipDelay: 300,
  exitWindow: 160,
};

export const reducedTipTiming: TipTiming = { ...tipTiming, exitWindow: 0 };

export interface TipTimer {
  readonly after: number;

  readonly kind: "open" | "grace" | "exit";
}

export interface TipState {
  readonly open: boolean;

  readonly held: boolean;

  readonly leaving: boolean;
  readonly timer: TipTimer | null;
}

export const closedTip: TipState = {
  open: false,
  held: false,
  leaving: false,
  timer: null,
};

export type TipEvent =
  | { readonly type: "enter"; readonly recentlyClosed?: boolean }
  | { readonly type: "leave" }
  | { readonly type: "enter-tip" }
  | { readonly type: "press" }
  | { readonly type: "focus" }
  | { readonly type: "blur" }
  | { readonly type: "escape" }
  | { readonly type: "traversal" }
  | { readonly type: "elapsed" };

const openNow: TipState = {
  open: true,
  held: false,
  leaving: false,
  timer: null,
};

const resting = (state: TipState, timing: TipTiming, held: boolean): TipState =>
  state.open
    ? {
        open: false,
        held,
        leaving: timing.exitWindow > 0,
        timer:
          timing.exitWindow > 0
            ? { after: timing.exitWindow, kind: "exit" }
            : null,
      }
    : { ...state, held };

export const tipAfter = (
  state: TipState,
  event: TipEvent,
  timing: TipTiming = tipTiming,
): TipState => {
  switch (event.type) {
    case "enter":
      if (state.held) return state;
      if (state.open) return { ...state, timer: null };
      return {
        open: false,
        held: false,
        leaving: state.leaving,
        timer: {
          after: event.recentlyClosed === true ? 0 : timing.delay,
          kind: "open",
        },
      };
    case "leave":
      return state.open
        ? {
            ...state,
            held: false,
            timer: { after: timing.closeGrace, kind: "grace" },
          }
        : { ...state, held: false };
    case "enter-tip":
      return state.timer?.kind === "grace" ? { ...state, timer: null } : state;
    case "press":
      return resting(state, timing, true);
    case "escape":
      return state.open ? resting(state, timing, true) : state;
    case "focus":
      return openNow;
    case "blur":
      return resting(state, timing, false);
    case "traversal":
      return state;
    case "elapsed": {
      const timer = state.timer;
      if (timer === null) return state;
      if (timer.kind === "open") return openNow;

      if (timer.kind === "grace") return resting(state, timing, false);
      return { ...state, leaving: false, timer: null };
    }
  }
};

export const describeTip = (
  state: TipState,
  timing: TipTiming = tipTiming,
): string => {
  if (state.timer?.kind === "open") {
    return `opening in ${state.timer.after} ms`;
  }
  if (state.leaving) {
    return `leaving — ${state.timer?.after ?? 0} ms until it unmounts`;
  }
  if (state.open) {
    return `open — a press or Escape closes it${
      state.timer?.kind === "grace"
        ? `; leaving closes it in ${timing.closeGrace} ms unless the pointer reaches the tip`
        : ""
    }`;
  }
  return state.held
    ? "closed by a press — the pointer must leave before it opens again"
    : "closed";
};
