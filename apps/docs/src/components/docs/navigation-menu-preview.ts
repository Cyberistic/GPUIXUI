/**
 * The navigation menu's one-panel rule and its pointer policy, as the previews
 * draw them.
 *
 * The shipped nav keeps at most one panel open, lets an explicit press or key
 * win over a pending hover timer, keeps a panel open while the pointer crosses
 * into it, and closes on `Escape` or an outside press. A drawing that swapped a
 * title could not show any of that, so the workflow runs this reducer and
 * `navigation-menu-preview.test.ts` holds its delays, its one-panel rule and the
 * press-wins rule to `packages/components/src/navigation-menu.tsx`.
 */

/** The rest a trigger needs before its panel opens — the component's default. */
export const OPEN_DELAY_MS = 150;

/** The grace after leaving both the trigger and its panel — the same default. */
export const CLOSE_DELAY_MS = 150;

/** One item of the preview's product nav. */
export interface NavItem {
  /** The value the nav reports; the component names the panel with it too. */
  readonly value: string;
  readonly label: string;
  readonly links: ReadonlyArray<string>;
}

/** The product nav the workflow preview opens panels on. */
export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    value: "platform",
    label: "Platform",
    links: ["Overview", "Runs", "Datasets"],
  },
  {
    value: "docs",
    label: "Docs",
    links: ["Getting started", "Components", "Theming"],
  },
  {
    value: "community",
    label: "Community",
    links: ["Changelog", "Discussions"],
  },
];

/**
 * What the nav knows between events.
 *
 * `hovered` is the trigger the pointer rests on while an open is pending, and
 * `panelHovered` keeps a panel alive while the pointer is inside it.
 * `suspended` is what an explicit press, key, `Escape` or outside press sets:
 * the runtime delivers the pointer's leave *after* the event that opened another
 * panel, so a stale leave must not close what the reader just opened.
 */
export interface NavState {
  readonly open: string | null;
  readonly hovered: string | null;
  readonly panelHovered: boolean;
  readonly suspended: boolean;
}

/** The nav at rest, optionally with one item already open. */
export const initialNavState = (open: string | null = null): NavState => ({
  open,
  hovered: null,
  panelHovered: false,
  suspended: false,
});

/** Everything that can move the nav's open item. */
export type NavEvent =
  | { readonly type: "press"; readonly value: string }
  | { readonly type: "open-key"; readonly value: string }
  | { readonly type: "hover-enter"; readonly value: string }
  | { readonly type: "hover-leave"; readonly value: string }
  | { readonly type: "panel-enter" }
  | { readonly type: "panel-leave" }
  | { readonly type: "hover-open"; readonly value: string }
  | { readonly type: "hover-close" }
  | { readonly type: "escape" }
  | { readonly type: "link"; readonly value: string }
  | { readonly type: "outside" };

const stopped = (state: NavState): NavState => ({
  ...state,
  open: null,
  hovered: null,
  panelHovered: false,
  suspended: true,
});

/** The nav after one event; the component's rules, without a renderer. */
export const applyNavEvent = (state: NavState, event: NavEvent): NavState => {
  switch (event.type) {
    case "press":
      // A press on the open trigger toggles it shut. `stopHover` runs first, so
      // the pointer's pending open cannot reopen what the press closed.
      return {
        open: state.open === event.value ? null : event.value,
        hovered: null,
        panelHovered: false,
        suspended: true,
      };
    case "open-key":
      // Enter, Space and ArrowDown open the focused trigger. ArrowDown alone
      // moves focus on into the panel; that is the demo's, not the state's.
      return {
        open: event.value,
        hovered: null,
        panelHovered: false,
        suspended: true,
      };
    case "hover-enter":
      // Resting on a trigger lifts the suspension and records the pending item.
      return { ...state, hovered: event.value, suspended: false };
    case "hover-leave":
      if (state.suspended || state.hovered !== event.value) return state;
      return { ...state, hovered: null };
    case "panel-enter":
      return { ...state, panelHovered: true, suspended: false };
    case "panel-leave":
      if (state.suspended) return state;
      return { ...state, panelHovered: false };
    case "hover-open":
      if (state.suspended || state.hovered !== event.value) return state;
      return { ...state, open: event.value };
    case "hover-close":
      // A panel is only abandoned once the pointer is on neither surface.
      if (state.suspended || state.hovered !== null || state.panelHovered) {
        return state;
      }
      return { ...state, open: null };
    case "escape":
      return stopped(state);
    case "link":
      // A chosen link runs once and closes its panel.
      return stopped(state);
    case "outside":
      return stopped(state);
  }
};

/** The timer the nav owes next, or `undefined` when it is settled. */
export interface NavTimer {
  readonly delay: number;
  readonly event: NavEvent;
}

/**
 * The one pending transition, read from the state.
 *
 * A pointer resting on a closed trigger owes an open after the delay; a pointer
 * that has left both surfaces owes a close. The demo runs this in an effect so
 * the drawing and the state machine cannot disagree about when a panel moves.
 */
export const navTimer = (state: NavState): NavTimer | undefined => {
  if (state.hovered !== null && state.open !== state.hovered) {
    return {
      delay: OPEN_DELAY_MS,
      event: { type: "hover-open", value: state.hovered },
    };
  }
  if (state.hovered === null && !state.panelHovered && state.open !== null) {
    return { delay: CLOSE_DELAY_MS, event: { type: "hover-close" } };
  }
  return undefined;
};

/** The keys a trigger hands to the nav's roving group. */
export type NavRovingKey = "ArrowLeft" | "ArrowRight" | "Home" | "End";

/**
 * The trigger a roving key moves to, or `undefined` when the group is empty.
 *
 * Left and Right wrap; Home and End jump. Moving never opens — that is the
 * component's rule and the point of a roving group.
 */
export const navRoving = (
  values: ReadonlyArray<string>,
  from: string,
  key: NavRovingKey,
): string | undefined => {
  if (values.length === 0) return undefined;
  if (key === "Home") return values[0];
  if (key === "End") return values[values.length - 1];
  const index = values.indexOf(from);
  const delta = key === "ArrowLeft" ? -1 : 1;
  const start = index === -1 ? 0 : index;
  return values[(start + delta + values.length) % values.length];
};

/** The label of the open item, for the readout, or `closed`. */
export const openLabel = (open: string | null): string =>
  open === null
    ? "closed"
    : (NAV_ITEMS.find((item) => item.value === open)?.label ?? open);
