export const OPEN_DELAY_MS = 150;

export const CLOSE_DELAY_MS = 150;

export interface NavItem {
  readonly value: string;
  readonly label: string;
  readonly links: ReadonlyArray<string>;
}

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

export interface NavState {
  readonly open: string | null;
  readonly hovered: string | null;
  readonly panelHovered: boolean;
  readonly suspended: boolean;
}

export const initialNavState = (open: string | null = null): NavState => ({
  open,
  hovered: null,
  panelHovered: false,
  suspended: false,
});

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

export const applyNavEvent = (state: NavState, event: NavEvent): NavState => {
  switch (event.type) {
    case "press":
      return {
        open: state.open === event.value ? null : event.value,
        hovered: null,
        panelHovered: false,
        suspended: true,
      };
    case "open-key":
      return {
        open: event.value,
        hovered: null,
        panelHovered: false,
        suspended: true,
      };
    case "hover-enter":
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
      if (state.suspended || state.hovered !== null || state.panelHovered) {
        return state;
      }
      return { ...state, open: null };
    case "escape":
      return stopped(state);
    case "link":
      return stopped(state);
    case "outside":
      return stopped(state);
  }
};

export interface NavTimer {
  readonly delay: number;
  readonly event: NavEvent;
}

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

export type NavRovingKey = "ArrowLeft" | "ArrowRight" | "Home" | "End";

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

export const openLabel = (open: string | null): string =>
  open === null
    ? "closed"
    : (NAV_ITEMS.find((item) => item.value === open)?.label ?? open);
