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
  ACCORDION_CONTENT,
  ACCORDION_INDICATOR,
  ACCORDION_ITEM,
  ACCORDION_ROOT,
  ACCORDION_TRIGGER,
  ACCORDION_TRIGGER_ROW,
  BREADCRUMB_ELLIPSIS,
  BREADCRUMB_ITEM,
  BREADCRUMB_LINK,
  BREADCRUMB_LIST,
  BREADCRUMB_PAGE,
  BREADCRUMB_ROOT,
  BREADCRUMB_SEPARATOR,
  CAROUSEL_ROOT,
  CAROUSEL_SLIDE,
  CAROUSEL_TRACK,
  COLLAPSIBLE_CONTENT,
  COLLAPSIBLE_ROOT,
  COLLAPSIBLE_TRIGGER,
  COUNTDOWN,
  FIELD_DESCRIPTION,
  FIELD_ERROR,
  FIELD_INPUT,
  FIELD_LABEL,
  FIELD_LABEL_ROW,
  FIELD_REQUIRED,
  FIELD_ROOT,
  FIELDSET_LEGEND,
  FIELDSET_ROOT,
  FORM_ERROR,
  FORM_ERRORS,
  FORM_ROOT,
  HOTKEY_RECORDER,
  HOTKEY_RECORDER_CLEAR,
  HOTKEY_RECORDER_KEYS,
  HOTKEY_RECORDER_TEXT,
  INLINE_EDIT_DISPLAY,
  INLINE_EDIT_DISPLAY_TEXT,
  INLINE_EDIT_INPUT,
  KEYBOARD_SHORTCUT,
  KEYBOARD_SHORTCUT_KEYS,
  KEYBOARD_SHORTCUT_LABEL,
  KEYBOARD_SHORTCUTS_GROUP,
  KEYBOARD_SHORTCUTS_HEADING,
  KEYBOARD_SHORTCUTS_ROOT,
  KEYBOARD_SHORTCUTS_ROW,
  KEYBOARD_SHORTCUTS_SEPARATOR,
  KEYCAP,
  KEYCAP_TEXT,
  MENTION_INPUT_CONTROL,
  MENTION_INPUT_FIELD,
  MENTION_INPUT_ITEM,
  MENTION_INPUT_ITEM_TEXT,
  MENTION_INPUT_LIST,
  SEARCH_INPUT,
  SEARCH_INPUT_CLEAR,
  SEARCH_INPUT_CONTROL,
  SEARCH_INPUT_ICON,
  TAG_INPUT_CHIP,
  TAG_INPUT_CHIP_REMOVE,
  TAG_INPUT_CHIP_TEXT,
  TAG_INPUT_FIELD,
  TAG_INPUT_ROOT,
  TIMELINE_CONNECTOR,
  TIMELINE_CONTENT,
  TIMELINE_DESCRIPTION,
  TIMELINE_DOT,
  TIMELINE_ITEM,
  TIMELINE_RAIL,
  TIMELINE_ROOT,
  TIMELINE_TIMESTAMP,
  TIMELINE_TITLE,
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

const sans = darkTheme.typography.sans;

describe("Accordion recipe", () => {
  it("resolves the disclosure shell and its parts", () => {
    expect(style(ACCORDION_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      width: "100%",
    });
    expect(style(ACCORDION_ITEM)).toEqual({
      display: "flex",
      flexDirection: "column",
    });
    expect(style(ACCORDION_TRIGGER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingLeft: 4,
      paddingRight: 4,
      width: "100%",
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(ACCORDION_TRIGGER_ROW)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      flexGrow: 1,
      minWidth: 0,
    });
    expect(style(ACCORDION_INDICATOR)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(ACCORDION_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
      paddingLeft: 4,
      paddingRight: 4,
      paddingBottom: 8,
      color: darkTheme.colors.mutedForeground,
    });
  });
});

