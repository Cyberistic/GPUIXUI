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
  CAROUSEL_INDICATORS,
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
import {
  COMMAND_EMPTY,
  COMMAND_HINT,
  COMMAND_INPUT,
  COMMAND_LIST,
  COMMAND_SHORTCUT,
  DIALOG_CONTENT,
  DIALOG_DESCRIPTION,
  DIALOG_FOOTER,
  DIALOG_HEADER,
  DIALOG_OVERLAY,
  DIALOG_TITLE,
  MENU_CONTENT,
  MENU_GROUP,
  MENU_ITEM,
  MENU_LABEL,
  MENU_SEPARATOR,
  POPOVER_CONTENT,
} from "@gpuixui/tw";
import {
  CHAT_COMPOSER,
  CHAT_COMPOSER_ATTACHMENTS,
  CHAT_COMPOSER_FIELD,
  CHAT_COMPOSER_HINT,
  CHAT_COMPOSER_ROW,
  CHAT_EMPTY,
  CHAT_EMPTY_DESCRIPTION,
  CHAT_EMPTY_TITLE,
  CHAT_ERROR,
  CHAT_ERROR_TEXT,
  CHAT_MESSAGES,
  CHAT_ROOT,
  MESSAGE_ACTIONS,
  MESSAGE_BUBBLE,
  MESSAGE_BUBBLES,
  MESSAGE_CONTENT,
  MESSAGE_REASONING,
  MESSAGE_REASONING_CONTENT,
  MESSAGE_REASONING_TRIGGER,
  MESSAGE_ROOT,
  MESSAGE_SOURCE,
  MESSAGE_SOURCES,
  MESSAGE_STREAMING,
  MESSAGE_TOOL_CALL,
  MESSAGE_TOOL_CALL_HEAD,
  MESSAGE_TOOL_CALL_NAME,
  MESSAGE_TOOL_CALL_RESULT,
  MESSAGE_TOOL_CALL_STATUS,
  COLOR_PICKER_CELL,
  COLOR_PICKER_FIELD,
  COLOR_PICKER_INPUT,
  COLOR_PICKER_ROOT,
  COLOR_PICKER_SWATCHES,
  COMBOBOX_CARET,
  COMBOBOX_CONTENT,
  COMBOBOX_EMPTY,
  COMBOBOX_INPUT,
  COMBOBOX_ITEM,
  COMBOBOX_ITEM_DESCRIPTION,
  COMBOBOX_ITEM_MARK,
  COMBOBOX_ITEM_TEXT,
  COMBOBOX_LIST,
  COMBOBOX_TRIGGER,
  COMBOBOX_TRIGGER_TEXT,
  CONFIRM_DIALOG_BUSY,
  DATE_PICKER_CARET,
  DATE_PICKER_CONTENT,
  DATE_PICKER_DAY,
  DATE_PICKER_GRID,
  DATE_PICKER_MONTH,
  DATE_PICKER_NAV,
  DATE_PICKER_TRIGGER,
  DATE_PICKER_TRIGGER_TEXT,
  DATE_PICKER_WEEKDAY,
  DRAWER_CONTENT,
  DRAWER_DESCRIPTION,
  DRAWER_FOOTER,
  DRAWER_HEADER,
  DRAWER_OVERLAY,
  DRAWER_TITLE,
  MESSAGE_SCROLLER_ITEM,
  MESSAGE_SCROLLER_ROOT,
  MESSAGE_SCROLLER_VIEWPORT,
  NAVIGATION_MENU_CONTENT,
  NAVIGATION_MENU_ITEM,
  NAVIGATION_MENU_LINK,
  NAVIGATION_MENU_LIST,
  NAVIGATION_MENU_ROOT,
  PREVIEW_CARD_CONTENT,
  TABS_CONTENT,
  TABS_LIST,
  TABS_LIST_ORIENTATION,
  TABS_ORIENTATION,
  TABS_ROOT,
  TABS_TRIGGER,
  TIME_PICKER_CLEAR,
  TIME_PICKER_ROOT,
  TIME_PICKER_SEGMENT,
  TIME_PICKER_SEPARATOR,
  TOAST_CARD,
  TOAST_DESCRIPTION,
  TOAST_GLYPH,
  TOAST_TITLE,
  TOAST_VIEWPORT,
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
      borderColor: darkTheme.colors.borderStrong,
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
    expect(style(CAROUSEL_INDICATORS)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
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

describe("Dialog parts recipe", () => {
  it("resolves the header, title, description and footer", () => {
    expect(style(DIALOG_HEADER)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
    });
    expect(style(DIALOG_TITLE)).toEqual({
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 500,
      color: darkTheme.colors.popoverForeground,
    });
    expect(style(DIALOG_DESCRIPTION)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(DIALOG_FOOTER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
    });
  });
});

/** The ring the overlay surfaces draw instead of a border: a 1px zero-blur
 * shadow in `foreground/5`. */
const ring = {
  offsetX: 0,
  offsetY: 0,
  blurRadius: 0,
  spreadRadius: 1,
  color: alpha(darkTheme.colors.foreground, 0.05),
};

describe("Overlay surface recipes", () => {
  it("resolves the scrim to the theme's overlay role", () => {
    expect(style(DIALOG_OVERLAY)).toEqual({
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: darkTheme.colors.overlay,
    });
  });

  it("resolves the dialog content surface to shadcn's fixed metrics", () => {
    expect(style(DIALOG_CONTENT)).toEqual({
      position: "absolute",
      width: "100%",
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      display: "grid",
      gap: 24,
      borderRadius: 32,
      padding: 24,
      fontSize: 14,
      lineHeight: 20,
      boxShadow: ring,
      maxWidth: 448,
    });
  });

  it("resolves the popover content surface cleanly", () => {
    expect(style(POPOVER_CONTENT)).toEqual({
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      borderRadius: 24,
      padding: 16,
      fontSize: 14,
      lineHeight: 20,
      boxShadow: ring,
    });
  });

  it("keeps only the renderer-unowned classes out of the surface", () => {
    expect(classesToStyle(DIALOG_OVERLAY, darkTheme).unsupported).toEqual([
      "isolate",
      "z-50",
      "supports-backdrop-filter:backdrop-blur-sm",
    ]);
    expect(classesToStyle(DIALOG_CONTENT, darkTheme).unsupported).toEqual([
      "top-1/2",
      "left-1/2",
      "z-50",
      "-translate-x-1/2",
      "-translate-y-1/2",
      "max-w-[calc(100%-2rem)]",
    ]);
    expect(classesToStyle(POPOVER_CONTENT, darkTheme).unsupported).toEqual([]);
  });
});

describe("Menu recipe", () => {
  it("resolves the surface, row, label, separator and group", () => {
    expect(style(MENU_CONTENT)).toEqual({
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      minWidth: 192,
      borderRadius: 24,
      padding: 6,
      gap: 2,
      boxShadow: ring,
    });
    expect(style(MENU_ITEM)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 16,
      paddingLeft: 6,
      paddingRight: 8,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      color: darkTheme.colors.popoverForeground,
    });
    expect(style(MENU_LABEL)).toEqual({
      color: darkTheme.colors.mutedForeground,
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 12,
      lineHeight: 16,
      userSelect: "none",
    });
    expect(style(MENU_SEPARATOR)).toEqual({
      backgroundColor: alpha(darkTheme.colors.border, 0.5),
      marginTop: 6,
      marginBottom: 6,
      height: 1,
    });
    expect(style(MENU_GROUP)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
  });
});

describe("Command recipe", () => {
  it("resolves the input, list, empty, shortcut and hint", () => {
    expect(style(COMMAND_INPUT)).toEqual({
      width: "100%",
      fontSize: 14,
      lineHeight: 20,
    });
    expect(style(COMMAND_LIST)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
    });
    expect(style(COMMAND_EMPTY)).toEqual({
      paddingTop: 24,
      paddingBottom: 24,
      textAlign: "center",
      fontSize: 14,
      lineHeight: 20,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(COMMAND_SHORTCUT)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(COMMAND_HINT)).toEqual(style(COMMAND_SHORTCUT));
  });
});

describe("Toast recipe", () => {
  it("resolves the viewport stack and the card surface", () => {
    expect(style(TOAST_VIEWPORT)).toEqual({
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 12,
      maxWidth: 356,
      pointerEvents: "none",
    });
    expect(style(TOAST_CARD)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      width: 356,
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      borderRadius: 6,
      boxShadow: elevationShadow(darkTheme, "md"),
      pointerEvents: "auto",
    });
  });

  it("resolves the title, description and glyph type", () => {
    expect(style(TOAST_TITLE)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 600,
      fontFamily: sans,
      color: darkTheme.colors.popoverForeground,
    });
    expect(style(TOAST_DESCRIPTION)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(TOAST_GLYPH)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
  });
});

