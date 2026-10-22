/**
 * Guards the first conformance slice.
 *
 * Bug guarded: the native fields used the invented `comfortable` density
 * (32px / 10px) instead of shadcn's `h-9 px-3 py-1` (36 / 12 / 4), and the
 * components had no class compiler at all. These tests pin the upstream values
 * and the state buckets the components apply.
 */

import { describe, expect, it } from "vitest";
import type { MotionStyle } from "@gpuix/react";
import { alpha, lightTheme } from "@gpuixui/tokens";
import { cn } from "cn";
import { classesToStyle } from "./classes.js";
import {
  dialogMotion,
  motionFromClasses,
  toastMotion,
  type TwMotion,
} from "./motion.js";
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  DIALOG_CONTENT,
  INPUT_BASE,
  INPUT_FOCUS,
  INPUT_INVALID,
  POPOVER_CONTENT,
} from "./recipes.js";

const input = classesToStyle(
  `${INPUT_BASE} ${INPUT_FOCUS} ${INPUT_INVALID}`,
  lightTheme,
);
const buttonDefault = classesToStyle(
  `${BUTTON_BASE} ${BUTTON_VARIANTS.default} ${BUTTON_SIZES.default}`,
  lightTheme,
);

/** `MotionProps.initial` is `false | MotionStyle | undefined`. */
const initialOf = (motion: TwMotion): MotionStyle =>
  motion.initial === false || motion.initial === undefined
    ? {}
    : motion.initial;

describe("cn", () => {
  it("resolves the last conflicting utility like shadcn's cn", () => {
    expect(cn("px-3", "px-4")).toBe("px-4");
    expect(classesToStyle("px-3 px-4", lightTheme).style.paddingLeft).toBe(16);
  });

  it("joins conditions", () => {
    expect(cn("h-9", false, "px-3", { "text-sm": true })).toContain("px-3");
  });
});

describe("Input recipe", () => {
  it("uses the density's 32 / 12 / 4 geometry", () => {
    expect(input.style.height).toBe(32);
    expect(input.style.paddingLeft).toBe(12);
    expect(input.style.paddingRight).toBe(12);
    expect(input.style.paddingTop).toBe(4);
    expect(input.style.paddingBottom).toBe(4);
    expect(input.style.borderRadius).toBe(6);
    expect(input.style.fontSize).toBe(14);
    expect(input.style.lineHeight).toBe(20);
    expect(input.style.width).toBe("100%");
    expect(input.style.minWidth).toBe(0);
    expect(input.style.borderWidth).toBe(1);
    expect(input.style.borderColor).toBe(lightTheme.colors.border);
  });

  it("routes focus, invalid and disabled to their own buckets", () => {
    expect(input.focus.borderColor).toBe(lightTheme.colors.ring);
    expect(input.focus.boxShadow).toEqual({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: 3,
      color: alpha(lightTheme.colors.ring, 0.5),
    });
    expect(input.invalid.borderColor).toBe(lightTheme.colors.destructive);
    expect(input.disabled.opacity).toBe(0.5);
    expect(input.disabled.pointerEvents).toBe("none");
  });

  it("records what the runtime cannot express instead of dropping it", () => {
    expect(input.unsupported).toContain("transition-[color,box-shadow]");
    expect(input.unsupported).toContain("selection:bg-primary");
    expect(input.unsupported).toContain("placeholder:text-muted-foreground");
    expect(input.responsive).toContain("md:text-sm");
  });
});

describe("Button recipe", () => {
  it("uses shadcn's default height, padding, gap and type", () => {
    expect(buttonDefault.style.height).toBe(32);
    expect(buttonDefault.style.paddingLeft).toBe(16);
    expect(buttonDefault.style.paddingRight).toBe(16);
    expect(buttonDefault.style.paddingTop).toBe(8);
    expect(buttonDefault.style.paddingBottom).toBe(8);
    expect(buttonDefault.style.gap).toBe(8);
    expect(buttonDefault.style.borderRadius).toBe(6);
    expect(buttonDefault.style.fontSize).toBe(14);
    expect(buttonDefault.style.hover?.backgroundColor).toBe(
      alpha(lightTheme.colors.primary, 0.9),
    );
  });

  it("keeps the density size table", () => {
    const sm = classesToStyle(
      `${BUTTON_BASE} ${BUTTON_VARIANTS.default} ${BUTTON_SIZES.sm}`,
      lightTheme,
    );
    const lg = classesToStyle(
      `${BUTTON_BASE} ${BUTTON_VARIANTS.default} ${BUTTON_SIZES.lg}`,
      lightTheme,
    );
    const icon = classesToStyle(
      `${BUTTON_BASE} ${BUTTON_VARIANTS.default} ${BUTTON_SIZES.icon}`,
      lightTheme,
    );
    expect(sm.style.height).toBe(28);
    expect(sm.style.paddingLeft).toBe(12);
    expect(lg.style.height).toBe(36);
    expect(lg.style.paddingLeft).toBe(24);
    expect(icon.style.width).toBe(32);
    expect(icon.style.height).toBe(32);
  });

  it("keeps the destructive variant's literal white label", () => {
    const destructive = classesToStyle(
      `${BUTTON_BASE} ${BUTTON_VARIANTS.destructive} ${BUTTON_SIZES.default}`,
      lightTheme,
    );
    expect(destructive.style.color).toBe("#FFFFFF");
    expect(destructive.style.backgroundColor).toBe(
      lightTheme.colors.destructive,
    );
  });
});

describe("motion", () => {
  it("maps the dialog fade and keeps zoom unsupported", () => {
    const motion = motionFromClasses(DIALOG_CONTENT, lightTheme);
    expect(initialOf(motion).opacity).toBe(0);
    expect(motion.animate.opacity).toBe(1);
    expect(motion.exit?.opacity).toBe(0);
    expect(motion.transition?.duration).toBe(0.1);
    expect(motion.unsupported).toContain("data-open:zoom-in-95");
    expect(motion.unsupported).toContain("data-closed:zoom-out-95");
  });

  it("maps the popover slide offset", () => {
    const motion = motionFromClasses(POPOVER_CONTENT, lightTheme);
    expect(initialOf(motion).top).toBe(-8);
    expect(motion.animate.top).toBe(0);
  });

  it("uses the toast's 500 ms cubic bezier", () => {
    const motion = toastMotion(lightTheme);
    expect(motion.transition?.duration).toBe(0.5);
    expect(motion.transition?.ease).toEqual([0.22, 1, 0.36, 1]);
  });

  it("exposes the simple dialog helper", () => {
    const motion = dialogMotion(lightTheme);
    expect(motion.transition?.duration).toBe(0.1);
    expect(motion.unsupported).toEqual([]);
  });
});