describe("Breadcrumb recipe", () => {
  it("resolves the trail and its crumbs", () => {
    expect(style(BREADCRUMB_ROOT)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    });
    expect(style(BREADCRUMB_LIST)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
    });
    expect(style(BREADCRUMB_ITEM)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    });
    expect(style(BREADCRUMB_LINK)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
      cursor: "pointer",
      paddingLeft: 2,
      paddingRight: 2,
      borderRadius: 4,
    });
    expect(style(BREADCRUMB_PAGE)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(BREADCRUMB_SEPARATOR)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
      userSelect: "none",
    });
    expect(style(BREADCRUMB_ELLIPSIS)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
  });
});

describe("Carousel recipe", () => {
  it("resolves the shell, track and slide", () => {
    expect(style(CAROUSEL_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
    });
    expect(style(CAROUSEL_TRACK)).toEqual({
      display: "flex",
      flexDirection: "row",
      overflow: "hidden",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      backgroundColor: darkTheme.colors.card,
    });
    expect(style(CAROUSEL_SLIDE)).toEqual({
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
    });
  });
});

describe("Collapsible recipe", () => {
  it("resolves the section, trigger and content", () => {
    expect(style(COLLAPSIBLE_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
    expect(style(COLLAPSIBLE_TRIGGER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 6,
      paddingBottom: 6,
      borderRadius: 4,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
      cursor: "pointer",
    });
    expect(style(COLLAPSIBLE_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 6,
      paddingBottom: 8,
      color: darkTheme.colors.mutedForeground,
    });
  });
});

describe("Countdown recipe", () => {
  it("resolves the clock text", () => {
    expect(style(COUNTDOWN)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
    });
  });
});

describe("Field recipe", () => {
  it("resolves the labelled block and its message slots", () => {
    expect(style(FIELD_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 4,
    });
    expect(style(FIELD_LABEL_ROW)).toEqual({
      display: "flex",
      flexDirection: "row",
      gap: 2,
    });
    expect(style(FIELD_LABEL)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(FIELD_REQUIRED)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.destructive,
    });
    expect(style(FIELD_DESCRIPTION)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(FIELD_ERROR)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.destructive,
    });
    expect(style(FIELD_INPUT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      width: "100%",
      paddingLeft: 8,
      paddingRight: 8,
      borderRadius: 6,
      borderWidth: 1,
    });
  });
});

