/** @jsxImportSource @gpuix/react */
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
import * as Schema from "effect/Schema";
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
import { useMenuContext, useMenuLeaving } from "./state.js";

const MenuTones = Schema.Literals(["default", "destructive"]);

export type MenuItemTone = typeof MenuTones.Type;

export const menuToneOf = (value: unknown): MenuItemTone =>
  Schema.is(MenuTones)(value) ? value : "default";

export interface MenuItemProps extends Omit<Props, "style"> {
  readonly onSelect?: () => void;
  readonly disabled?: boolean;

  readonly tone?: MenuItemTone;

  readonly leading?: ReactNode;

  readonly trailing?: ReactNode;

  readonly textValue?: string;

  readonly closeOnSelect?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<MenuItemState>;
}

export interface MenuItemState {
  readonly disabled: boolean;

  readonly highlighted: boolean;
}

export interface MenuRowState {
  readonly tone: MenuItemTone;
  readonly active: boolean;
  readonly disabled: boolean;
}

export const menuRowStyle = (
  theme: ReturnType<typeof useTheme>,
  row: MenuRowState,
  className?: string,
): Props["style"] => {
  const { tone, active, disabled } = row;
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

  const appkit = theme.interaction === "appkit";
  const pointerWash = { backgroundColor: theme.colors.hover };
  const accentWash = {
    backgroundColor: theme.colors.primary,
    color: theme.colors.primaryForeground,
  };
  const highlight = appkit ? accentWash : pointerWash;

  return {
    ...overlaySurfaceStyle(MENU_ITEM, className, theme),
    height: controlHeight(theme, "sm"),

    ...(color === undefined ? {} : { color }),
    ...(active && !disabled ? highlight : {}),
    cursor: disabled ? "not-allowed" : "pointer",
    hover: disabled ? undefined : highlight,
    active: disabled
      ? undefined
      : appkit
        ? accentWash
        : { backgroundColor: pressWash(theme, "hover") },
  };
};

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

export const MenuItem = ({
  onSelect,
  disabled = false,
  tone: requestedTone = "default",
  leading,
  trailing,
  textValue,
  closeOnSelect = true,
  children,
  onFocus,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className,
  style,
  ref,
  ...rest
}: MenuItemProps) => {
  const theme = useTheme();

  const emphasis = menuToneOf(requestedTone);

  const { activeId, register, noteFocus, notePointer, close, closeSubmenu } =
    useMenuContext();

  const leaving = useMenuLeaving();
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
      aria-label={Str.isEmpty(searchable) ? undefined : searchable}
      {...rest}
      ref={setRow}
      tabIndex={disabled || leaving ? -1 : 0}
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
        notePointer(true);
        closeSubmenu(instance?.id);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        notePointer(false);
        onMouseLeave?.(event);
      }}
      style={mergeStyles(
        menuRowStyle(theme, { tone: emphasis, active, disabled }, className),
        resolveStyle(style, state),
      )}
    >
      <Row leading={leading} trailing={trailing}>
        {children}
      </Row>
    </div>
  );
};

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

export interface MenuCheckboxItemProps extends Omit<MenuItemProps, "style"> {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;

  readonly style?: StateStyle<MenuCheckboxItemState>;
}

export interface MenuCheckboxItemState {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly highlighted: boolean;
}

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

export interface MenuRadioGroupProps extends Omit<Props, "children"> {
  readonly value: string;

  readonly onValueChange: (value: string) => void;

  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

interface MenuRadioGroupValue {
  readonly value: string;
  readonly choose: (value: string) => void;
}

const MenuRadioGroupContext = createContext<MenuRadioGroupValue | undefined>(
  undefined,
);

const useMenuRadioGroup = (): MenuRadioGroupValue => {
  const value = useContext(MenuRadioGroupContext);
  if (value === undefined) {
    throw new Error(
      "MenuRadioItem must be used inside a MenuRadioGroup: the group owns the choice.",
    );
  }
  return value;
};

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

export interface MenuRadioItemProps extends Omit<
  MenuItemProps,
  "style" | "onSelect"
> {
  readonly value: string;

  readonly style?: StateStyle<MenuRadioItemState>;
}

export interface MenuRadioItemState {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly highlighted: boolean;
}

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

export interface MenuSeparatorProps extends Props {
  readonly className?: string;
}

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

export interface MenuLabelProps extends Props {
  readonly className?: string;
}

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

export interface MenuGroupProps extends Omit<Props, "children"> {
  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

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
