import { Effect } from "effect";
import { useRef } from "react";
import { makeLocalState, send, useLocalStore } from "./local-state.js";

export type HoverSurfaceName = "trigger" | "content";

interface HoverHold {
  readonly pointer: Readonly<Record<HoverSurfaceName, boolean>>;
  readonly focus: Readonly<Record<HoverSurfaceName, boolean>>;
}

const released: HoverHold = {
  pointer: { trigger: false, content: false },
  focus: { trigger: false, content: false },
};

const holdStore = Effect.map(makeLocalState(released), (local) => ({
  local,
}));

export interface HoverTiming {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;

  readonly openDelay: number;

  readonly closeDelay: number;
}

export interface HoverControls {
  readonly pointer: (surface: HoverSurfaceName, present: boolean) => void;

  readonly focus: (surface: HoverSurfaceName, present: boolean) => void;

  readonly cancel: () => void;

  readonly cancelOpening: () => void;

  readonly request: (open: boolean) => void;

  readonly held: () => boolean;
}

const holds = (hold: HoverHold): boolean =>
  hold.pointer.trigger ||
  hold.pointer.content ||
  hold.focus.trigger ||
  hold.focus.content;

export const useHoverDelays = (timing: HoverTiming): HoverControls => {
  const { local } = useLocalStore(holdStore);
  const latest = useRef(timing);
  latest.current = timing;

  const cancel = (): void => {
    send(local.cancel);
  };

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