describe("Tabs recipe", () => {
  it("resolves the root, rail, trigger and panel", () => {
    expect(style(TABS_ROOT)).toEqual({ display: "flex", gap: 8 });
    expect(style(cn(TABS_ROOT, TABS_ORIENTATION.horizontal))).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
    });
    expect(style(cn(TABS_ROOT, TABS_ORIENTATION.vertical))).toEqual({
      display: "flex",
      flexDirection: "row",
      gap: 8,
    });
    expect(style(TABS_LIST)).toEqual({
      display: "flex",
      alignItems: "stretch",
      gap: 4,
      padding: 4,
      backgroundColor: darkTheme.colors.background,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      borderRadius: 6,
    });
    expect(style(cn(TABS_LIST, TABS_LIST_ORIENTATION.horizontal))).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      gap: 4,
      padding: 4,
      backgroundColor: darkTheme.colors.background,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      borderRadius: 6,
    });
    expect(style(cn(TABS_LIST, TABS_LIST_ORIENTATION.vertical))).toEqual({
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      gap: 4,
      padding: 4,
      backgroundColor: darkTheme.colors.background,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      borderRadius: 6,
    });
    expect(style(TABS_TRIGGER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 12,
      paddingRight: 12,
      borderRadius: 4,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
    expect(style(TABS_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
      color: darkTheme.colors.foreground,
    });
  });
});

