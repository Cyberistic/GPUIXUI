/**
 * Menu rows: an action, a checkbox action, a separator, a group and a label.
 *
 * Every row registers its host id with the menu so arrow keys can move real focus
 * onto it — the highlight is never a painted state without focus behind it.
 *
 * The action is held in a ref: the registry only needs `id` and `disabled`, so an
 * inline `onSelect` cannot re-register the row on every render (which would
 * reorder a menu whose rows were declared in a different order than they render).
 */

import type { Props, PublicInstance } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import * as Option from "effect/Option";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { controlHeight, textStyle, useTheme } from "../internal/theme.js";
import { useMenuContext } from "./state.js";

/** How much emphasis a row carries. `destructive` asks before it is used. */
export type MenuItemTone = "default" | "destructive";

/** {@link MenuItem} props. */
export interface MenuItemProps extends Props {
  /** Runs on click or Enter/Space, then closes the menu. */
  readonly onSelect?: () => void;
  readonly disabled?: boolean;
  /** Default `"default"`. */
  readonly tone?: MenuItemTone;
  /** Slot before the label: a check mark, an icon. */
  readonly leading?: ReactNode;
  /** Slot after the label: a shortcut. */
  readonly trailing?: ReactNode;
  /**
   * Whether activating the row closes the menu. Default `true`; a checkbox row
   * sets `false`, because toggling several settings in one visit is the point.
   */
  readonly closeOnSelect?: boolean;
}

/** The row's own look, shared by actions, checkbox rows and the Command menu. */
export const menuRowStyle = (
  theme: ReturnType<typeof useTheme>,
  tone: MenuItemTone,
  active: boolean,
  disabled: boolean,
): Props["style"] => ({
  ...textStyle(theme, "label"),
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: theme.spacing.md,
  height: controlHeight(theme, "sm"),
  paddingRight: theme.spacing.md,
  // The 2px bar is always present, so highlighting never shifts the label.
  paddingLeft: theme.spacing.md - theme.borderWidth.strong,
  borderLeftWidth: theme.borderWidth.strong,
  borderColor: active ? theme.colors.accent : theme.colors.popover,
  borderRadius: theme.radius.sm,
  backgroundColor: active ? theme.colors.hover : undefined,
  color:
    tone === "destructive"
      ? theme.colors.destructive
      : theme.colors.popoverForeground,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
  active: disabled ? undefined : { backgroundColor: theme.colors.active },
});

/** The row body: leading slot, flexible label, trailing slot. */
const Row = ({
  leading,
  trailing,
  children,
}: {
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  readonly children: ReactNode;
}) => (
  <>
    {leading === undefined ? null : leading}
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexGrow: 1,
        minWidth: 0,
      }}
    >
      {children}
    </div>
    {trailing === undefined ? null : trailing}
  </>
);

/** One action in a menu. */
export const MenuItem = ({
  onSelect,
  disabled = false,
  tone = "default",
  leading,
  trailing,
  closeOnSelect = true,
  children,
  onFocus,
  onClick,
  style,
  ...rest
}: MenuItemProps) => {
  const theme = useTheme();
  // Only stable members here: the context object changes whenever a row
  // registers, and depending on it would re-register in a loop.
  const { activeId, register, noteFocus, close } = useMenuContext();
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const action = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    action.current = () => {
      onSelect?.();
      if (closeOnSelect) close("activate");
    };
  });

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);

  const run = useCallback(() => action.current(), []);

  useLayoutEffect(() => {
    if (instance === undefined) return;
    return register({ id: instance.id, disabled, activate: run });
  }, [disabled, instance, register, run]);

  const active =
    instance !== undefined && Option.contains(activeId, instance.id);

  return (
    <div
      role="menuitem"
      {...rest}
      ref={attach}
      tabIndex={disabled ? -1 : 0}
      onFocus={(event) => {
        if (instance !== undefined) noteFocus(instance.id);
        onFocus?.(event);
      }}
      onClick={(event) => {
        if (disabled) return;
        onClick?.(event);
        action.current();
      }}
      style={mergeStyles(menuRowStyle(theme, tone, active, disabled), style)}
    >
      <Row leading={leading} trailing={trailing}>
        {children}
      </Row>
    </div>
  );
};

/** {@link MenuCheckboxItem} props: a row that toggles a setting. */
export interface MenuCheckboxItemProps extends MenuItemProps {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}

/** A menu row that represents an on/off setting. Shows `✓` when checked. */
export const MenuCheckboxItem = ({
  checked,
  onCheckedChange,
  onSelect,
  leading,
  trailing,
  children,
  ...rest
}: MenuCheckboxItemProps) => {
  const theme = useTheme();
  return (
    <MenuItem
      role="menuitemcheckbox"
      aria-selected={checked}
      {...rest}
      closeOnSelect={false}
      onSelect={() => {
        onSelect?.();
        onCheckedChange(!checked);
      }}
      leading={
        leading ?? (
          <text
            aria-label={checked ? "Checked" : "Not checked"}
            style={{
              ...textStyle(theme, "caption"),
              color: checked
                ? theme.colors.accent
                : theme.colors.mutedForeground,
              width: theme.iconSize.md,
            }}
          >
            {checked ? "✓" : ""}
          </text>
        )
      }
      trailing={trailing}
    >
      {children}
    </MenuItem>
  );
};

/** A hairline between groups of actions. Not focusable. */
export const MenuSeparator = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <div
      role="separator"
      {...rest}
      style={mergeStyles(
        {
          height: theme.borderWidth.thin,
          marginTop: theme.spacing.xs,
          marginBottom: theme.spacing.xs,
          backgroundColor: theme.colors.border,
        },
        style,
      )}
    />
  );
};

/** A small heading over a group of rows. Not focusable. */
export const MenuLabel = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.xs,
          userSelect: "none",
        },
        style,
      )}
    />
  );
};

/** A labelled group of rows. */
export const MenuGroup = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <div
      role="group"
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
        },
        style,
      )}
    />
  );
};
