/**
 * The tooltip preview's clock.
 *
 * The native tip is a thin themed wrapper over `@gpuix/react/tooltip`, and the
 * timing a reader cannot see in a drawing lives in that package: the provider's
 * delay is **0 ms**, a leaving pointer gets an **80 ms** grace so it can cross
 * the gap onto the tip, a tip reopened within **300 ms** of closing skips its
 * delay, and the trigger's `onFocus` opens it at once rather than through the
 * delay. A window's `Tab` traversal moves the focus without running that
 * handler (measured three times on 0.11.0), so the tip stays closed.
 *
 * The preview mirrors those rules instead of inventing a nicer tooltip, and the
 * machine is plain data so the page's claims can be pinned here. `null` is "the
 * tip is waiting for nothing"; there is no absence to model.
 */

/** How long each part of the tip's clock waits, in milliseconds. */
export interface TipTiming {
  /** The hover delay before a tip opens. */
  readonly delay: number;
  /** The grace a leaving pointer gets before the tip closes. */
  readonly closeGrace: number;
  /** A tip reopened within this window of closing skips its delay. */
  readonly skipDelay: number;
}

/**
 * The runtime's own numbers, read from its tooltip source by
 * `tooltip-preview.test.ts` — a change upstream fails the page rather than
 * leaving it teaching the previous clock.
 */
export const tipTiming: TipTiming = {
  delay: 0,
  closeGrace: 80,
  skipDelay: 300,
};

/** The one thing the tip is scheduled to do next. */
export interface TipTimer {
  /** Milliseconds until it happens. */
  readonly after: number;
  /** Whether it opens the tip or closes it. */
  readonly opens: boolean;
}

export interface TipState {
  readonly open: boolean;
  /** A press or Escape closed the tip; only leaving may arm it again. */
  readonly held: boolean;
  readonly timer: TipTimer | null;
}

/** A tip nobody has touched. */
export const closedTip: TipState = { open: false, held: false, timer: null };

export type TipEvent =
  /** The pointer entered the trigger. */
  | { readonly type: "enter"; readonly recentlyClosed?: boolean }
  /** The pointer left the trigger. */
  | { readonly type: "leave" }
  /** The pointer crossed the gap onto the tip itself. */
  | { readonly type: "enter-tip" }
  /** A press on the trigger — `onMouseDown` or `onClick`. */
  | { readonly type: "press" }
  /** The trigger's own `onFocus` ran. */
  | { readonly type: "focus" }
  /** The trigger's own `onBlur` ran. */
  | { readonly type: "blur" }
  /** Escape reached the topmost dismissable layer. */
  | { readonly type: "escape" }
  /** A `Tab` traversal reached the trigger without running its `onFocus`. */
  | { readonly type: "traversal" }
  /** A scheduled timer reached its end. */
  | { readonly type: "elapsed" };

const openNow: TipState = { open: true, held: false, timer: null };

/**
 * The tip's next state after one event.
 *
 * `recentlyClosed` is the caller's reading of the 300 ms skip window: the
 * runtime records the moment it closed a tip, and a re-entry inside that window
 * opens with no delay. A press and Escape both hold the tip shut while the
 * pointer stays where it is, because no event reopens it until it leaves.
 */
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
        timer: {
          after: event.recentlyClosed === true ? 0 : timing.delay,
          opens: true,
        },
      };
    case "leave":
      // Leaving before the delay elapsed cancels the open; leaving an open tip
      // starts the grace it gets to reach the tip.
      return {
        open: state.open,
        held: false,
        timer: state.open ? { after: timing.closeGrace, opens: false } : null,
      };
    case "enter-tip":
      // The pointer crossed the gap: the close the trigger scheduled is off.
      return state.timer?.opens === false
        ? { ...state, timer: null }
        : state;
    case "press":
      return { open: false, held: true, timer: null };
    case "escape":
      // Only an open tip has a dismissable layer to reach; a closed one ignores
      // the key, and an open one stays shut while the pointer remains.
      return state.open ? { open: false, held: true, timer: null } : state;
    case "focus":
      return openNow;
    case "blur":
      return closedTip;
    case "traversal":
      // The window measured no `onFocus` on a traversal, so there is no event.
      return state;
    case "elapsed":
      if (state.timer === null) return state;
      return state.timer.opens
        ? { open: true, held: false, timer: null }
        : closedTip;
  }
};

/**
 * What the preview's readout says, in the reader's terms.
 *
 * A scheduled close is worded as open, because the tip is still painted while
 * the grace runs — the one state a screenshot cannot distinguish.
 */
export const describeTip = (state: TipState, timing: TipTiming = tipTiming): string => {
  if (state.timer?.opens === true) {
    return `opening in ${state.timer.after} ms`;
  }
  if (state.open) {
    return `open — a press or Escape closes it${
      state.timer?.opens === false
        ? `; leaving closes it in ${timing.closeGrace} ms unless the pointer reaches the tip`
        : ""
    }`;
  }
  return state.held
    ? "closed by a press — the pointer must leave before it opens again"
    : "closed";
};
