/**
 * Guards the state-aware variants.
 *
 * Bug guarded: `has-[>svg]`, `has-data-[icon=*]`, `data-expanded`,
 * `data-behind`, `data-limited` and `aria-expanded` were reported unsupported
 * even though the owning component knows the answer. They now apply only when
 * the caller passes matching state; unknown state is never guessed.
 */

import { describe, expect, it } from "vitest";
import { lightTheme } from "@gpuixui/tokens";
import { classesToStyle } from "./classes.js";
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from "./recipes.js";
import type { TwState } from "./registry.js";

const compile = (className: string, state: TwState = {}) =>
  classesToStyle(className, lightTheme, undefined, state);

describe("has-[>svg]", () => {
  it("applies the icon padding only when an icon is present", () => {
    const withIcon = compile("h-9 px-4 has-[>svg]:px-3", { hasIcon: true });
    const withoutIcon = compile("h-9 px-4 has-[>svg]:px-3");

    expect(withIcon.style.paddingLeft).toBe(12);
    expect(withoutIcon.style.paddingLeft).toBe(16);
    expect(withoutIcon.unsupported).not.toContain("has-[>svg]:px-3");
  });

  it("matches the new-york button size when the icon state is known", () => {
    const result = compile(
      `${BUTTON_BASE} ${BUTTON_VARIANTS.default} ${BUTTON_SIZES.default}`,
      { hasIcon: true },
    );
    expect(result.style.paddingLeft).toBe(12);
    expect(result.style.paddingRight).toBe(12);
  });
});

describe("has-data-[icon=inline-*]", () => {
  const sizes =
    "h-9 px-3 has-data-[icon=inline-start]:pl-2 has-data-[icon=inline-end]:pr-2";

  it("applies the start inset only on the start edge", () => {
    expect(compile(sizes, { iconSide: "start" }).style.paddingLeft).toBe(8);
    expect(compile(sizes, { iconSide: "start" }).style.paddingRight).toBe(12);
  });

  it("applies the end inset only on the end edge", () => {
    expect(compile(sizes, { iconSide: "end" }).style.paddingRight).toBe(8);
    expect(compile(sizes, { iconSide: "end" }).style.paddingLeft).toBe(12);
  });

  it("leaves the base padding when no icon side is known", () => {
    expect(compile(sizes).style.paddingLeft).toBe(12);
    expect(compile(sizes).style.paddingRight).toBe(12);
  });
});

describe("expanded, behind and limited", () => {
  it("applies data-expanded only when expanded", () => {
    expect(
      compile("opacity-50 data-expanded:opacity-100", { expanded: true }).style
        .opacity,
    ).toBe(1);
    expect(compile("opacity-50 data-expanded:opacity-100").style.opacity).toBe(
      0.5,
    );
  });

  it("applies data-behind only when behind", () => {
    expect(
      compile("opacity-100 data-behind:opacity-0", { behind: true }).style
        .opacity,
    ).toBe(0);
    expect(compile("opacity-100 data-behind:opacity-0").style.opacity).toBe(1);
  });

  it("applies data-limited only when limited", () => {
    expect(
      compile("opacity-100 data-limited:opacity-0", { limited: true }).style
        .opacity,
    ).toBe(0);
    expect(compile("opacity-100 data-limited:opacity-0").style.opacity).toBe(1);
  });

  it("applies aria-expanded to the base style when expanded", () => {
    const result = compile("bg-background aria-expanded:bg-muted", {
      expanded: true,
    });
    expect(result.style.backgroundColor).toBe(lightTheme.colors.muted);
  });
});

describe("honesty", () => {
  it("keeps a transform state variant unsupported even when expanded", () => {
    const token =
      "data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]";
    expect(compile(token, { expanded: true }).unsupported).toContain(token);
  });
});