describe("PreviewCard, ConfirmDialog and Drawer recipes", () => {
  it("resolves the preview-card surface", () => {
    expect(style(PREVIEW_CARD_CONTENT)).toEqual({
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      minWidth: 240,
      maxWidth: 360,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      boxShadow: elevationShadow(darkTheme, "md"),
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      pointerEvents: "auto",
    });
  });

  it("resolves the confirm-dialog busy type", () => {
    // The published busy-mark type. The components' busy mark is the `loader`
    // icon now, so no component paints this recipe — it stays covered here so
    // the registry cannot drift while `@gpuixui/tw` owns it.
    expect(style(CONFIRM_DIALOG_BUSY)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
  });

  it("resolves the drawer scrim, surface and parts", () => {
    expect(style(DRAWER_OVERLAY)).toEqual({
      backgroundColor: darkTheme.colors.overlay,
    });
    expect(style(DRAWER_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: 24,
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      boxShadow: elevationShadow(darkTheme, "lg"),
      pointerEvents: "auto",
    });
    expect(style(DRAWER_HEADER)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 4,
      paddingRight: 24,
    });
    expect(style(DRAWER_TITLE)).toEqual({
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 600,
      fontFamily: sans,
      color: darkTheme.colors.popoverForeground,
    });
    expect(style(DRAWER_DESCRIPTION)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(DRAWER_FOOTER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
    });
  });
});

describe("NavigationMenu recipe", () => {
  it("resolves the bar, list, item, panel and link", () => {
    expect(style(NAVIGATION_MENU_ROOT)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    });
    expect(style(NAVIGATION_MENU_LIST)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    });
    expect(style(NAVIGATION_MENU_ITEM)).toEqual({
      display: "flex",
      flexDirection: "row",
      position: "relative",
    });
    expect(style(NAVIGATION_MENU_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 220,
      padding: 6,
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      boxShadow: elevationShadow(darkTheme, "md"),
      pointerEvents: "auto",
    });
    expect(style(NAVIGATION_MENU_LINK)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      width: "100%",
      padding: 6,
      borderRadius: 4,
    });
  });
});

