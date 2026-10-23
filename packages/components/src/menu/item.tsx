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
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { MENU_GROUP, MENU_ITEM, MENU_LABEL, MENU_SEPARATOR } from "@gpuixui/tw";
import { Match } from "effect";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { overlaySurfaceStyle } from "../internal/overlay.js";
import {
  controlHeight,
  pressWash,
  statusTone,
  useTheme,
} from "../internal/theme.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "../internal/parts.js";
import { useMergedRef } from "../internal/ref.js";
import { useMenuContext } from "./state.js";

/** How much emphasis a row carries. `destructive` asks before it is used. */
export type MenuItemTone = "default" | "destructive";

/** {@link MenuItem} props. */
export interface MenuItemProps extends Omit<Props, "style"> {
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
   * The text type-ahead matches when `children` is not a plain string (for
   * example a label with a badge beside it). A row whose text cannot be derived
   * is not searched.
   */
  readonly textValue?: string;
  /**
   * Whether activating the row closes the menu. Default `true`; a checkbox row
   * sets `false`, because toggling several settings in one visit is the point.
   */
  readonly closeOnSelect?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the row's state. */
  readonly style?: StateStyle<MenuItemState>;
}

/** What a row draws: the menu highlight and its input state. */
export interface MenuItemState {
  readonly disabled: boolean;
  /** The row the menu's highlight is on (the highlight is real focus). */
  readonly highlighted: boolean;
}

/** The row's own look, shared by actions, checkbox rows and the Command menu.
 *
 * The resting geometry and type come from the `MENU_ITEM` recipe (fixed shadcn
 * metrics); the density height, the emphasis bar and the state colours stay here
 * because they are density- and state-driven (ADR 0006).
 */
export const menuRowStyle = (
  theme: ReturnType<typeof useTheme>,
  tone: MenuItemTone,
  active: boolean,
  disabled: boolean,
  className?: string,
): Props["style"] => {
  const color = disabled
    ? theme.colors.disabledForeground
    : Match.value(tone).pipe(
        Match.when(
          "destructive",
          () => statusTone(theme, "destructive").foreground,
        ),
        Match.when("default", () => undefined),
        Match.exhaustive,
      );

  return {
    ...overlaySurfaceStyle(MENU_ITEM, className, theme),
    height: controlHeight(theme, "sm"),
    borderLeftWidth: theme.borderWidth.strong,
    // The bar marks the row that leads an open submenu or holds the palette's
    // highlight, and it sits on that row's `hover` wash. A mark has to be found
    // from across the surface, so it paints `primary` — the role the mark
    // contract measures at 3:1 on the popover and on the wash, as the check
    // mark beside it does. `accent` is a wash role: it read 1.000:1 on the
    // Luna dark look's own row and under the floor in all eighteen styles.
    borderColor: active ? theme.colors.primary : theme.colors.popover,
    backgroundColor: active ? theme.colors.hover : undefined,
    // The 50% fade composited a disabled label into its own fill, which a
    // high-contrast theme asks 3:1 of; the `disabled`/`disabledForeground` pair
    // is the one `contrastPairs` measures on the popover.
    ...(color === undefined ? {} : { color }),
    cursor: disabled ? "not-allowed" : "pointer",
    hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
    active: disabled
      ? undefined
      : { backgroundColor: pressWash(theme, "hover") },
  };
};

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
  textValue,
  closeOnSelect = true,
  children,
  onFocus,
  onClick,
  onMouseEnter,
  className,
  style,
  ref,
  ...rest
}: MenuItemProps) => {
  const theme = useTheme();
  // Only stable members here: the context object changes whenever a row
  // registers, and depending on it would re-register in a loop.
  const { activeId, register, noteFocus, close, closeSubmenu } =
    useMenuContext();
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
  const setRow = useMergedRef<PublicInstance | null>(attach, ref);

  const run = useCallback(() => action.current(), []);

  // Type-ahead matches the row's text. A composed label must say what it is.
  const searchable = textValue ?? (P.isString(children) ? children : "");

  useLayoutEffect(() => {
    if (instance === undefined) return;
    return register({
      id: instance.id,
      disabled,
      label: searchable,
      activate: run,
    });
  }, [disabled, instance, register, run, searchable]);

  const active =
    instance !== undefined && Option.contains(activeId, instance.id);
  const state: MenuItemState = { disabled, highlighted: active };

  return (
    <div
      role="menuitem"
      // A row's name is its label. The accessible tree does not derive a name
      // from a container's children, so a focusable row without this reads as
      // an unnamed menu item; a composed label says its name with `textValue`.
      aria-label={Str.isEmpty(searchable) ? undefined : searchable}
      {...rest}
      ref={setRow}
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
      onMouseEnter={(event) => {
        // Moving onto another row leaves the submenu that belonged to the row
        // the pointer came from. A SubTrigger re-opens its own in the same
        // event, so React's batch ends on `true`.
        closeSubmenu();
        onMouseEnter?.(event);
      }}
      style={mergeStyles(
        menuRowStyle(theme, tone, active, disabled, className),
        resolveStyle(style, state),
      )}
    >
      <Row leading={leading} trailing={trailing}>
        {children}
      </Row>
    </div>
  );
};

