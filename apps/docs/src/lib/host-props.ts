import {
  hostPropsBody,
  supportedAria,
  supportedHostProps,
} from "./accessibility";

/**
 * The shared host props every component part inherits (plan 587).
 *
 * `@gpuix/react`'s `Props` is the runtime's `HostProps` plus React's `key`,
 * `children` and `ref`. The generated props table on each part lists every
 * inherited row, so the names appear 66 times and are explained nowhere — and
 * `search.ts` deliberately drops those generated rows (plan 479). This module
 * is the one authored copy: the names are parsed from the installed
 * `@gpuix/native` declarations and `hostPropViolations` fails when the package
 * and this table disagree in either direction.
 *
 * The accessibility surface — `aria-*`, `role`, `tabIndex` and `autoFocus` —
 * already has its home on `/docs/accessibility` (plan 565). Those names are
 * excluded here rather than defined twice.
 */
export interface HostProp {
  readonly name: string;
  readonly summary: string;
}

/** The prop names the accessibility page documents, with its own meanings. */
export const accessibilityHostProps: ReadonlySet<string> = new Set([
  ...supportedAria.map((row) => row.attribute),
  ...supportedHostProps.map((row) => row.attribute),
]);

/** Names every `HostProps` body declares, quoted `aria-*` keys included. */
export const hostPropNames = (declarations: string): ReadonlyArray<string> =>
  [
    ...hostPropsBody(declarations).matchAll(
      /^\s*(?:"([^"]+)"|([A-Za-z][A-Za-z0-9]*))\??:/gm,
    ),
  ].flatMap((match) => {
    const name = match[1] ?? match[2];
    return name === undefined ? [] : [name];
  });

/**
 * The shared rows, in `HostProps` declaration order. A summary states what a
 * consumer can rely on; runtime quirks are named where they change behaviour.
 */
export const sharedHostProps: ReadonlyArray<HostProp> = [
  {
    name: "style",
    summary:
      "Host styles, merged after the component's own so a caller wins. The function form receives the part's state; see State-aware styles.",
  },
  {
    name: "onClick",
    summary:
      "Primary click only, like the DOM. Use `onAuxClick` for the others.",
  },
  {
    name: "onAuxClick",
    summary: "A non-primary click; `isRightClick` says which button.",
  },
  { name: "onMouseDown", summary: "A pointer button was pressed." },
  { name: "onMouseUp", summary: "A pointer button was released." },
  { name: "onMouseEnter", summary: "The pointer entered the element." },
  { name: "onMouseLeave", summary: "The pointer left the element." },
  { name: "onMouseMove", summary: "The pointer moved over the element." },
  {
    name: "onMouseDownOutside",
    summary:
      "A press outside the element — the click-outside dismissal path for overlays.",
  },
  {
    name: "onKeyDown",
    summary: "A key was pressed while the element had focus.",
  },
  {
    name: "onKeyUp",
    summary:
      "A key was released while the element had focus. Space activates here, not on key down.",
  },
  {
    name: "onFocus",
    summary:
      "Native focus entered the element. `autoFocus` moves focus without dispatching this event.",
  },
  { name: "onBlur", summary: "Native focus left the element." },
  {
    name: "onScroll",
    summary:
      "The host scrolled. Deltas are the runtime's: `deltaY` is negative downwards.",
  },
  { name: "onFileDrop", summary: "A file was dropped on the host." },
  { name: "onChange", summary: "The control's value changed." },
  {
    name: "onSubmit",
    summary:
      "Enter on an input, or Enter in a textarea when this listener is set.",
  },
  {
    name: "onToggleFile",
    summary: "A file row's open state toggled in a file host.",
  },
  { name: "onShowMore", summary: "The host asked for more content." },
  {
    name: "onLineClick",
    summary: "A line was clicked in a code or diff host.",
  },
  {
    name: "onLinkClick",
    summary: "A link inside rich content was activated.",
  },
  {
    name: "onVisibleRange",
    summary:
      "A virtual list's painted window changed. It lags the gesture by one.",
  },
  {
    name: "onHighlight",
    summary: "The match count for `highlight` changed.",
  },
  {
    name: "highlight",
    summary:
      "Paints a wash behind text ranges. The nearest declaration wins, so a nested value replaces its ancestor's for that subtree.",
  },
  {
    name: "onMotionComplete",
    summary: "A native motion track reached its current target.",
  },
  {
    name: "motion",
    summary:
      "The internal native animation description. Components own it; consumers do not pass it.",
  },
  {
    name: "testId",
    summary:
      "A stable locator for automation. Every part forwards it, and the native suites drive the components through it.",
  },
];

/** Every way the catalogue can disagree with the installed declarations. */
export const hostPropViolations = (input: {
  readonly declarations: string;
  readonly shared: ReadonlyArray<HostProp>;
  readonly owned: ReadonlySet<string>;
}): ReadonlyArray<string> => {
  const installed = hostPropNames(input.declarations);
  const installedSet = new Set(installed);
  const sharedNames = input.shared.map((row) => row.name);
  const sharedSet = new Set(sharedNames);

  return [
    ...(installed.length === 0
      ? ["the installed declarations declare no HostProps prop"]
      : []),
    ...(sharedSet.size === input.shared.length
      ? []
      : ["the shared list repeats a prop"]),
    ...input.shared
      .filter((row) => row.summary.trim().length === 0)
      .map((row) => `${row.name} has no summary`),
    ...sharedNames
      .filter((name) => input.owned.has(name))
      .map((name) => `${name} is owned by Accessibility but documented here`),
    ...sharedNames
      .filter((name) => !installedSet.has(name))
      .map((name) => `${name} is documented but HostProps does not declare it`),
    ...installed
      .filter((name) => !sharedSet.has(name) && !input.owned.has(name))
      .map(
        (name) =>
          `${name} is declared by HostProps but neither catalogue documents it`,
      ),
  ];
};
