/**
 * The AppKit pointer model on a real button (plan 724).
 *
 * Bugs guarded: `Button` takes its hover from its compiled recipe, not from
 * `controlStyle`, so a gate there left every macOS button washing on hover; and
 * an AppKit toolbar button must show its bezel under the pointer, the one hover
 * AppKit keeps.
 */
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { renderButton } from "./Button.js";
import { hostStyle } from "./testing/element.js";

const mac = platformTheme(lightTheme, "darwin");

const hoverOf = (theme: typeof mac, inToolbar = false) =>
  Option.getOrUndefined(
    hostStyle(
      renderButton(
        { variant: "ghost", children: "Share" },
        theme,
        { focused: false },
        false,
        undefined,
        inToolbar,
      ),
      "hover",
    ),
  ) as { readonly backgroundColor?: string } | undefined;

describe("the AppKit pointer model", () => {
  it("paints no hover on a macOS button", () => {
    expect(hoverOf(mac)).toBeUndefined();
  });

  it("keeps the web's hover on a pointer theme", () => {
    expect(hoverOf(lightTheme)?.backgroundColor).toBeDefined();
  });

  it("shows a toolbar button's bezel on macOS", () => {
    expect(hoverOf(mac, true)?.backgroundColor).toBe(mac.colors.muted);
  });
});
