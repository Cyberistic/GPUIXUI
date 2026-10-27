/**
 * The waits a hover surface opens and closes after.
 *
 * Two surfaces hold one hover card: the trigger the pointer rests on and the
 * card the pointer may travel into. Each is held by the pointer and by focus,
 * separately, because the runtime delivers the new element's `mouseEnter`
 * before the old one's `mouseLeave` — a single "inside" flag would be cleared by
 * the leave that arrives second while the pointer is already inside the other
 * surface.
 *
 * The presence and the one timer live in a `LocalState` store, not in a render:
 * the timer outlives the handler that armed it, and a re-render must not reset
 * the wait. The open state itself stays the component's (`open`/`onOpenChange`),
 * so the store asks the latest render to change it through {@link HoverTiming}.
 *
 * One timer slot serves both delays: an arrival cancels a scheduled leave, a
 * departure cancels a scheduled arrival, and a schedule replaces whatever was
 * waiting. {@link HoverControls.cancel} is the immediate path — a press or a
 * dismissal is not a wait.
 */

import { Effect } from "effect";
import { useRef } from "react";
import { makeLocalState, send, useLocalStore } from "./local-state.js";

/** One of the two surfaces a hover card owns. */
export type HoverSurfaceName = "trigger" | "content";

/** Which surface the pointer and focus hold, per surface. */
interface HoverHold {
  readonly pointer: Readonly<Record<HoverSurfaceName, boolean>>;
  readonly focus: Readonly<Record<HoverSurfaceName, boolean>>;
}

/** The store's one value: nothing holds either surface. */
const released: HoverHold = {
  pointer: { trigger: false, content: false },
  focus: { trigger: false, content: false },
};

const holdStore = Effect.map(makeLocalState(released), (local) => ({
  local,
}));

/** The open state and the waits the store schedules against. */
export interface HoverTiming {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** Milliseconds before a hover opens the card. */
  readonly openDelay: number;
  /** Milliseconds after the last hold leaves before it closes. */
  readonly closeDelay: number;
}

/** What the trigger and the surface use to drive the waits. */
export interface HoverControls {
  /** The pointer entered or left one surface. */
  readonly pointer: (surface: HoverSurfaceName, present: boolean) => void;
  /** Focus entered or left one surface; entering opens at once. */
  readonly focus: (surface: HoverSurfaceName, present: boolean) => void;
  /** Drop the armed wait: a press or a dismissal is not a delay. */
  readonly cancel: () => void;
  /** Drop an armed arrival, keeping a scheduled departure. */
  readonly cancelOpening: () => void;
  /** Change the open state, at most once per transition. */
  readonly request: (open: boolean) => void;
  /** Whether the pointer or focus holds either surface. */
  readonly held: () => boolean;
}

const holds = (hold: HoverHold): boolean =>
  hold.pointer.trigger ||
  hold.pointer.content ||
  hold.focus.trigger ||
  hold.focus.content;

/**
 * The waits a hover surface runs.
 *
 * `timing` is read from the latest render through a ref, so a timer armed by an
 * earlier render still asks the render that owns the current `setOpen`.
 */
export const useHoverDelays = (timing: HoverTiming): HoverControls => {
  const { local } = useLocalStore(holdStore);
  const latest = useRef(timing);
  latest.current = timing;

  const cancel = (): void => {
    send(local.cancel);
  };

  /** An immediate change; the caller cancels the wait it overrides. */
  const request = (open: boolean): void => {
    if (latest.current.open === open) return;
    latest.current.setOpen(open);
  };

  const aim = (open: boolean, delay: number): void => {
    cancel();
    send(
      local.after(
        delay,
        Effect.sync(() => {
          request(open);
        }),
      ),
    );
  };

  const hold = (
    channel: "pointer" | "focus",
    surface: HoverSurfaceName,
    present: boolean,
  ): void => {
    const state = local.read();
    const next: HoverHold = {
      ...state,
      [channel]: { ...state[channel], [surface]: present },
    };
    send(local.write(next));

    if (present) {
      cancel();
      if (latest.current.open) return;
      if (channel === "focus") {
        request(true);
        return;
      }
      aim(true, latest.current.openDelay);
      return;
    }
    if (holds(next)) return;
    if (!latest.current.open) {
      cancel();
      return;
    }
    aim(false, latest.current.closeDelay);
  };

  return {
    pointer: (surface, present) => hold("pointer", surface, present),
    focus: (surface, present) => hold("focus", surface, present),
    cancel,
    cancelOpening: () => {
      if (!latest.current.open) cancel();
    },
    request,
    held: () => holds(local.read()),
  };
};