describe("Fieldset and Form recipes", () => {
  it("resolves the group and form shells", () => {
    expect(style(FIELDSET_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 12,
    });
    expect(style(FIELDSET_LEGEND)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
    expect(style(FORM_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 12,
    });
    expect(style(FORM_ERRORS)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
    expect(style(FORM_ERROR)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.destructive,
    });
  });
});

describe("HotkeyRecorder recipe", () => {
  it("resolves the capture control and its clear control", () => {
    expect(style(HOTKEY_RECORDER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(HOTKEY_RECORDER_TEXT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(HOTKEY_RECORDER_KEYS)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    });
    expect(style(HOTKEY_RECORDER_CLEAR)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 16,
      height: 16,
      borderRadius: 4,
      color: darkTheme.colors.mutedForeground,
    });
  });
});

describe("InlineEdit recipe", () => {
  it("resolves the display and input surfaces", () => {
    expect(style(INLINE_EDIT_DISPLAY)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingLeft: 4,
      paddingRight: 4,
      borderRadius: 4,
    });
    expect(style(INLINE_EDIT_DISPLAY_TEXT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
    expect(style(INLINE_EDIT_INPUT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      paddingLeft: 6,
      paddingRight: 6,
      backgroundColor: darkTheme.colors.background,
      color: darkTheme.colors.inputForeground,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
  });
});

describe("KeyboardShortcuts recipe", () => {
  it("resolves the sheet, keycap and separator", () => {
    expect(style(KEYBOARD_SHORTCUTS_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 16,
    });
    expect(style(KEYBOARD_SHORTCUTS_GROUP)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
    expect(style(KEYBOARD_SHORTCUTS_HEADING)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(KEYBOARD_SHORTCUTS_ROW)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
    expect(style(KEYBOARD_SHORTCUTS_SEPARATOR)).toEqual({
      height: 1,
      backgroundColor: darkTheme.colors.border,
    });
    expect(style(KEYBOARD_SHORTCUT)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 6,
      paddingBottom: 6,
    });
    expect(style(KEYBOARD_SHORTCUT_LABEL)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(KEYBOARD_SHORTCUT_KEYS)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    });
    expect(style(KEYCAP)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 20,
      height: 20,
      paddingLeft: 6,
      paddingRight: 6,
      backgroundColor: darkTheme.colors.muted,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(KEYCAP_TEXT)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
  });
});

describe("MentionInput recipe", () => {
  it("resolves the field, floating list and rows", () => {
    expect(style(MENTION_INPUT_FIELD)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(MENTION_INPUT_CONTROL)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      flexGrow: 1,
      height: "100%",
      color: darkTheme.colors.inputForeground,
    });
    expect(style(MENTION_INPUT_LIST)).toEqual({
      display: "flex",
      flexDirection: "column",
      minWidth: 200,
      padding: 4,
      backgroundColor: darkTheme.colors.popover,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      pointerEvents: "auto",
    });
    expect(style(MENTION_INPUT_ITEM)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 6,
      paddingRight: 6,
      paddingTop: 4,
      paddingBottom: 4,
      borderRadius: 4,
    });
    expect(style(MENTION_INPUT_ITEM_TEXT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
    });
  });
});

describe("SearchInput recipe", () => {
  it("resolves the field, glyph and clear control", () => {
    expect(style(SEARCH_INPUT)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.background,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      borderRadius: 6,
    });
    expect(style(SEARCH_INPUT_ICON)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
      userSelect: "none",
    });
    expect(style(SEARCH_INPUT_CONTROL)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      flexGrow: 1,
      height: "100%",
      color: darkTheme.colors.inputForeground,
    });
    expect(style(SEARCH_INPUT_CLEAR)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 18,
      height: 18,
      borderRadius: 4,
      color: darkTheme.colors.mutedForeground,
      cursor: "pointer",
    });
  });
});

describe("TagInput recipe", () => {
  it("resolves the group, field and chip", () => {
    expect(style(TAG_INPUT_ROOT)).toEqual({
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 4,
      paddingLeft: 6,
      paddingRight: 6,
      paddingTop: 2,
      paddingBottom: 2,
      backgroundColor: darkTheme.colors.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(TAG_INPUT_FIELD)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      flexGrow: 1,
      minWidth: 80,
      color: darkTheme.colors.inputForeground,
    });
    expect(style(TAG_INPUT_CHIP)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingLeft: 6,
      paddingRight: 6,
      paddingTop: 2,
      paddingBottom: 2,
      backgroundColor: darkTheme.colors.muted,
      borderRadius: 4,
    });
    expect(style(TAG_INPUT_CHIP_TEXT)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(TAG_INPUT_CHIP_REMOVE)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 16,
      height: 16,
      borderRadius: 4,
      color: darkTheme.colors.mutedForeground,
    });
  });
});