/**
 * The leading slot of a row that carries a state: a fixed icon column so a
 * checked and an unchecked row's labels start on the same x.
 *
 * The mark is the row's whole visible state, so it paints `colors.primary`, a
 * role `indicatorRoles` measures at the 3:1 mark floor on the popover and on the
 * `hover` wash a highlighted row tints — the `accent` wash it used to paint read
 * 1.26:1 on the light popover and 1.14:1 on the dark one.
 */
const MenuCheckMark = ({ checked }: { readonly checked: boolean }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: theme.iconSize.md,
      }}
    >
      {checked ? (
        <Icon
          name="check"
          size="sm"
          color={theme.colors.primary}
          label="Checked"
        />
      ) : null}
    </div>
  );
};

/** {@link MenuCheckboxItem} props: a row that toggles a setting. */
export interface MenuCheckboxItemProps extends Omit<MenuItemProps, "style"> {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  /** A style, or a function of the checkbox row's state. */
  readonly style?: StateStyle<MenuCheckboxItemState>;
}

/** What a checkbox row draws. */
export interface MenuCheckboxItemState {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly highlighted: boolean;
}

/** A menu row that represents an on/off setting. Shows a check icon when checked. */
export const MenuCheckboxItem = ({
  checked,
  onCheckedChange,
  onSelect,
  disabled = false,
  leading,
  trailing,
  children,
  style,
  ref,
  ...rest
}: MenuCheckboxItemProps) => {
  const { activeId } = useMenuContext();
  const instance = useRef<PublicInstance | null>(null);
  const attach = useCallback((next: PublicInstance | null) => {
    instance.current = next;
  }, []);
  const setRow = useMergedRef<PublicInstance | null>(attach, ref);
  const highlighted =
    instance.current !== null && Option.contains(activeId, instance.current.id);
  const state: MenuCheckboxItemState = { checked, disabled, highlighted };

  return (
    <MenuItem
      role="menuitemcheckbox"
      aria-selected={checked}
      {...rest}
      ref={setRow}
      disabled={disabled}
      style={resolveStyle(style, state)}
      closeOnSelect={false}
      onSelect={() => {
        onSelect?.();
        onCheckedChange(!checked);
      }}
      leading={leading ?? <MenuCheckMark checked={checked} />}
      trailing={trailing}
    >
      {children}
    </MenuItem>
  );
};

