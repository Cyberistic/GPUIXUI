/**
 * Menu radio rows: one selected value out of a group.
 *
 * A menu setting is often exclusive — *Sort by*, *View mode*, *Theme* — and a
 * checkbox row cannot express that: it permits none or several checked rows and
 * forces every call site to uncheck the siblings. The group owns the exclusive
 * rule instead, so an invalid state is not representable.
 *
 * The group is controlled (`value` + `onValueChange`), like
 * `MenuCheckboxItem`'s `checked` + `onCheckedChange`: the caller owns the value
 * the rest of the app reads. A selected row keeps the menu open, because a
 * setting is not an action.
 *
 * `@gpuix/react@0.10.0` has no `aria-checked`, so the row announces through
 * `role="menuitemradio"` and `aria-selected`, the same measured substitute the
 * checkbox row uses. The leading mark is a token-sized dot, because the icon
 * set has no filled circle.
 */

import type { Props, PublicInstance } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "../internal/parts.js";
import { useMergedRef } from "../internal/ref.js";
import { useTheme } from "../internal/theme.js";
import { MenuItem, type MenuItemProps } from "./item.js";
import { useMenuContext } from "./state.js";

/** The exclusive value a radio part reads; throws outside a group. */
interface RadioGroupValue {
  readonly value: string | null;
  readonly select: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupValue | undefined>(undefined);

/** The radio group a row belongs to. Throws when there is none. */
const useRadioGroup = (): RadioGroupValue => {
  const value = useContext(RadioGroupContext);
  if (value === undefined) {
    throw new Error("Menu radio parts must be used inside a MenuRadioGroup");
  }
  return value;
};

/** {@link MenuRadioGroup} props: one controlled value for the group. */
export interface MenuRadioGroupProps extends Omit<Props, "children"> {
  /** The selected row's value, or `null` for none. */
  readonly value: string | null;
  /** Reports the chosen value; the caller stores it. */
  readonly onValueChange: (value: string) => void;
  /** The group's accessible name. Omit it when a `MenuLabel` names the group. */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** A set of mutually exclusive rows. */
export const MenuRadioGroup = ({
  value,
  onValueChange,
  label,
  children,
  style,
  ...rest
}: MenuRadioGroupProps) => {
  const theme = useTheme();
  const group = useMemo<RadioGroupValue>(
    () => ({ value, select: onValueChange }),
    [onValueChange, value],
  );
  assertParts(menuRadioGroup, children);

  return (
    <RadioGroupContext.Provider value={group}>
      <div
        role="group"
        {...(label === undefined ? {} : { "aria-label": label })}
        {...rest}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
          ...style,
        }}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

/** {@link MenuRadioItem} props: one exclusive choice. */
export interface MenuRadioItemProps extends Omit<
  MenuItemProps,
  "leading" | "style" | "closeOnSelect"
> {
  /** The value this row stands for. */
  readonly value: string;
  /** A style, or a function of the radio row's state. */
  readonly style?: StateStyle<MenuRadioItemState>;
}

/** What a radio row draws: the group's value and the row's own state. */
export interface MenuRadioItemState {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly highlighted: boolean;
}

/** One exclusive row: reports its value and keeps the menu open. */
export const MenuRadioItem = ({
  value,
  onSelect,
  disabled = false,
  children,
  style,
  ref,
  ...rest
}: MenuRadioItemProps) => {
  const theme = useTheme();
  const group = useRadioGroup();
  const { activeId } = useMenuContext();
  const instance = useRef<PublicInstance | null>(null);
  const attach = useCallback((next: PublicInstance | null) => {
    instance.current = next;
  }, []);
  const setRow = useMergedRef<PublicInstance | null>(attach, ref);
  const checked = group.value === value;
  const highlighted =
    instance.current !== null && Option.contains(activeId, instance.current.id);
  const state: MenuRadioItemState = { checked, disabled, highlighted };

  return (
    <MenuItem
      role="menuitemradio"
      aria-selected={checked}
      {...rest}
      ref={setRow}
      disabled={disabled}
      style={resolveStyle(style, state)}
      closeOnSelect={false}
      onSelect={() => {
        onSelect?.();
        if (!checked) group.select(value);
      }}
      leading={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: theme.iconSize.md,
            height: theme.iconSize.md,
          }}
        >
          {checked ? (
            <div
              style={{
                width: theme.spacing.sm,
                height: theme.spacing.sm,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.accent,
              }}
            />
          ) : null}
        </div>
      }
    >
      {children}
    </MenuItem>
  );
};

/** Every radio part, so a misplaced sibling is named. */
const radioParts: ReadonlyArray<PartComponent> = [
  MenuRadioGroup,
  MenuRadioItem,
];

const menuRadioGroup: PartsContract = {
  parent: "MenuRadioGroup",
  family: radioParts,
  accepts: [MenuRadioItem],
  hint: "Put MenuRadioItem rows directly inside MenuRadioGroup.",
};
