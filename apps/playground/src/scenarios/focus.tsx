/**
 * `focus-traversal` — focus, blur and native focus traversal.
 *
 * This is the capability the whole library depends on: without a focus source
 * there are no focus rings, no keyboard focus state and no dialog focus
 * management. ADR 0002 measured that GPUix 0.5.1 never delivers `onFocus`; the
 * pinned release tag of 0.10.0 does **not** either (plan `529` §6.5) — this
 * scenario is the measurement of what it does deliver.
 *
 * Measured on this host (plans `140`, `529`):
 *
 * - `autoFocus`, a click and a native traversal (`window.focus_next`) all move
 *   **native** focus, which the runtime reports through
 *   `getFocusedElementId()`; none of them dispatches React's `onFocus`;
 * - a click does run the previously focused element's `onBlur`, so blur is the
 *   one React focus event a component receives;
 * - a synthetic `"tab"` keystroke reaches the focused element's `onKeyDown` but
 *   does **not** itself traverse in the `TestRenderer`, so traversal is
 *   asserted through the runtime's `focusNext`/`focusPrevious`.
 *
 * A focus ring therefore cannot be painted from `onFocus` on this runtime.
 * The alternatives and the decision are recorded in the primitives package
 * (plan `583`); this probe only pins the event contract, and also records that
 * GPUix 0.10.0 has no `:focus-visible` equivalent in `StyleDesc`, so writing
 * `focusVisible` in `style` would be silently ignored.
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";

const FocusProbe = () => {
  const theme = useTheme();
  const [focused, setFocused] = useState("none");
  const field = (id: string) => ({
    testId: id,
    tabIndex: 0,
    role: "button",
    onFocus: () => setFocused(id),
    onBlur: () => setFocused((current) => (current === id ? "none" : current)),
    style: {
      padding: 12,
      borderWidth: 1,
      borderColor: focused === id ? theme.colors.primary : theme.colors.border,
    },
  });

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 320 }}
    >
      <div {...field("focus-a")} autoFocus>
        <text style={{ color: theme.colors.foreground }}>A</text>
      </div>
      <div {...field("focus-b")}>
        <text style={{ color: theme.colors.foreground }}>B</text>
      </div>
      <Readout testId="focus-readout">{`focus=${focused}`}</Readout>
    </div>
  );
};

/** The `focus=` readout, or `""` when the readout element is missing. */
const readout = (ctx: Smoke.SmokeContext): string =>
  pipe(
    Option.fromNullishOr(ctx.host.text("focus-readout")),
    Option.getOrElse(() => ""),
  );

export const focusScenario: PlaygroundScenario = {
  id: "focus-traversal",
  title: "Focus: autoFocus, click-to-focus and native traversal",
  capability: "focus",
  view: () => <FocusProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // `autoFocus` takes native focus without dispatching `onFocus`, so the
      // runtime channel is the proof for it.
      const mounted = yield* ctx.expectSome(
        "native focus after autoFocus",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual("autoFocus landed on A", mounted, "focus-a");

      // 0.10.0 moves native focus on a click and runs the previous element's
      // `onBlur`, but does not dispatch React's `onFocus` (plans 345/390 measured
      // this in a window; the release build reproduces it headless, plan 529).
      ctx.host.click("focus-b");
      yield* ctx.expectContains(
        "the click ran the previous element's onBlur",
        readout(ctx),
        "focus=none",
      );
      const afterClick = yield* ctx.expectSome(
        "runtime reports the clicked focus",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "the runtime focus is the clicked element",
        afterClick,
        "focus-b",
      );

      // Native traversal: `window.focus_next`, which is what Tab maps to.
      ctx.host.focusNext();
      const afterNext = yield* ctx.expectSome(
        "native focus after focusNext",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "focusNext moved focus off B",
        afterNext !== "focus-b",
        true,
      );
      // No focus path on 0.10.0 dispatches React's `onFocus` (a click, autoFocus
      // and a traversal all leave the readout at `none`), so a component cannot
      // derive a focus ring from `onFocus` on the published runtime (plan 529
      // §6.3; plans 345/390 measured the live half).
      yield* ctx.expectEqual(
        "traversal did not dispatch onFocus",
        readout(ctx),
        "focus=none",
      );

      ctx.host.focusPrevious();
      const afterPrevious = yield* ctx.expectSome(
        "native focus after focusPrevious",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "focusPrevious returned to B",
        afterPrevious,
        "focus-b",
      );
    }),
};
