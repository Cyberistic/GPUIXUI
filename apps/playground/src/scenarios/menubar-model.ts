/**
 * The in-window menu bar's state model (plan `519`).
 *
 * A desktop menu bar is a small, exact state machine: which menu is open, which
 * row is highlighted, and which title focus returns to. Keeping it pure means
 * the switching rules — hover, arrows, disabled menus and rows, and
 * accelerators — are testable without a renderer.
 *
 * The rule the tests guard: a disabled menu or row is never entered, never
 * highlighted and never run — including through its accelerator.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** One row of an open menu. */
export interface MenuItem {
  readonly id: string;
  readonly label: string;
  /** The display chord, e.g. `"cmd-s"`; the window handler owns the binding. */
  readonly accelerator: Option.Option<string>;
  readonly disabled: boolean;
}

/** A top-level menu and its rows. */
export interface Menu {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly items: ReadonlyArray<MenuItem>;
}

/** The open menu, the highlighted row, and the title focus returns to. */
export interface MenubarState {
  readonly active: number;
  readonly open: Option.Option<number>;
  readonly item: number;
}

/** Nothing open; focus belongs to the first title. */
export const initial: MenubarState = {
  active: 0,
  open: Option.none(),
  item: 0,
};

/** The first enabled row of `menu`, or row 0 when every row is disabled. */
const firstEnabledItem = (menu: Menu): number =>
  Option.getOrElse(
    Arr.findFirstIndex(menu.items, (item) => !item.disabled),
    () => 0,
  );

/**
 * The enabled index `delta` steps from `current`, wrapping and skipping
 * disabled entries. Returns `current` when nothing else is enabled.
 */
const stepEnabled = <A>(
  values: ReadonlyArray<A>,
  current: number,
  delta: number,
  enabled: (value: A) => boolean,
): number => {
  const count = Arr.length(values);
  if (count === 0) return current;
  const candidates = Arr.filter(
    Arr.map(Arr.range(1, count), (step) => {
      const raw = current + delta * step;
      return ((raw % count) + count) % count;
    }),
    (index) => Option.exists(Arr.get(values, index), enabled),
  );
  return Option.getOrElse(Arr.head(candidates), () => current);
};

/** Closes the open menu; `active` becomes the focus-return target. */
export const closeMenu = (state: MenubarState): MenubarState => ({
  ...state,
  open: Option.none(),
});

/**
 * A press on a title toggles its menu. A disabled title is inert. Opening
 * highlights the first enabled row.
 */
export const pressTitle = (
  state: MenubarState,
  menus: ReadonlyArray<Menu>,
  index: number,
): MenubarState =>
  Option.match(Arr.get(menus, index), {
    onNone: () => state,
    onSome: (menu) =>
      menu.disabled
        ? state
        : Option.contains(state.open, index)
          ? closeMenu(state)
          : {
              active: index,
              open: Option.some(index),
              item: firstEnabledItem(menu),
            },
  });

/**
 * Hovering another title while a menu is open switches to it. A closed bar does
 * nothing on hover, and a disabled title never becomes the open menu.
 */
export const hoverTitle = (
  state: MenubarState,
  menus: ReadonlyArray<Menu>,
  index: number,
): MenubarState =>
  Option.isNone(state.open)
    ? state
    : Option.match(Arr.get(menus, index), {
        onNone: () => state,
        onSome: (menu) =>
          menu.disabled || Option.contains(state.open, index)
            ? state
            : {
                active: index,
                open: Option.some(index),
                item: firstEnabledItem(menu),
              },
      });

/**
 * Left/Right. While open, the neighbouring menu opens too (wrapping, skipping
 * disabled menus); while closed, only the focused title moves.
 */
export const stepTitle = (
  state: MenubarState,
  menus: ReadonlyArray<Menu>,
  delta: number,
): MenubarState => {
  const next = stepEnabled(
    menus,
    state.active,
    delta,
    (menu) => !menu.disabled,
  );
  return Option.match(Arr.get(menus, next), {
    onNone: () => state,
    onSome: (menu) =>
      Option.isSome(state.open)
        ? {
            active: next,
            open: Option.some(next),
            item: firstEnabledItem(menu),
          }
        : { ...state, active: next },
  });
};

/** Down on the bar: open `active` and highlight its first enabled row. */
export const enterMenu = (
  state: MenubarState,
  menus: ReadonlyArray<Menu>,
): MenubarState =>
  Option.match(Arr.get(menus, state.active), {
    onNone: () => state,
    onSome: (menu) =>
      menu.disabled
        ? state
        : {
            active: state.active,
            open: Option.some(state.active),
            item: firstEnabledItem(menu),
          },
  });

/** Up/Down inside an open menu: wrap, skipping disabled rows. */
export const stepItem = (
  state: MenubarState,
  menus: ReadonlyArray<Menu>,
  delta: number,
): MenubarState =>
  Option.match(
    Option.flatMap(state.open, (index) => Arr.get(menus, index)),
    {
      onNone: () => state,
      onSome: (menu) => ({
        ...state,
        item: stepEnabled(
          menu.items,
          state.item,
          delta,
          (item) => !item.disabled,
        ),
      }),
    },
  );

/**
 * The exact chord an event represents, or `None` when it carries no key.
 *
 * Modifier order is fixed (`cmd-ctrl-alt-shift-key`) so a binding and a display
 * label compare as the same string regardless of which modifiers are down.
 */
export const chordOf = (
  key: string,
  modifiers: {
    readonly cmd: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly shift: boolean;
  },
): Option.Option<string> =>
  Str.isNonEmpty(key)
    ? Option.some(
        Arr.join("-")(
          Arr.append(
            Arr.filter(
              [
                modifiers.cmd ? "cmd" : "",
                modifiers.ctrl ? "ctrl" : "",
                modifiers.alt ? "alt" : "",
                modifiers.shift ? "shift" : "",
              ],
              Str.isNonEmpty,
            ),
            key,
          ),
        ),
      )
    : Option.none();

/**
 * The command a chord runs, or `None` when no **enabled** row binds it. A
 * disabled row's chord is inert, and a disabled menu's rows never bind.
 */
export const acceleratorCommand = (
  menus: ReadonlyArray<Menu>,
  keystroke: string,
): Option.Option<string> => {
  const binds = (item: MenuItem): boolean =>
    !item.disabled && Option.contains(item.accelerator, keystroke);
  return Option.flatMap(
    Arr.findFirst(
      menus,
      (menu) => !menu.disabled && Arr.some(menu.items, binds),
    ),
    (menu) => Option.map(Arr.findFirst(menu.items, binds), (item) => item.id),
  );
};
