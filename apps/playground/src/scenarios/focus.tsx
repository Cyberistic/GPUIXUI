/**
 * `focus-traversal` — focus, Tab and click-to-focus.
 *
 * This is the capability the whole library depends on: without focus/blur
 * delivery there are no focus rings, no keyboard focus state and no dialog
 * focus management. ADR 0002 measured that GPUix 0.5.1 never delivers
 * `onFocus`; the 0.10 suite is what confirms it here. The scenario asserts both
 * channels — the `onFocus` readout in React and `getFocusedElementId` in the
 * runtime — because they can disagree.
 *
 * The ring is painted from React state, not a `focusVisible` style: GPUix
 * 0.10.0 has no `:focus-visible` equivalent in `StyleDesc` (verified against
 * the installed `@gpuix/native@0.10.0` types), so a component library must own
 * this itself. Writing `focusVisible` in `style` would be silently ignored.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { theme } from "../theme.js";
import type { PlaygroundScenario } from "../types.js";

const FocusProbe = () => {
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
      borderColor: focused === id ? theme.accent : theme.border,
    },
  });

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 320 }}
    >
      <div {...field("focus-a")} autoFocus>
        <text style={{ color: theme.text }}>A</text>
      </div>
      <div {...field("focus-b")}>
        <text style={{ color: theme.text }}>B</text>
      </div>
      <text testId="focus-readout" style={{ color: theme.muted, fontSize: 12 }}>
        {`focus=${focused}`}
      </text>
    </div>
  );
};

export const focusScenario: PlaygroundScenario = {
  id: "focus-traversal",
  title: "Focus: autoFocus, Tab, Shift+Tab and click",
  capability: "focus",
  view: () => <FocusProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const initial = yield* ctx.expectSome(
        "focus readout present",
        Option.fromNullishOr(ctx.host.text("focus-readout")),
      );
      yield* ctx.expectContains(
        "autoFocus landed on A",
        initial,
        "focus=focus-a",
      );

      ctx.host.key("tab");
      const afterTab = yield* ctx.expectSome(
        "focus readout after Tab",
        Option.fromNullishOr(ctx.host.text("focus-readout")),
      );
      yield* ctx.expectContains(
        "Tab moved focus to B",
        afterTab,
        "focus=focus-b",
      );

      ctx.host.key("shift-tab");
      const afterShiftTab = yield* ctx.expectSome(
        "focus readout after Shift+Tab",
        Option.fromNullishOr(ctx.host.text("focus-readout")),
      );
      yield* ctx.expectContains(
        "Shift+Tab returned to A",
        afterShiftTab,
        "focus=focus-a",
      );

      ctx.host.click("focus-b");
      const afterClick = yield* ctx.expectSome(
        "focus readout after click",
        Option.fromNullishOr(ctx.host.text("focus-readout")),
      );
      yield* ctx.expectContains("click focused B", afterClick, "focus=focus-b");

      const runtimeFocus = yield* ctx.expectSome(
        "runtime reports a focused element",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual(
        "runtime reports the focused testId",
        runtimeFocus,
        "focus-b",
      );
    }),
};
