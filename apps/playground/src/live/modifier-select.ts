import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

export const MODIFIER_ROWS = 8;

export const MODIFIER_ROW_HEIGHT = 32;

export const MODIFIER_SELECT_IDS = {
  caption: "modifier-select-caption",
  list: "modifier-select-list",
  readout: "modifier-select-readout",
  row: (index: number): string => `modifier-select-row-${index}`,
} as const;

export interface PressedModifiers {
  readonly cmd: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
}

export const NO_MODIFIERS: PressedModifiers = {
  cmd: false,
  ctrl: false,
  alt: false,
  shift: false,
};

export const pressedModifiers = (
  raw: PressedModifiers | undefined,
): PressedModifiers =>
  Option.getOrElse(Option.fromNullishOr(raw), () => NO_MODIFIERS);

export interface RowSelection {
  readonly chosen: ReadonlyArray<number>;
  readonly anchor: Option.Option<number>;
}

export const emptySelection: RowSelection = {
  chosen: [],
  anchor: Option.none(),
};

const normalised = (rows: ReadonlyArray<number>): ReadonlyArray<number> =>
  Arr.sort(Arr.dedupe(rows), Order.Number);

const spanOf = (from: number, to: number): ReadonlyArray<number> =>
  Arr.range(Math.min(from, to), Math.max(from, to));

export const selectRow = (
  selection: RowSelection,
  index: number,
  modifiers: PressedModifiers,
): RowSelection => {
  if (modifiers.shift) {
    const span = Option.match(selection.anchor, {
      onNone: () => [index],
      onSome: (anchor) => spanOf(anchor, index),
    });
    return {
      chosen: modifiers.cmd
        ? normalised(Arr.union(selection.chosen, span))
        : span,
      anchor: selection.anchor,
    };
  }
  if (modifiers.cmd) {
    return {
      chosen: Arr.contains(selection.chosen, index)
        ? Arr.filter(selection.chosen, (row) => row !== index)
        : normalised(Arr.append(selection.chosen, index)),
      anchor: Option.some(index),
    };
  }
  return { chosen: [index], anchor: Option.some(index) };
};

export interface LastPress {
  readonly modifiers: PressedModifiers;
  readonly clickCount: number;
}

export const modifierLabel = (modifiers: PressedModifiers): string => {
  const held = Arr.map(
    Arr.filter(
      [
        { name: "cmd", held: modifiers.cmd },
        { name: "ctrl", held: modifiers.ctrl },
        { name: "alt", held: modifiers.alt },
        { name: "shift", held: modifiers.shift },
      ],
      (modifier) => modifier.held,
    ),
    (modifier) => modifier.name,
  );
  return Arr.match(held, {
    onEmpty: () => "none",
    onNonEmpty: (values) => Arr.join(values, "-"),
  });
};

export const flagText = (modifiers: PressedModifiers): string =>
  `cmd:${modifiers.cmd},ctrl:${modifiers.ctrl},alt:${modifiers.alt},shift:${modifiers.shift}`;

export const selectionState = (
  selection: RowSelection,
  last: Option.Option<LastPress>,
  presses: number,
): string => {
  const chosen = Arr.match(selection.chosen, {
    onEmpty: () => "none",
    onNonEmpty: (rows) =>
      Arr.join(
        Arr.map(rows, (row) => `${row}`),
        ",",
      ),
  });
  const anchor = Option.match(selection.anchor, {
    onNone: () => "none",
    onSome: (index) => `${index}`,
  });
  const press = Option.match(last, {
    onNone: () => "mods=none flags=none click=none",
    onSome: (entry) =>
      `mods=${modifierLabel(entry.modifiers)} flags=${flagText(entry.modifiers)} click=${entry.clickCount}`,
  });
  return `selected=${chosen} anchor=${anchor} ${press} presses=${presses}`;
};