describe("Combobox recipe", () => {
  it("resolves the trigger, content, input, list, row and messages", () => {
    expect(style(COMBOBOX_TRIGGER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      width: "100%",
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.background,
      borderWidth: 1,
      borderColor: darkTheme.colors.borderStrong,
      borderRadius: 6,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
    expect(style(COMBOBOX_TRIGGER_TEXT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
    expect(style(COMBOBOX_CARET)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(COMBOBOX_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 220,
      padding: 4,
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      boxShadow: elevationShadow(darkTheme, "md"),
      pointerEvents: "auto",
    });
    expect(style(COMBOBOX_INPUT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.input,
      color: darkTheme.colors.inputForeground,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(COMBOBOX_LIST)).toEqual({
      display: "flex",
      flexDirection: "column",
    });
    expect(style(COMBOBOX_ITEM)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 4,
      paddingBottom: 4,
      borderRadius: 4,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
    });
    expect(style(COMBOBOX_ITEM_TEXT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.popoverForeground,
    });
    expect(style(COMBOBOX_ITEM_DESCRIPTION)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(COMBOBOX_ITEM_MARK)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.primary,
    });
    expect(style(COMBOBOX_EMPTY)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
      paddingTop: 12,
      paddingBottom: 12,
    });
  });
});

describe("DatePicker recipe", () => {
  it("resolves the trigger, content, nav, grid and cells", () => {
    expect(style(DATE_PICKER_TRIGGER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      width: 220,
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.background,
      borderWidth: 1,
      borderColor: darkTheme.colors.borderStrong,
      borderRadius: 6,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
    });
    expect(style(DATE_PICKER_TRIGGER_TEXT)).toEqual(
      style(COMBOBOX_TRIGGER_TEXT),
    );
    expect(style(DATE_PICKER_CARET)).toEqual(style(COMBOBOX_CARET));
    expect(style(DATE_PICKER_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: 8,
      backgroundColor: darkTheme.colors.popover,
      color: darkTheme.colors.popoverForeground,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      pointerEvents: "auto",
    });
    expect(style(DATE_PICKER_NAV)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    });
    expect(style(DATE_PICKER_MONTH)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(DATE_PICKER_GRID)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });
    expect(style(DATE_PICKER_WEEKDAY)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
      textAlign: "center",
    });
    expect(style(DATE_PICKER_DAY)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 4,
    });
  });
});

describe("TimePicker recipe", () => {
  it("resolves the field, segments, separator and clear control", () => {
    expect(style(TIME_PICKER_ROOT)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingLeft: 6,
      paddingRight: 6,
      backgroundColor: darkTheme.colors.input,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      borderRadius: 6,
    });
    expect(style(TIME_PICKER_SEGMENT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.inputForeground,
      textAlign: "center",
      height: "100%",
      padding: 0,
    });
    expect(style(TIME_PICKER_SEPARATOR)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
      userSelect: "none",
    });
    expect(style(TIME_PICKER_CLEAR)).toEqual({
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

describe("ColorPicker recipe", () => {
  it("resolves the picker, swatches, field, cell and input", () => {
    expect(style(COLOR_PICKER_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
    });
    expect(style(COLOR_PICKER_SWATCHES)).toEqual({
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    });
    expect(style(COLOR_PICKER_FIELD)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    });
    expect(style(COLOR_PICKER_CELL)).toEqual({
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
    expect(style(COLOR_PICKER_INPUT)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      flexGrow: 1,
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: darkTheme.colors.background,
      color: darkTheme.colors.inputForeground,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
    });
  });
});

describe("MessageScroller recipe", () => {
  it("resolves the root, viewport and row", () => {
    expect(style(MESSAGE_SCROLLER_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minHeight: 0,
    });
    expect(style(MESSAGE_SCROLLER_VIEWPORT)).toEqual({
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      backgroundColor: darkTheme.colors.background,
      color: darkTheme.colors.foreground,
    });
    expect(style(MESSAGE_SCROLLER_ITEM)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 4,
      flexShrink: 0,
      alignSelf: "stretch",
      paddingBottom: 6,
    });
  });
});

describe("Message recipe", () => {
  it("resolves the row, its body and the three variant strips", () => {
    expect(style(MESSAGE_ROOT)).toEqual({
      display: "flex",
      flexDirection: "row",
      gap: 12,
      alignSelf: "stretch",
      paddingLeft: 4,
      paddingRight: 4,
    });
    expect(style(MESSAGE_CONTENT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
      flexGrow: 1,
      minWidth: 0,
    });
    expect(style(MESSAGE_BUBBLE)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
      borderRadius: 8,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 12,
      paddingRight: 12,
      fontSize: 14,
      lineHeight: 20,
    });
    expect(style(MESSAGE_BUBBLES.user)).toEqual({
      backgroundColor: darkTheme.colors.muted,
    });
    expect(style(MESSAGE_BUBBLES.assistant)).toEqual({
      backgroundColor: "transparent",
    });
    expect(style(MESSAGE_BUBBLES.system)).toEqual({
      backgroundColor: "transparent",
      fontSize: 12,
      lineHeight: 16,
      color: darkTheme.colors.mutedForeground,
    });
  });

  it("resolves the reasoning panel", () => {
    expect(style(MESSAGE_REASONING)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      backgroundColor: darkTheme.colors.card,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 12,
      paddingRight: 12,
    });
    expect(style(MESSAGE_REASONING_TRIGGER)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(MESSAGE_REASONING_CONTENT)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
  });

  it("resolves a tool call, its head, name, status and result", () => {
    expect(style(MESSAGE_TOOL_CALL)).toEqual(style(MESSAGE_REASONING));
    expect(style(MESSAGE_TOOL_CALL_HEAD)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    });
    expect(style(MESSAGE_TOOL_CALL_NAME)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(MESSAGE_TOOL_CALL_STATUS)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(MESSAGE_TOOL_CALL_RESULT)).toEqual(
      style(MESSAGE_REASONING_CONTENT),
    );
  });

  it("resolves the citation list, the streaming marker and the action row", () => {
    expect(style(MESSAGE_SOURCES)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 4,
    });
    expect(style(MESSAGE_SOURCE)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(MESSAGE_STREAMING)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
    expect(style(MESSAGE_ACTIONS)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    });
  });
});

