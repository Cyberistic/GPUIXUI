import * as Arr from "effect/Array";

export const COLLAPSE_IDS = {
  probe: "collapse-probe",
  trigger: "collapse-trigger",
  clip: "collapse-clip",
  body: "collapse-body",
  grow: "collapse-grow",
  readout: "collapse-readout",
  initialTrigger: "collapse-initial-trigger",
  initialClip: "collapse-initial-clip",
  initialBody: "collapse-initial-body",
} as const;

export const COLLAPSE_WIDTH = 320;

export const COLLAPSE_BODY = 120;
export const COLLAPSE_GROWN = 200;

export const COLLAPSE_MOUNTED = 80;

export const COLLAPSE_GROW_BEFORE = 2;

export interface CollapsePress {
  readonly label: string;
  readonly open: boolean;
  readonly opens: number;
  readonly closes: number;

  readonly height: number;
}

export const collapseReadout = (state: {
  readonly open: boolean;
  readonly opens: number;
  readonly closes: number;
  readonly height: number;
}): string =>
  `open=${state.open} opens=${state.opens} closes=${state.closes} height=${state.height}`;

export const COLLAPSE_REST = {
  open: false,
  opens: 0,
  closes: 0,
  height: COLLAPSE_BODY,
} as const;

export const COLLAPSE_PRESSES: ReadonlyArray<CollapsePress> = [
  {
    label: "a press opens the section",
    open: true,
    opens: 1,
    closes: 0,
    height: COLLAPSE_BODY,
  },
  {
    label: "a press closes it",
    open: false,
    opens: 1,
    closes: 1,
    height: COLLAPSE_BODY,
  },
  {
    label: "a press reopens it after the body grew",
    open: true,
    opens: 2,
    closes: 1,
    height: COLLAPSE_GROWN,
  },
  {
    label: "a press closes the grown body",
    open: false,
    opens: 2,
    closes: 2,
    height: COLLAPSE_GROWN,
  },
  {
    label: "a press opens it again at the grown height",
    open: true,
    opens: 3,
    closes: 2,
    height: COLLAPSE_GROWN,
  },
];

export const COLLAPSE_OPENS: ReadonlyArray<CollapsePress> = Arr.filter(
  COLLAPSE_PRESSES,
  (press) => press.open,
);

export const COLLAPSE_CLOSES: ReadonlyArray<CollapsePress> = Arr.filter(
  COLLAPSE_PRESSES,
  (press) => !press.open,
);

export const COLLAPSE_CHECKS =
  5 + 4 + 1 + COLLAPSE_OPENS.length * 5 + COLLAPSE_CLOSES.length * 3;
