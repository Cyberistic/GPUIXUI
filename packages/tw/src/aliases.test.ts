/**
 * Guards the luma `cn-*` aliases the Base UI registry writes.
 *
 * Bug guarded: Base UI sources use `cn-input` / `cn-button` instead of long
 * class strings, and without an alias table those hooks are unsupported. The
 * tests also record where luma deliberately differs from new-york-v4, so a
 * future "fix" cannot quietly replace one preset with the other.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import { alpha, lightTheme } from "@gpuixui/tokens";
import { BASE_ALIASES } from "./aliases.js";
import { classesToStyle } from "./classes.js";
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  DIALOG_CONTENT,
  INPUT_BASE,
  POPOVER_CONTENT,
} from "./recipes.js";

const style = (className: string) => classesToStyle(className, lightTheme);

const REQUIRED = [
  "cn-input",
  "cn-textarea",
  "cn-button",
  "cn-button-variant-default",
  "cn-button-variant-outline",
  "cn-button-variant-secondary",
  "cn-button-variant-ghost",
  "cn-button-variant-destructive",
  "cn-button-variant-link",
  "cn-button-size-xs",
  "cn-button-size-sm",
  "cn-button-size-default",
  "cn-button-size-lg",
  "cn-button-size-icon",
  "cn-button-size-icon-xs",
  "cn-button-size-icon-sm",
  "cn-button-size-icon-lg",
  "cn-dialog-overlay",
  "cn-dialog-content",
  "cn-dialog-title",
  "cn-dialog-description",
  "cn-dialog-header",
  "cn-dialog-footer",
  "cn-dialog-close",
  "cn-popover-content",
  "cn-popover-header",
  "cn-popover-title",
  "cn-popover-description",
  "cn-toast",
  "cn-skeleton",
] as const;

describe("cn-* alias table", () => {
  it("maps every required hook", () => {
    expect(Arr.filter(REQUIRED, (name) => !R.has(BASE_ALIASES, name))).toEqual(
      [],
    );
  });

  it("never reports a mapped hook as unsupported", () => {
    expect(
      Arr.filter(REQUIRED, (name) => style(name).unsupported.includes(name)),
    ).toEqual([]);
  });
});

describe("cn-input", () => {
  const luma = style("cn-input");
  const newYork = style(INPUT_BASE);

  it("resolves the luma geometry", () => {
    expect(luma.style.height).toBe(36);
    expect(luma.style.paddingLeft).toBe(12);
    expect(luma.style.paddingRight).toBe(12);
    expect(luma.style.paddingTop).toBe(4);
    expect(luma.style.paddingBottom).toBe(4);
    expect(luma.style.fontSize).toBe(14);
    expect(luma.style.lineHeight).toBe(20);
    expect(luma.style.backgroundColor).toBe(
      alpha(lightTheme.colors.input, 0.5),
    );
    expect(luma.focus.borderColor).toBe(lightTheme.colors.ring);
    expect(luma.focus.boxShadow?.spreadRadius).toBe(3);
    expect(luma.focus.boxShadow?.color).toBe(
      alpha(lightTheme.colors.ring, 0.3),
    );
  });

  it("keeps luma's round, filled preset instead of new-york's square one", () => {
    expect(luma.style.borderRadius).toBe(24);
    expect(luma.style.borderColor).toBe("transparent");
    expect(newYork.style.borderRadius).toBe(6);
    expect(newYork.style.borderColor).toBe(lightTheme.colors.border);
    expect(newYork.style.backgroundColor).toBe("transparent");
    expect(luma.style.height).toBe(newYork.style.height);
  });

  it("expands before cn, so the caller's padding wins", () => {
    expect(style("cn-input px-6").style.paddingLeft).toBe(24);
  });
});

describe("cn-button", () => {
  const luma = style(
    "cn-button cn-button-variant-default cn-button-size-default",
  );
  const newYork = style(
    `${BUTTON_BASE} ${BUTTON_VARIANTS.default} ${BUTTON_SIZES.default}`,
  );

  it("keeps luma's 32px radius and tighter geometry", () => {
    expect(luma.style.borderRadius).toBe(32);
    expect(luma.style.height).toBe(36);
    expect(luma.style.paddingLeft).toBe(12);
    expect(luma.style.gap).toBe(6);
    expect(luma.style.fontSize).toBe(14);
    expect(luma.style.hover?.backgroundColor).toBe(
      alpha(lightTheme.colors.primary, 0.8),
    );
  });

  it("differs from new-york only in the preset values", () => {
    expect(newYork.style.borderRadius).toBe(6);
    expect(newYork.style.paddingLeft).toBe(16);
    expect(newYork.style.gap).toBe(8);
    expect(newYork.style.hover?.backgroundColor).toBe(
      alpha(lightTheme.colors.primary, 0.9),
    );
    expect(luma.style.height).toBe(newYork.style.height);
  });

  it("resolves the size table and the icon-side state", () => {
    expect(style("cn-button cn-button-size-sm").style.height).toBe(32);
    expect(style("cn-button cn-button-size-lg").style.height).toBe(40);
    const start = classesToStyle(
      "cn-button cn-button-size-default",
      lightTheme,
      undefined,
      { iconSide: "start" },
    );
    expect(start.style.paddingLeft).toBe(10);
    expect(start.style.paddingRight).toBe(12);
  });
});

describe("cn-dialog-* and cn-popover-*", () => {
  it("matches the new-york dialog surface where the intent is identical", () => {
    const luma = style("cn-dialog-content").style;
    const newYork = style(DIALOG_CONTENT).style;
    expect(luma.borderRadius).toBe(32);
    expect(luma.padding).toBe(24);
    expect(luma.gap).toBe(24);
    expect(luma.backgroundColor).toBe(lightTheme.colors.popover);
    expect(luma.maxWidth).toBe(448);
    expect(luma.boxShadow?.spreadRadius).toBe(1);
    expect(luma.boxShadow?.color).toBe(
      alpha(lightTheme.colors.foreground, 0.05),
    );
    expect(luma.borderRadius).toBe(newYork.borderRadius);
    expect(luma.maxWidth).toBe(newYork.maxWidth);
  });

  it("resolves the dialog parts", () => {
    const close = style("cn-dialog-close").style;
    expect(close.position).toBe("absolute");
    expect(close.top).toBe(16);
    expect(close.right).toBe(16);
    expect(close.backgroundColor).toBe(lightTheme.colors.secondary);
    expect(style("cn-dialog-title").style.fontSize).toBe(16);
    expect(style("cn-dialog-title").style.fontWeight).toBe(500);
    expect(style("cn-dialog-header").style.gap).toBe(6);
    expect(style("cn-dialog-footer").style.gap).toBe(8);
    expect(style("cn-dialog-description").style.color).toBe(
      lightTheme.colors.mutedForeground,
    );
  });

  it("matches the new-york popover surface", () => {
    const luma = style("cn-popover-content").style;
    const newYork = style(POPOVER_CONTENT).style;
    expect(luma.borderRadius).toBe(24);
    expect(luma.padding).toBe(16);
    expect(luma.gap).toBe(16);
    expect(luma.backgroundColor).toBe(lightTheme.colors.popover);
    expect(luma.borderRadius).toBe(newYork.borderRadius);
    expect(luma.padding).toBe(newYork.padding);
  });

  it("resolves the popover parts", () => {
    const header = style("cn-popover-header").style;
    expect(header.display).toBe("flex");
    expect(header.flexDirection).toBe("column");
    expect(header.gap).toBe(4);
    expect(header.fontSize).toBe(14);
    expect(style("cn-popover-title").style.fontWeight).toBe(500);
    expect(style("cn-popover-description").style.color).toBe(
      lightTheme.colors.mutedForeground,
    );
  });
});

describe("the remaining hooks", () => {
  it("resolves the textarea preset", () => {
    const textarea = style("cn-textarea");
    expect(textarea.style.borderRadius).toBe(16);
    expect(textarea.style.paddingLeft).toBe(12);
    expect(textarea.style.paddingTop).toBe(12);
    expect(textarea.style.paddingBottom).toBe(12);
    expect(textarea.style.backgroundColor).toBe(
      alpha(lightTheme.colors.input, 0.5),
    );
  });

  it("resolves the toast and skeleton surfaces", () => {
    expect(style("cn-toast").style.borderRadius).toBe(16);
    expect(style("cn-skeleton").style.borderRadius).toBe(16);
    expect(style("cn-skeleton").style.backgroundColor).toBe(
      lightTheme.colors.muted,
    );
  });
});
