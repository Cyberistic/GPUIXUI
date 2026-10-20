/**
 * The component recipe → `StyleDesc` equivalence guard.
 *
 * The components wave moved the resting appearance of the leaf components from
 * inline `style` objects to Tailwind class strings compiled through
 * `@gpuixui/tw`'s `classesToStyle` with the **default** registry — shadcn's
 * fixed metrics (`rounded-lg` = 8, `text-sm` = 14/20), not the primitives'
 * density scale. This suite proves the strings resolve to those fixed values
 * and the theme's semantic roles, that a caller's `className` wins over the
 * recipe (merge order), and that no recipe drops an unsupported class.
 *
 * A regression in either the recipe string or the compiler's utility table
 * fails here: change `rounded-lg` to `rounded-md`, or break `flex-row`, and the
 * compiled `StyleDesc` drifts from the oracle.
 */

import { describe, expect, it } from "vitest";
import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import {
  ALERT_BASE,
  ALERT_TONES,
  BADGE_BASE,
  BADGE_SIZES,
  BADGE_VARIANTS,
  CARD_BASE,
  CARD_CONTENT,
  CARD_DESCRIPTION,
  CARD_FOOTER,
  CARD_HEADER,
  CARD_TITLE,
  CARD_VARIANTS,
  EMPTY_STATE_DESCRIPTION,
  EMPTY_STATE_ROOT,
  EMPTY_STATE_TITLE,
  LIST_ITEM,
  LIST_ITEM_DESCRIPTION,
  LIST_ITEM_TITLE,
  LIST_ROOT,
  PAGINATION_ELLIPSIS,
  PAGINATION_LIST,
  PAGINATION_ROOT,
  STEPPER_DESCRIPTION,
  STEPPER_LABEL,
  STEPPER_MARKER,
  STEPPER_MARKER_TEXT,
  STEPPER_ORIENTATION,
  STEPPER_ROOT,
  STEPPER_STEP,
  STEPPER_TEXT,
  classesToStyle,
  cn,
} from "@gpuixui/tw";
import { alpha, darkTheme, elevationShadow } from "../internal/theme.js";

const style = (className: string): StyleDesc =>
  classesToStyle(className, darkTheme).style;

