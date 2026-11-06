/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { formatSymbols, type Platform } from "@gpuixui/keyboard";
import {
  cn,
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
} from "@gpuixui/tw";
import { Children, isValidElement } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { currentPlatform, useTheme } from "./internal/theme.js";

export interface KeyboardShortcutsProps extends Omit<Props, "children"> {
  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const KeyboardShortcuts = ({
  label,
  className,
  children,
  style,
  ...rest
}: KeyboardShortcutsProps) => {
  const theme = useTheme();
  assertParts(shortcutsRoot, children);

  return (
    <div
      role="list"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(KEYBOARD_SHORTCUTS_ROOT, className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface KeyboardShortcutsGroupProps extends Omit<Props, "children"> {
  readonly label: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const KeyboardShortcutsGroup = ({
  label,
  className,
  children,
  style,
  ...rest
}: KeyboardShortcutsGroupProps) => {
  const theme = useTheme();
  assertParts(shortcutsGroup, children);

  const rows = Children.toArray(children);
  const lastShortcut = rows.reduce(
    (last, child, index) =>
      isValidElement(child) && child.type === KeyboardShortcut ? index : last,
    -1,
  );

  return (
    <div
      role="group"
      aria-label={label}
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(KEYBOARD_SHORTCUTS_GROUP, className), theme),
        style,
      )}
    >
      <text
        role="heading"
        aria-level={3}
        style={recipeStyle(KEYBOARD_SHORTCUTS_HEADING, theme)}
      >
        {label}
      </text>
      {rows.map((row, index) => (
        <div key={index} style={recipeStyle(KEYBOARD_SHORTCUTS_ROW, theme)}>
          {row}
          {isValidElement(row) &&
          row.type === KeyboardShortcut &&
          index !== lastShortcut ? (
            <div style={recipeStyle(KEYBOARD_SHORTCUTS_SEPARATOR, theme)} />
          ) : null}
        </div>
      ))}
    </div>
  );
};

export interface KeycapProps extends Omit<Props, "children" | "style"> {
  readonly children?: string;

  readonly className?: string;
  readonly style?: StateStyle<KeycapState>;
}

export interface KeycapState {
  readonly label: string;
}

export const Keycap = ({
  children,
  className,
  style,
  ...rest
}: KeycapProps) => {
  const theme = useTheme();
  const label = children ?? "";

  return (
    <div
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(KEYCAP, className), theme), {
          pointerEvents: "none",
        }),
        resolveStyle(style, { label }),
      )}
    >
      <text style={recipeStyle(KEYCAP_TEXT, theme)}>{label}</text>
    </div>
  );
};

export interface KeyboardShortcutProps extends Omit<
  Props,
  "children" | "style"
> {
  readonly label: string;

  readonly accelerator: string;

  readonly platform?: Platform;

  readonly className?: string;

  readonly style?: StateStyle<KeyboardShortcutState>;
}

export interface KeyboardShortcutState {
  readonly keys: ReadonlyArray<string>;
}

export const KeyboardShortcut = ({
  label,
  accelerator,
  platform,
  className,
  style,
  ...rest
}: KeyboardShortcutProps) => {
  const theme = useTheme();
  const keys = formatSymbols(accelerator, platform ?? currentPlatform);

  return (
    <div
      role="listitem"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(KEYBOARD_SHORTCUT, className), theme),
        resolveStyle(style, { keys }),
      )}
    >
      <text style={recipeStyle(KEYBOARD_SHORTCUT_LABEL, theme)}>{label}</text>
      <div style={recipeStyle(KEYBOARD_SHORTCUT_KEYS, theme)}>
        {keys.map((key, index) => (
          <Keycap key={index}>{key}</Keycap>
        ))}
      </div>
    </div>
  );
};

const shortcutParts: ReadonlyArray<PartComponent> = [
  KeyboardShortcuts,
  KeyboardShortcutsGroup,
  KeyboardShortcut,
  Keycap,
];

const shortcutsRoot: PartsContract = {
  parent: "KeyboardShortcuts",
  family: shortcutParts,
  accepts: [KeyboardShortcutsGroup, KeyboardShortcut],
  hint: "Put KeyboardShortcutsGroup (or a KeyboardShortcut) inside KeyboardShortcuts.",
};

const shortcutsGroup: PartsContract = {
  parent: "KeyboardShortcutsGroup",
  family: shortcutParts,
  accepts: [KeyboardShortcut],
  hint: "Put KeyboardShortcut rows directly inside KeyboardShortcutsGroup.",
};

export const keyboardShortcutsMeta = {
  name: "Keyboard shortcuts / keycap display",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "display-only: a row documents a chord, it does not register a handler",
    "the chord grammar is @tanstack/hotkeys; an unknown token displays verbatim rather than failing",
    "rows are separated by 1px elements because 0.11.0 has one border colour per element",
  ],
  docs: "docs/keyboard-shortcuts.mdx",
  example: "examples/keyboard-shortcuts.example.tsx",
  testFile: "src/behaviour/keyboard-shortcuts.test.tsx",
} as const;
