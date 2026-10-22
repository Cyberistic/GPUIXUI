/**
 * `focus-traversal` — focus, blur and native focus traversal.
 *
 * This is the capability the whole library depends on: without focus/blur
 * delivery there are no focus rings, no keyboard focus state and no dialog
 * focus management. ADR 0002 measured that GPUix 0.5.1 never delivers
 * `onFocus`; **0.10.0 does** — this scenario is the measurement.
 *
 * Measured on this host (plan `140` §4):
 *
 * - `autoFocus` takes **native** focus but does not dispatch `onFocus`, so the
 *   runtime channel (`getFocusedElementId`) is the proof for it;
 * - a click and a native traversal (`window.focus_next`) both dispatch
 *   `onFocus`/`onBlur`, which is what a focus ring is painted from;
 * - a synthetic `"tab"` keystroke reaches the focused element's `onKeyDown` but
 *   does **not** itself traverse in the `TestRenderer`, so traversal is
 *   asserted through the runtime's `focusNext`/`focusPrevious`.
 *
 * **The traversal half is the `TestRenderer`'s, not a window's.** A real
 * window's `Tab` traversal focuses the element and delivers no `onFocus`, so a
 * component may not derive a state from it — the live `tabs-lifecycle` and
 * `tooltip-lifecycle` probes read `focuses=0` and a tip that stays closed, and
 * `README.md` records why. This scenario proves the offscreen channel works;
 * it is not evidence that a traversal reaches a handler in an app.
 *
 * The ring is painted from React state, not a `focusVisible` style: GPUix
 * 0.10.0 has no `:focus-visible` equivalent in `StyleDesc`, so a component
 * library must own this itself. Writing `focusVisible` in `style` would be
 * silently ignored.
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";

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

export const focusScenario: ScenarioBody = {
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

      // A click focuses and dispatches `onFocus` — the event a focus ring needs.
      ctx.host.click("focus-b");
      yield* ctx.expectContains(
        "click dispatched onFocus for B",
        readout(ctx),
        "focus=focus-b",
      );
      const afterClick = yield* ctx.expectSome(
        "runtime reports the clicked focus",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "runtime agrees with the React readout",
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
      yield* ctx.expectContains(
        "traversal dispatched onFocus",
        readout(ctx),
        `focus=${afterNext}`,
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