describe("Chat recipe", () => {
  it("resolves the conversation column and its transcript", () => {
    expect(style(CHAT_ROOT)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      flexGrow: 1,
    });
    expect(style(CHAT_MESSAGES)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minHeight: 0,
      flexGrow: 1,
    });
  });

  it("resolves the empty panel and its copy", () => {
    expect(style(CHAT_EMPTY)).toEqual({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingTop: 32,
      paddingBottom: 32,
      textAlign: "center",
    });
    expect(style(CHAT_EMPTY_TITLE)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontWeight: 500,
      fontFamily: sans,
      color: darkTheme.colors.foreground,
    });
    expect(style(CHAT_EMPTY_DESCRIPTION)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      color: darkTheme.colors.mutedForeground,
    });
  });

  it("resolves the failed-reply row", () => {
    expect(style(CHAT_ERROR)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      backgroundColor: darkTheme.colors.card,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 12,
      paddingRight: 12,
    });
    expect(style(CHAT_ERROR_TEXT)).toEqual({
      fontSize: 12,
      lineHeight: 16,
      fontFamily: sans,
      flexGrow: 1,
    });
  });

  it("resolves the composer surface, its row, field, attachments and hint", () => {
    expect(style(CHAT_COMPOSER)).toEqual({
      display: "flex",
      flexDirection: "column",
      gap: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: darkTheme.colors.border,
      backgroundColor: darkTheme.colors.background,
      padding: 8,
    });
    expect(style(CHAT_COMPOSER_ROW)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    });
    expect(style(CHAT_COMPOSER_FIELD)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: sans,
      flexGrow: 1,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 4,
      paddingBottom: 4,
      backgroundColor: "transparent",
      color: darkTheme.colors.inputForeground,
    });
    expect(style(CHAT_COMPOSER_ATTACHMENTS)).toEqual({
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    });
    expect(style(CHAT_COMPOSER_HINT)).toEqual({
      fontSize: 12,
      lineHeight: 16,
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
    // The overlay recipes join the caller's className the same way.
    expect(style(cn(MENU_CONTENT, "rounded-none")).borderRadius).toBe(0);
    expect(style(cn(MENU_ITEM, "text-primary")).color).toBe(
      darkTheme.colors.primary,
    );
    expect(style(cn(DIALOG_FOOTER, "gap-4")).gap).toBe(16);
    expect(style(cn(COMMAND_EMPTY, "py-2")).paddingTop).toBe(8);
    // The final wave's recipes join the caller's className the same way.
    expect(style(cn(TOAST_CARD, "rounded-none")).borderRadius).toBe(0);
    expect(style(cn(TABS_TRIGGER, "px-6")).paddingLeft).toBe(24);
    expect(style(cn(COMBOBOX_TRIGGER, "border-border")).borderColor).toBe(
      darkTheme.colors.border,
    );
    expect(style(cn(DATE_PICKER_TRIGGER, "w-[280px]")).width).toBe(280);
    expect(style(cn(TIME_PICKER_ROOT, "rounded-none")).borderRadius).toBe(0);
    expect(style(cn(COLOR_PICKER_ROOT, "flex-row")).flexDirection).toBe("row");
    expect(style(cn(MESSAGE_SCROLLER_ROOT, "gap-4")).gap).toBe(16);
    expect(style(cn(MESSAGE_ROOT, "gap-4")).gap).toBe(16);
    expect(style(cn(CHAT_COMPOSER_FIELD, "bg-muted")).backgroundColor).toBe(
      darkTheme.colors.muted,
    );
    expect(
      style(cn(NAVIGATION_MENU_CONTENT, "rounded-none")).borderRadius,
    ).toBe(0);
    expect(style(cn(PREVIEW_CARD_CONTENT, "p-6")).padding).toBe(24);
    expect(style(cn(DRAWER_CONTENT, "gap-6")).gap).toBe(24);
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
      CAROUSEL_INDICATORS,
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
      DIALOG_HEADER,
      DIALOG_TITLE,
      DIALOG_DESCRIPTION,
      DIALOG_FOOTER,
      MENU_CONTENT,
      MENU_ITEM,
      MENU_LABEL,
      MENU_SEPARATOR,
      MENU_GROUP,
      COMMAND_INPUT,
      COMMAND_LIST,
      COMMAND_EMPTY,
      COMMAND_SHORTCUT,
      COMMAND_HINT,
      TOAST_VIEWPORT,
      TOAST_CARD,
      TOAST_TITLE,
      TOAST_DESCRIPTION,
      TOAST_GLYPH,
      TABS_ROOT,
      ...Object.values(TABS_ORIENTATION),
      TABS_LIST,
      ...Object.values(TABS_LIST_ORIENTATION),
      TABS_TRIGGER,
      TABS_CONTENT,
      PREVIEW_CARD_CONTENT,
      CONFIRM_DIALOG_BUSY,
      DRAWER_OVERLAY,
      DRAWER_CONTENT,
      DRAWER_HEADER,
      DRAWER_TITLE,
      DRAWER_DESCRIPTION,
      DRAWER_FOOTER,
      NAVIGATION_MENU_ROOT,
      NAVIGATION_MENU_LIST,
      NAVIGATION_MENU_ITEM,
      NAVIGATION_MENU_CONTENT,
      NAVIGATION_MENU_LINK,
      COMBOBOX_TRIGGER,
      COMBOBOX_TRIGGER_TEXT,
      COMBOBOX_CARET,
      COMBOBOX_CONTENT,
      COMBOBOX_INPUT,
      COMBOBOX_LIST,
      COMBOBOX_ITEM,
      COMBOBOX_ITEM_TEXT,
      COMBOBOX_ITEM_DESCRIPTION,
      COMBOBOX_ITEM_MARK,
      COMBOBOX_EMPTY,
      DATE_PICKER_TRIGGER,
      DATE_PICKER_TRIGGER_TEXT,
      DATE_PICKER_CARET,
      DATE_PICKER_CONTENT,
      DATE_PICKER_NAV,
      DATE_PICKER_MONTH,
      DATE_PICKER_GRID,
      DATE_PICKER_WEEKDAY,
      DATE_PICKER_DAY,
      TIME_PICKER_ROOT,
      TIME_PICKER_SEGMENT,
      TIME_PICKER_SEPARATOR,
      TIME_PICKER_CLEAR,
      COLOR_PICKER_ROOT,
      COLOR_PICKER_SWATCHES,
      COLOR_PICKER_FIELD,
      COLOR_PICKER_CELL,
      COLOR_PICKER_INPUT,
      MESSAGE_SCROLLER_ROOT,
      MESSAGE_SCROLLER_VIEWPORT,
      MESSAGE_SCROLLER_ITEM,
      MESSAGE_ROOT,
      MESSAGE_CONTENT,
      MESSAGE_BUBBLE,
      MESSAGE_BUBBLES.user,
      MESSAGE_BUBBLES.assistant,
      MESSAGE_BUBBLES.system,
      MESSAGE_REASONING,
      MESSAGE_REASONING_TRIGGER,
      MESSAGE_REASONING_CONTENT,
      MESSAGE_TOOL_CALL,
      MESSAGE_TOOL_CALL_HEAD,
      MESSAGE_TOOL_CALL_NAME,
      MESSAGE_TOOL_CALL_STATUS,
      MESSAGE_TOOL_CALL_RESULT,
      MESSAGE_SOURCES,
      MESSAGE_SOURCE,
      MESSAGE_STREAMING,
      MESSAGE_ACTIONS,
      CHAT_ROOT,
      CHAT_MESSAGES,
      CHAT_EMPTY,
      CHAT_EMPTY_TITLE,
      CHAT_EMPTY_DESCRIPTION,
      CHAT_ERROR,
      CHAT_ERROR_TEXT,
      CHAT_COMPOSER,
      CHAT_COMPOSER_ROW,
      CHAT_COMPOSER_FIELD,
      CHAT_COMPOSER_ATTACHMENTS,
      CHAT_COMPOSER_HINT,
    ];
    const unsupported = Arr.flatMap(
      recipes,
      (recipe) => classesToStyle(recipe, darkTheme).unsupported,
    );
    expect(unsupported).toStrictEqual([]);
  });
});
