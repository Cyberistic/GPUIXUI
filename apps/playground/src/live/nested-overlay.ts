import { Match } from "effect";
import * as Arr from "effect/Array";

export const nestedSurfaces = ["dialog", "popover", "menu"] as const;

export type NestedSurface = (typeof nestedSurfaces)[number];

export const NESTED_OPENER = "nested-open";

export const NESTED_DIALOG = "nested-dialog";

export const NESTED_POPOVER_TRIGGER = "nested-popover-trigger";
export const NESTED_POPOVER_PANEL = "nested-popover-panel";

export const NESTED_MENU_TRIGGER = "nested-menu-trigger";
export const NESTED_MENU_PANEL = "nested-menu-panel";
export const NESTED_MENU_ITEM = "nested-menu-item";

export const NESTED_OUTSIDE = "nested-outside";

export const NESTED_READOUT = "nested-readout";

export interface NestedFlow {
  readonly open: Readonly<Record<NestedSurface, boolean>>;
  readonly opens: Readonly<Record<NestedSurface, number>>;
  readonly closes: Readonly<Record<NestedSurface, number>>;
  readonly dismissed: ReadonlyArray<NestedSurface>;
}

export interface NestedEvent {
  readonly surface: NestedSurface;
  readonly open: boolean;
}

const closed: Readonly<Record<NestedSurface, boolean>> = {
  dialog: false,
  popover: false,
  menu: false,
};

const noCounts: Readonly<Record<NestedSurface, number>> = {
  dialog: 0,
  popover: 0,
  menu: 0,
};

export const initialNestedFlow: NestedFlow = {
  open: closed,
  opens: noCounts,
  closes: noCounts,
  dismissed: [],
};

export const nestedFlow = (flow: NestedFlow, event: NestedEvent): NestedFlow =>
  Match.value(event.open).pipe(
    Match.when(true, () => ({
      ...flow,
      open: { ...flow.open, [event.surface]: true },
      opens: {
        ...flow.opens,
        [event.surface]: flow.opens[event.surface] + 1,
      },
    })),
    Match.when(false, () => ({
      ...flow,
      open: { ...flow.open, [event.surface]: false },
      closes: {
        ...flow.closes,
        [event.surface]: flow.closes[event.surface] + 1,
      },
      dismissed: Arr.append(flow.dismissed, event.surface),
    })),
    Match.exhaustive,
  );

const flags = (open: Readonly<Record<NestedSurface, boolean>>): string =>
  Arr.join(
    Arr.map(
      nestedSurfaces,
      (surface) => `${surface}=${open[surface] ? "open" : "closed"}`,
    ),
    " ",
  );

const counts = (record: Readonly<Record<NestedSurface, number>>): string =>
  Arr.join(
    Arr.map(nestedSurfaces, (surface) => `${record[surface]}`),
    ",",
  );

const order = (dismissed: ReadonlyArray<NestedSurface>): string =>
  Arr.match(dismissed, {
    onEmpty: () => "none",
    onNonEmpty: (surfaces) => Arr.join(surfaces, ","),
  });

export const nestedReadout = (flow: NestedFlow): string =>
  `${flags(flow.open)} opens=${counts(flow.opens)} closes=${counts(flow.closes)} dismissed=${order(flow.dismissed)}`;
