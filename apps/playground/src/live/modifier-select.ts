/**
 * The selection arithmetic the `modifier-select-lifecycle` probe reads a window
 * with.
 *
 * A desktop list selects by chord — a plain press replaces the set, `shift`
 * extends from the row the reader last chose, `cmd` toggles one record and
 * `cmd-shift` adds the range — and none of it was measurable in a window:
 * `@gpuix/native` reports the held modifiers on the click event, but the smoke
 * host had no verb that holds one, so every probe pressed plainly.
 *
 * The anchor is the half a component gets wrong: a plain press moves it, a
 * `shift` press keeps it (so a second `shift` press re-ranges from the same
 * row), and a `cmd` toggle moves it (the next range starts at the row just
 * toggled). `selectRow` is the whole rule; `selectionState` prints the state
 * the window is left in, and `lastPress` prints the payload the runtime
 * delivered, so a probe compares the event's own modifiers instead of assuming
 * the chord arrived.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

/** The rows the probe mounts, enough for two ranges and a gap between them. */
export const MODIFIER_ROWS = 8;

/** The height a row paints, so a probe can crop one row out of a capture. */
export const MODIFIER_ROW_HEIGHT = 32;

/** Where the probe reads the fixture. */
export const MODIFIER_SELECT_IDS = {
  caption: "modifier-select-caption",
  list: "modifier-select-list",
  readout: "modifier-select-readout",
  row: (index: number): string => `modifier-select-row-${index}`,
} as const;

/** The modifiers a pointer click carries, as the runtime reports them. */
export interface PressedModifiers {
  readonly cmd: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
}

/** The set a plain press carries. */
export const NO_MODIFIERS: PressedModifiers = {
  cmd: false,
  ctrl: false,
  alt: false,
  shift: false,
};

/**
 * The modifiers a payload reported, or none when it reported no field.
 *
 * A click always carries the set at the pinned release, so an absent field is
 * the runtime's behaviour changing rather than a press with no modifiers; the
 * readout prints the four flags either way, so the probe measures the absence
 * instead of inheriting it.
 */
export const pressedModifiers = (
  raw: PressedModifiers | undefined,
): PressedModifiers =>
  Option.getOrElse(Option.fromNullishOr(raw), () => NO_MODIFIERS);

/** A row selection: the chosen records, ascending, and the row a range starts from. */
export interface RowSelection {
  readonly chosen: ReadonlyArray<number>;
  readonly anchor: Option.Option<number>;
}

/** The selection a list opens with. */
export const emptySelection: RowSelection = {
  chosen: [],
  anchor: Option.none(),
};

/** A selection sorted and deduplicated, so one set has one readout. */
const normalised = (rows: ReadonlyArray<number>): ReadonlyArray<number> =>
  Arr.sort(Arr.dedupe(rows), Order.Number);

/** Every index between two rows, in either direction. */
const spanOf = (from: number, to: number): ReadonlyArray<number> =>
  Arr.range(Math.min(from, to), Math.max(from, to));

/**
 * The selection a press on `index` leaves.
 *
 * `shift` replaces with the span from the anchor unless `cmd` is also held, in
 * which case the span joins the set; both keep the anchor. `cmd` alone toggles
 * the record and becomes the new anchor. A plain press is a new set of one.
 */
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

/** What the last press delivered: the modifiers it held and the count it reported. */
export interface LastPress {
  readonly modifiers: PressedModifiers;
  readonly clickCount: number;
}

/** The chord a press held, in the order the protocol spells it. */
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

/** The four flags, so the probe reads the payload rather than only its chord. */
export const flagText = (modifiers: PressedModifiers): string =>
  `cmd:${modifiers.cmd},ctrl:${modifiers.ctrl},alt:${modifiers.alt},shift:${modifiers.shift}`;

/**
 * The state a window prints after every press.
 *
 * `mods` is the chord and `flags` the four booleans the runtime sent: a probe
 * that asserts only `mods` would pass on a handler that derives the chord from
 * `shift` and ignores a `cmd` the payload carries.
 */
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