describe("Card recipe", () => {
  it("resolves the surface and its three treatments", () => {
    const base = {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRadius: 8,
      backgroundColor: darkTheme.colors.card,
    };
    expect(style(cn(CARD_BASE, CARD_VARIANTS.plain))).toEqual(base);
    expect(style(cn(CARD_BASE, CARD_VARIANTS.outline))).toEqual({
      ...base,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(cn(CARD_BASE, CARD_VARIANTS.elevated))).toEqual({
      ...base,
      boxShadow: elevationShadow(darkTheme, "sm"),
    });
  });

  it("resolves the parts' type and padding", () => {
    expect(style(CARD_TITLE)).toEqual({
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 600,
      fontFamily: darkTheme.typography.sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(CARD_DESCRIPTION)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: darkTheme.typography.sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(CARD_HEADER)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 4,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      paddingBottom: 12,
    });
    expect(style(CARD_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 12,
      paddingLeft: 16,
      paddingRight: 16,
    });
    expect(style(CARD_FOOTER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: darkTheme.colors.border,
    });
  });
});

describe("Badge recipe", () => {
  it("resolves the pill base for both sizes", () => {
    const base = {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 9999,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 2,
      paddingBottom: 2,
      whiteSpace: "nowrap",
      fontFamily: darkTheme.typography.sans,
    };
    expect(style(cn(BADGE_BASE, BADGE_SIZES.sm))).toEqual({
      ...base,
      fontSize: 12,
      lineHeight: 16,
    });
    expect(style(cn(BADGE_BASE, BADGE_SIZES.md))).toEqual({
      ...base,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
    });
  });

  it("resolves every variant to its theme roles", () => {
    const soft = {
      borderWidth: 1,
    };
    expect(style(cn(BADGE_VARIANTS.neutral))).toMatchObject({
      backgroundColor: darkTheme.colors.muted,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(cn(BADGE_VARIANTS.primary))).toMatchObject({
      backgroundColor: darkTheme.colors.primary,
      color: darkTheme.colors.primaryForeground,
    });
    expect(style(cn(BADGE_VARIANTS.outline))).toMatchObject({
      color: darkTheme.colors.mutedForeground,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(cn(BADGE_VARIANTS.success))).toMatchObject({
      backgroundColor: darkTheme.colors.successSoft,
      color: darkTheme.colors.successSoftForeground,
      ...soft,
    });
    expect(style(cn(BADGE_VARIANTS.warning))).toMatchObject({
      backgroundColor: darkTheme.colors.warningSoft,
      color: darkTheme.colors.warningSoftForeground,
      ...soft,
    });
    expect(style(cn(BADGE_VARIANTS.info))).toMatchObject({
      backgroundColor: darkTheme.colors.infoSoft,
      color: darkTheme.colors.infoSoftForeground,
      ...soft,
    });
    expect(style(cn(BADGE_VARIANTS.danger))).toMatchObject({
      backgroundColor: darkTheme.colors.destructiveSoft,
      color: darkTheme.colors.destructiveSoftForeground,
      ...soft,
    });
  });
});

describe("Alert recipe", () => {
  it("resolves the surface and each tone", () => {
    const base = {
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 12,
      borderRadius: 6,
      borderWidth: 1,
    };
    expect(style(cn(ALERT_BASE, ALERT_TONES.info))).toEqual({
      ...base,
      backgroundColor: darkTheme.colors.infoSoft,
      color: darkTheme.colors.infoSoftForeground,
      borderColor: alpha(darkTheme.colors.info, 0.3),
    });
    expect(style(cn(ALERT_BASE, ALERT_TONES.success))).toMatchObject({
      backgroundColor: darkTheme.colors.successSoft,
      color: darkTheme.colors.successSoftForeground,
      borderColor: alpha(darkTheme.colors.success, 0.3),
    });
    expect(style(cn(ALERT_BASE, ALERT_TONES.warning))).toMatchObject({
      backgroundColor: darkTheme.colors.warningSoft,
      color: darkTheme.colors.warningSoftForeground,
      borderColor: alpha(darkTheme.colors.warning, 0.3),
    });
    expect(style(cn(ALERT_BASE, ALERT_TONES.danger))).toMatchObject({
      backgroundColor: darkTheme.colors.destructiveSoft,
      color: darkTheme.colors.destructiveSoftForeground,
      borderColor: alpha(darkTheme.colors.destructive, 0.3),
    });
  });
});

describe("Layout and type recipes", () => {
  it("resolves the list, pagination, empty-state and stepper shells", () => {
    expect(style(LIST_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
    expect(style(LIST_ITEM)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 4,
    });
    expect(style(LIST_ITEM_TITLE)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: darkTheme.typography.sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(LIST_ITEM_DESCRIPTION)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: darkTheme.typography.sans,
      color: darkTheme.colors.mutedForeground,
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    expect(style(PAGINATION_ROOT)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    });
    expect(style(PAGINATION_LIST)).toEqual(style(PAGINATION_ROOT));
    expect(style(EMPTY_STATE_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 32,
    });
    expect(style(EMPTY_STATE_TITLE)).toMatchObject({
      textAlign: "center",
      fontWeight: 600,
    });
    expect(style(EMPTY_STATE_DESCRIPTION)).toMatchObject({
      textAlign: "center",
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(STEPPER_ROOT)).toEqual({ display: "flex", gap: 24 });
    expect(style(cn(STEPPER_ROOT, STEPPER_ORIENTATION.horizontal))).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 24,
    });
    expect(style(cn(STEPPER_ROOT, STEPPER_ORIENTATION.vertical))).toEqual({
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      gap: 24,
    });
    expect(style(STEPPER_STEP)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    });
    expect(style(STEPPER_TEXT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
  });
});

describe("merge order", () => {
  it("lets the caller's className win over the recipe", () => {
    expect(style(cn(CARD_BASE, "rounded-none")).borderRadius).toBe(0);
    expect(style(cn(BADGE_BASE, "px-6")).paddingLeft).toBe(24);
    expect(style(cn(LIST_ROOT, "flex-row")).flexDirection).toBe("row");
    expect(style(cn(STEPPER_ROOT, "gap-1")).gap).toBe(4);
  });

  it("lets the caller's className add a rule the recipe lacks", () => {
    expect(style(cn(STEPPER_MARKER, "bg-primary")).backgroundColor).toBe(
      darkTheme.colors.primary,
    );
    expect(style(cn(STEPPER_MARKER_TEXT, "text-primary")).color).toBe(
      darkTheme.colors.primary,
    );
    expect(style(cn(STEPPER_LABEL, "font-semibold")).fontWeight).toBe(600);
  });
});

describe("no unsupported classes", () => {
  it("compiles every component recipe without a dropped class", () => {
    const recipes: ReadonlyArray<string> = [
      CARD_BASE,
      CARD_VARIANTS.outline,
      CARD_VARIANTS.elevated,
      CARD_HEADER,
      CARD_TITLE,
      CARD_DESCRIPTION,
      CARD_CONTENT,
      CARD_FOOTER,
      BADGE_BASE,
      BADGE_SIZES.sm,
      BADGE_SIZES.md,
      ...Object.values(BADGE_VARIANTS),
      ALERT_BASE,
      ...Object.values(ALERT_TONES),
      LIST_ROOT,
      LIST_ITEM,
      LIST_ITEM_TITLE,
      LIST_ITEM_DESCRIPTION,
      PAGINATION_ROOT,
      PAGINATION_LIST,
      PAGINATION_ELLIPSIS,
      EMPTY_STATE_ROOT,
      EMPTY_STATE_TITLE,
      EMPTY_STATE_DESCRIPTION,
      STEPPER_ROOT,
      ...Object.values(STEPPER_ORIENTATION),
      STEPPER_STEP,
      STEPPER_MARKER,
      STEPPER_MARKER_TEXT,
      STEPPER_LABEL,
      STEPPER_DESCRIPTION,
      STEPPER_TEXT,
    ];
    const unsupported = Arr.flatMap(
      recipes,
      (recipe) => classesToStyle(recipe, darkTheme).unsupported,
    );
    expect(unsupported).toStrictEqual([]);
  });
});
