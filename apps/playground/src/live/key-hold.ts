/**
 * The `key-hold-lifecycle` probe's fixture: what a held key delivers, and what
 * the library's activation guard does with it.
 *
 * Every activating control in the library refuses a repeat — `decideActivation`
 * returns `false` for `isHeld` — because the platform sends key-down again while
 * a key is held. That guard has been unit-tested with synthetic events since it
 * landed, but **no window had ever delivered an `isHeld` payload**: until one
 * does, the guard is a branch nobody has taken, and a reader cannot tell a
 * working guard from a binding that never sets the flag (in which case holding
 * Enter on a menu row fires the action repeatedly).
 *
 * The probe settles both halves:
 *
 * 1. **The flag arrives.** A plain focusable control logs every key-down with
 *    the flag it received, so `j:false` then `j:true` is the payload itself.
 * 2. **The guard uses it.** The shipped `Button` activates once on Enter and
 *    stays at one through the repeats, then once more on Space's release.
 *
 * The ids, the keys, the log codec and the check count live here so the view,
 * the steps, the README and the unit test read one source. Native-free.
 */

/** The `testId`s the view and the steps share. */
export const KEY_HOLD_IDS = {
  probe: "key-hold-probe",
  button: "key-hold-button",
  raw: "key-hold-raw",
  readout: "key-hold-readout",
  rawLog: "key-hold-log",
  buttonLog: "key-hold-button-log",
  windowLog: "key-hold-window",
} as const;

/** The keys the probe holds. Enter acts on the press, Space on the release. */
export const KEY_HOLD_KEYS = {
  press: "enter",
  release: "space",
  raw: "j",
} as const;

/** One key-down the plain control received. */
export interface HeldKey {
  readonly key: string;
  readonly held: boolean;
}

/**
 * What the plain control's log prints: `key:held` per down, then its ups.
 *
 * A repeat is only measurable if the log keeps `true` and `false` apart, so the
 * flag is printed rather than counted.
 */
export const heldKeyLog = (
  downs: ReadonlyArray<HeldKey>,
  ups: number,
): string =>
  `down=${downs.map((down) => `${down.key}:${down.held}`).join(",")} up=${ups}`;

/** What the app-level window handler saw, in arrival order. */
export const windowKeyLog = (downs: ReadonlyArray<HeldKey>): string =>
  `window=${downs.map((down) => `${down.key}:${down.held}`).join(",")}`;

/**
 * What the button's readout prints: the activations it ran, and the pointer
 * presses it saw.
 *
 * The two are kept apart because they are different props: a pointer press runs
 * `onClick` **and** `onActivate`, while an activating key reaches `onActivate`
 * only. A consumer that wires `onClick` alone therefore has no keyboard
 * activation, which the probe states rather than leaves to the API table.
 */
export const keyHoldReadout = (activations: number, presses: number): string =>
  `activations=${activations} presses=${presses}`;

/**
 * How many checks the probe asserts.
 *
 * Held to the probe's `ctx.expect*` sites by `key-hold.test.ts`, so a planted
 * assertion cannot pass without the count moving.
 */
export const KEY_HOLD_CHECKS = 17;
