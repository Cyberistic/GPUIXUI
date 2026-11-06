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

const readout = (ctx: Smoke.SmokeContext): string =>
  pipe(
    Option.fromNullishOr(ctx.host.text("focus-readout")),
    Option.getOrElse(() => ""),
  );

export const focusScenario: ScenarioBody = {
  view: () => <FocusProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const mounted = yield* ctx.expectSome(
        "native focus after autoFocus",
        Option.fromNullishOr(ctx.host.focused()),
      );
      yield* ctx.expectEqual("autoFocus landed on A", mounted, "focus-a");

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