describe("Timeline recipe", () => {
  it("resolves the rail, dot, connector and content", () => {
    expect(style(TIMELINE_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 12,
    });
    expect(style(TIMELINE_ITEM)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      alignSelf: "stretch",
      gap: 8,
    });
    expect(style(TIMELINE_RAIL)).toEqual({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: 16,
    });
    expect(style(TIMELINE_DOT)).toEqual({
      width: 8,
      height: 8,
      borderRadius: 9999,
      marginTop: 4,
    });
    expect(style(TIMELINE_CONNECTOR)).toEqual({
      width: 1,
      flexGrow: 1,
      backgroundColor: darkTheme.colors.border,
      marginTop: 2,
    });
    expect(style(TIMELINE_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
      flexGrow: 1,
    });
    expect(style(TIMELINE_TIMESTAMP)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(TIMELINE_TITLE)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
    expect(style(TIMELINE_DESCRIPTION)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
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
    expect(style(cn(ACCORDION_TRIGGER, "gap-4")).gap).toBe(16);
    expect(style(cn(BREADCRUMB_LINK, "text-sm")).fontSize).toBe(14);
    expect(style(cn(TIMELINE_DOT, "bg-primary")).backgroundColor).toBe(
      darkTheme.colors.primary,
    );
    expect(style(cn(KEYCAP, "bg-accent")).backgroundColor).toBe(
      darkTheme.colors.accent,
    );
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
      ACCORDION_ROOT,
      ACCORDION_ITEM,
      ACCORDION_TRIGGER,
      ACCORDION_TRIGGER_ROW,
      ACCORDION_INDICATOR,
      ACCORDION_CONTENT,
      BREADCRUMB_ROOT,
      BREADCRUMB_LIST,
      BREADCRUMB_ITEM,
      BREADCRUMB_LINK,
      BREADCRUMB_PAGE,
      BREADCRUMB_SEPARATOR,
      BREADCRUMB_ELLIPSIS,
      CAROUSEL_ROOT,
      CAROUSEL_TRACK,
      CAROUSEL_SLIDE,
      COLLAPSIBLE_ROOT,
      COLLAPSIBLE_TRIGGER,
      COLLAPSIBLE_CONTENT,
      COUNTDOWN,
      FIELD_ROOT,
      FIELD_LABEL_ROW,
      FIELD_LABEL,
      FIELD_REQUIRED,
      FIELD_DESCRIPTION,
      FIELD_ERROR,
      FIELD_INPUT,
      FIELDSET_ROOT,
      FIELDSET_LEGEND,
      FORM_ROOT,
      FORM_ERRORS,
      FORM_ERROR,
      HOTKEY_RECORDER,
      HOTKEY_RECORDER_TEXT,
      HOTKEY_RECORDER_KEYS,
      HOTKEY_RECORDER_CLEAR,
      INLINE_EDIT_DISPLAY,
      INLINE_EDIT_DISPLAY_TEXT,
      INLINE_EDIT_INPUT,
      KEYBOARD_SHORTCUTS_ROOT,
      KEYBOARD_SHORTCUTS_GROUP,
      KEYBOARD_SHORTCUTS_HEADING,
      KEYBOARD_SHORTCUTS_ROW,
      KEYBOARD_SHORTCUTS_SEPARATOR,
      KEYBOARD_SHORTCUT,
      KEYBOARD_SHORTCUT_LABEL,
      KEYBOARD_SHORTCUT_KEYS,
      KEYCAP,
      KEYCAP_TEXT,
      MENTION_INPUT_FIELD,
      MENTION_INPUT_CONTROL,
      MENTION_INPUT_LIST,
      MENTION_INPUT_ITEM,
      MENTION_INPUT_ITEM_TEXT,
      SEARCH_INPUT,
      SEARCH_INPUT_ICON,
      SEARCH_INPUT_CONTROL,
      SEARCH_INPUT_CLEAR,
      TAG_INPUT_ROOT,
      TAG_INPUT_FIELD,
      TAG_INPUT_CHIP,
      TAG_INPUT_CHIP_TEXT,
      TAG_INPUT_CHIP_REMOVE,
      TIMELINE_ROOT,
      TIMELINE_ITEM,
      TIMELINE_RAIL,
      TIMELINE_DOT,
      TIMELINE_CONNECTOR,
      TIMELINE_CONTENT,
      TIMELINE_TIMESTAMP,
      TIMELINE_TITLE,
      TIMELINE_DESCRIPTION,
    ];
    const unsupported = Arr.flatMap(
      recipes,
      (recipe) => classesToStyle(recipe, darkTheme).unsupported,
    );
    expect(unsupported).toStrictEqual([]);
  });
});
