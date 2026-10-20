/**
 * Keyboard shortcuts: a cheat sheet of chords, rendered as keycaps.
 *
 * The chord grammar and the platform glyphs live in `shortcut/accelerator.ts`,
 * which the hotkey recorder (plan 316) reuses. This component is display-only:
 * a shortcut row is documentation, not a key binding, so it never registers a
 * handler.
 *
 * A group is a `role="group"` named by its heading; rows are `listitem`s inside
 * the root's `role="list"`. Separators are 1px elements, not borders: 0.10.0 has
 * per-side border widths but a single `borderColor`. A row names itself from its
 * label and the glyphs it paints, because 0.10.0 does not lift a `div`'s
 * contents into its accessible name (plan 772).
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Children, isValidElement } from "react";
import { headingLevel, type HeadingLevel } from "./internal/heading.js";
import { composedName } from "./internal/name.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  formatAccelerator,
  type AcceleratorPlatform,
} from "./shortcut/accelerator.js";
import { textStyle, useTheme } from "./internal/theme.js";

/** {@link KeyboardShortcuts} props. */
export interface KeyboardShortcutsProps extends Omit<Props, "children"> {
  /** The list's accessible name. */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** A vertical list of shortcut groups. */
export const KeyboardShortcuts = ({
  label,
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
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link KeyboardShortcutsGroup} props. */
export interface KeyboardShortcutsGroupProps extends Omit<Props, "children"> {
  /** The group's heading, also its accessible name. */
  readonly label: string;
  /** The heading level in the document outline. Default `3`. */
  readonly level?: HeadingLevel;
  readonly children?: PartChildren;
}

/** One named group of shortcuts. */
export const KeyboardShortcutsGroup = ({
  label,
  level,
  "aria-level": authoredLevel,
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
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
        },
        style,
      )}
    >
      <text
        role="heading"
        aria-level={headingLevel(level, authoredLevel, 3)}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {label}
      </text>
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing["2xs"],
          }}
        >
          {row}
          {isValidElement(row) &&
          row.type === KeyboardShortcut &&
          index !== lastShortcut ? (
            <div
              style={{
                height: theme.borderWidth.thin,
                backgroundColor: theme.colors.border,
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
};

/** {@link Keycap} props. */
export interface KeycapProps extends Omit<Props, "children" | "style"> {
  /** One key's label, e.g. `"⌘"` or `"Ctrl"`. A single text node. */
  readonly children?: string;
  readonly style?: StateStyle<KeycapState>;
}

/** What a keycap draws: nothing stateful today, kept for the style contract. */
export interface KeycapState {
  readonly label: string;
}

/** One key cap. Compose several for a chord that is not an accelerator. */
export const Keycap = ({ children, style, ...rest }: KeycapProps) => {
  const theme = useTheme();
  const label = children ?? "";

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 20,
          height: 20,
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          backgroundColor: theme.colors.muted,
          borderRadius: theme.radius.sm,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        },
        resolveStyle(style, { label }),
      )}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

/** {@link KeyboardShortcut} props. */
export interface KeyboardShortcutProps extends Omit<
  Props,
  "children" | "style"
> {
  /** What the chord does. */
  readonly label: string;
  /** The chord, in the accelerator grammar: `"mod+shift+p"`. */
  readonly accelerator: string;
  /** Render the chord with another platform's glyphs. Default: the host. */
  readonly platform?: AcceleratorPlatform;
  /** A style, or a function of the formatted keycaps. */
  readonly style?: StateStyle<KeyboardShortcutState>;
}

/** What a row draws: its formatted keycaps. */
export interface KeyboardShortcutState {
  readonly keys: ReadonlyArray<string>;
}

/** One label-and-chord row. */
export const KeyboardShortcut = ({
  label,
  accelerator,
  platform,
  style,
  "aria-label": authoredLabel,
  ...rest
}: KeyboardShortcutProps) => {
  const theme = useTheme();
  const keys = formatAccelerator(accelerator, platform);
  // 0.10.0 does not lift a `div`'s contents into its accessible name (plans
  // 387/391), so the row names itself from the label and the glyphs it paints.
  const name = Option.getOrUndefined(
    composedName(authoredLabel, [label, Arr.join(" ")(keys)]),
  );

  return (
    <div
      role="listitem"
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        },
        resolveStyle(style, { keys }),
      )}
    >
      <text
        style={{
          ...textStyle(theme, "label"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
        }}
      >
        {keys.map((key, index) => (
          <Keycap key={index}>{key}</Keycap>
        ))}
      </div>
    </div>
  );
};

/** Every part, so a misplaced sibling is named. */
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const keyboardShortcutsMeta = {
  name: "Keyboard shortcuts / keycap display",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  focusable: false,
  limitations: [
    "display-only: a row documents a chord, it does not register a handler",
    "the accelerator grammar is ours; an unknown token displays verbatim rather than failing",
    "rows are separated by 1px elements because 0.10.0 has one border colour per element",
  ],
  docs: "docs/keyboard-shortcuts.mdx",
  example: "examples/keyboard-shortcuts.example.tsx",
  testFile: "src/behaviour/keyboard-shortcuts.test.tsx",
} as const;
