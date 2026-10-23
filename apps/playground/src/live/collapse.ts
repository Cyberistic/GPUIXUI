/**
 * What a window says about the shipped `Collapsible`, and the arithmetic the
 * `collapsible-lifecycle` probe reads it with.
 *
 * `motion-geometry` measured the runtime's `motion` on a raw 120×40 box: a
 * numeric height tweens, a box clips what it contains, and `onMotionComplete`
 * fires once. Every disclosure section is built the other way round — a
 * `Collapsible` mounts `<AutoHeight>`, whose clipping box is told the height the
 * **content** reports through `onLayout` — and no probe had mounted the shipped
 * component in a window. Whether the content box reports a height while its
 * parent is still zero high is the whole question: if it does not, the section
 * never opens, and only a real layout pass can answer it.
 *
 * The two sections measure the two mount paths. One is closed until it is
 * pressed, so its body is measured on an open; the other is `defaultOpen`, so
 * its body is measured at mount. The body height is the probe's own state, so it
 * can change **while the section is closed** — the reveal unmounts its subtree
 * then, and the next open has to measure the height on screen rather than reuse
 * the one it closed with.
 *
 * Both bodies are mounted with the content recipe's padding removed
 * (`p-0 gap-0`), so the height the clipping box settles on is the body's own
 * number: the arithmetic below stays one comparison per read, and the recipe's
 * padding keeps its own tests.
 */
import * as Arr from "effect/Array";

/** Every id the window reports, one per painted box and the probe's readout. */
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

/** The width both sections are given: a reveal animates height, never width. */
export const COLLAPSE_WIDTH = 320;

/** The body height the pressed section opens at, and the one it is grown to. */
export const COLLAPSE_BODY = 120;
export const COLLAPSE_GROWN = 200;

/** The second section's body, measured at mount because the section starts open. */
export const COLLAPSE_MOUNTED = 80;

/** The press after which the closed body is grown, by index into the presses. */
export const COLLAPSE_GROW_BEFORE = 2;

/** What the probe's own state reads after one press. */
export interface CollapsePress {
  readonly label: string;
  readonly open: boolean;
  readonly opens: number;
  readonly closes: number;
  /** The body height the caller's state holds then, not a reveal measurement. */
  readonly height: number;
}

/** The readout's one spelling, so the probe and its record print the same line. */
export const collapseReadout = (state: {
  readonly open: boolean;
  readonly opens: number;
  readonly closes: number;
  readonly height: number;
}): string =>
  `open=${state.open} opens=${state.opens} closes=${state.closes} height=${state.height}`;

/** The state before any press: closed, counted nothing, at the first body height. */
export const COLLAPSE_REST = {
  open: false,
  opens: 0,
  closes: 0,
  height: COLLAPSE_BODY,
} as const;

/**
 * Five presses: open, close, grow the body while closed, reopen, close, reopen.
 *
 * The grown height is asked for twice so a reveal that only measured once — or
 * that reused the retired 120 — cannot pass by landing on it the first time.
 */
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

/** The presses that leave the section open, each of which owes a measured box. */
export const COLLAPSE_OPENS: ReadonlyArray<CollapsePress> = Arr.filter(
  COLLAPSE_PRESSES,
  (press) => press.open,
);

/** The presses that close it, each of which owes an unmounted subtree. */
export const COLLAPSE_CLOSES: ReadonlyArray<CollapsePress> = Arr.filter(
  COLLAPSE_PRESSES,
  (press) => !press.open,
);

/**
 * The checks the probe asserts:
 *
 * - at rest: the readout, the trigger's painted box and its own box, and no
 *   clipping box and no body (a closed reveal is unmounted, not zero-high);
 * - the section that starts open: its body's painted box and its height, the
 *   clipping box at the mounted height, and the width the caller gave it;
 * - the grow press's readout, which is the only statement that the body changed
 *   while nothing was mounted;
 * - per open press: the readout, the body's painted box and its height, the
 *   settled clipping box, and the width;
 * - per closing press: the readout, the unmounted body, and the unmounted box.
 *
 * A `paintedBox` read is a check of its own (`the runtime paints …`), which is
 * why each body read counts twice: once for painting at all, once for its size.
 */
export const COLLAPSE_CHECKS =
  5 + 4 + 1 + COLLAPSE_OPENS.length * 5 + COLLAPSE_CLOSES.length * 3;