/** {@link MenuRadioGroup} props: the exclusive choice its rows belong to. */
export interface MenuRadioGroupProps extends Omit<Props, "children"> {
  /** The chosen row's value. The group is controlled: the menu unmounts on close. */
  readonly value: string;
  /** Called with a row's value when it is chosen; never for the current one. */
  readonly onValueChange: (value: string) => void;
  /**
   * The choice's accessible name — what the rows are choosing between.
   *
   * 0.11.0 has no `aria-labelledby`, so a visible `MenuLabel` above the rows
   * paints their caption and does not name the group a reader enters. Pass the
   * same words here.
   */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The chosen value and its setter, for the rows inside one group. */
interface MenuRadioGroupValue {
  readonly value: string;
  readonly choose: (value: string) => void;
}

const MenuRadioGroupContext = createContext<MenuRadioGroupValue | undefined>(
  undefined,
);

/** The radio group a row belongs to. Throws when there is none. */
const useMenuRadioGroup = (): MenuRadioGroupValue => {
  const value = useContext(MenuRadioGroupContext);
  if (value === undefined) {
    throw new Error(
      "MenuRadioItem must be used inside a MenuRadioGroup: the group owns the choice.",
    );
  }
  return value;
};

/**
 * A run of mutually exclusive rows. One value is chosen at a time, so a menu
 * that picks a setting (an appearance, a sort order) states the choice once
 * instead of leaving the consumer to enforce it over checkbox rows.
 *
 * Controlled, like the menu itself: the popup unmounts when it closes, so a
 * group that stored its own choice would forget it on the next open.
 */
export const MenuRadioGroup = ({
  value,
  onValueChange,
  label,
  className,
  children,
  style,
  ...rest
}: MenuRadioGroupProps) => {
  assertParts(menuRadioGroup, children);

  const group: MenuRadioGroupValue = { value, choose: onValueChange };

  return (
    <MenuRadioGroupContext.Provider value={group}>
      <MenuGroupSurface
        label={label}
        className={className}
        style={style}
        {...rest}
      >
        {children}
      </MenuGroupSurface>
    </MenuRadioGroupContext.Provider>
  );
};

/** {@link MenuRadioItem} props: one value in a {@link MenuRadioGroup}. */
export interface MenuRadioItemProps extends Omit<
  MenuItemProps,
  "style" | "onSelect"
> {
  /** The value this row chooses. */
  readonly value: string;
  /** A style, or a function of the radio row's state. */
  readonly style?: StateStyle<MenuRadioItemState>;
}

/** What a radio row draws. */
export interface MenuRadioItemState {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly highlighted: boolean;
}

/**
 * One choice in a radio group. Choosing it closes the menu — unlike a checkbox
 * row, which stays open so several settings can be visited in one visit.
 *
 * 0.11.0 has no `aria-checked`, so the row names its state with `aria-selected`
 * and a check mark, the substitution the checkbox row uses.
 */
export const MenuRadioItem = ({
  value,
  disabled = false,
  leading,
  trailing,
  children,
  style,
  ref,
  ...rest
}: MenuRadioItemProps) => {
  const { value: chosen, choose } = useMenuRadioGroup();
  const { activeId } = useMenuContext();
  const instance = useRef<PublicInstance | null>(null);
  const attach = useCallback((next: PublicInstance | null) => {
    instance.current = next;
  }, []);
  const setRow = useMergedRef<PublicInstance | null>(attach, ref);
  const checked = chosen === value;
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
      onSelect={() => {
        if (!checked) choose(value);
      }}
      leading={leading ?? <MenuCheckMark checked={checked} />}
      trailing={trailing}
    >
      {children}
    </MenuItem>
  );
};

/** {@link MenuSeparator} props. */
export interface MenuSeparatorProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** A hairline between groups of actions. Not focusable. */
export const MenuSeparator = ({
  className,
  style,
  ...rest
}: MenuSeparatorProps) => {
  const theme = useTheme();
  return (
    <div
      role="separator"
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(MENU_SEPARATOR, className, theme),
        style,
      )}
    />
  );
};

/** {@link MenuLabel} props. */
export interface MenuLabelProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** A small heading over a group of rows. Not focusable. */
export const MenuLabel = ({ className, style, ...rest }: MenuLabelProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        overlaySurfaceStyle(MENU_LABEL, className, theme),
        style,
      )}
    />
  );
};

/** A labelled group of rows. */
export interface MenuGroupProps extends Omit<Props, "children"> {
  /**
   * The group's accessible name.
   *
   * 0.11.0 has no `aria-labelledby`, so a visible `MenuLabel` is painted text
   * and does not name the group a reader enters. Pass the same words here.
   */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The group's own surface, shared by a labelled group and a radio group. */
const MenuGroupSurface = ({
  label,
  className,
  children,
  style,
  ...rest
}: MenuGroupProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      role="group"
      aria-label={label}
      style={mergeStyles(
        overlaySurfaceStyle(MENU_GROUP, className, theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** A labelled group of rows. */
export const MenuGroup = ({
  className,
  children,
  style,
  ...rest
}: MenuGroupProps) => {
  assertParts(menuGroup, children);
  return (
    <MenuGroupSurface className={className} style={style} {...rest}>
      {children}
    </MenuGroupSurface>
  );
};

/** Every row part, so a misplaced sibling is named. */
const menuRowParts: ReadonlyArray<PartComponent> = [
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuGroup,
  MenuLabel,
  MenuSeparator,
];

const menuGroup: PartsContract = {
  parent: "menu group",
  family: menuRowParts,
  accepts: [
    MenuItem,
    MenuCheckboxItem,
    MenuRadioGroup,
    MenuLabel,
    MenuSeparator,
  ],
  hint: "Put rows, labels and separators directly inside the group.",
};

const menuRadioGroup: PartsContract = {
  parent: "MenuRadioGroup",
  family: menuRowParts,
  accepts: [MenuRadioItem, MenuLabel, MenuSeparator],
  hint: "Put MenuRadioItem rows directly inside the radio group.",
};
