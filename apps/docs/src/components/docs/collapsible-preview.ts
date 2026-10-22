/**
 * The collapsible preview's two models.
 *
 * A disclosure draws as one row and one body, so what a screenshot cannot show
 * is the state contract around it: the section's values belong to the caller and
 * survive a collapse, while anything owned by the body is unmounted with it.
 * The other rule is the disabled trigger, which refuses every route instead of
 * closing a section it did not open.
 *
 * The activation edges are the component's, not the browser's: Enter on key
 * down, Space on key up, and no repeat.
 */

/** How many times a failed run is retried. */
export const MIN_BUDGET = 1;
export const MAX_BUDGET = 5;

/** The retry policy the caller owns. */
export interface Policy {
  readonly budget: number;
  readonly backoff: "linear" | "exponential";
  readonly jitter: boolean;
}

/** The factory values the workflow starts from. */
export const defaultPolicy: Policy = {
  budget: 3,
  backoff: "exponential",
  jitter: false,
};

/**
 * The next retry budget, never outside the five the preview offers.
 *
 * The native `NumberField` clamps the value it is given; the preview holds the
 * same bound so a press at either end reports the same number.
 */
export const stepBudget = (budget: number, delta: number): number =>
  Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, budget + delta));

/** The fields whose value differs from {@link defaultPolicy}. */
export const changedRows = (policy: Policy): ReadonlyArray<string> =>
  [
    policy.budget === defaultPolicy.budget ? null : "retry budget",
    policy.backoff === defaultPolicy.backoff ? null : "backoff",
    policy.jitter === defaultPolicy.jitter ? null : "jitter",
  ].filter((row): row is string => row !== null);

/** The trigger's chip: how much of the policy the reader has changed. */
export const changedLabel = (policy: Policy): string => {
  const count = changedRows(policy).length;
  return count === 0 ? "Defaults" : `${count} of 3 changed`;
};

/** The policy as the readout prints it, in one fixed order. */
export const describePolicy = (policy: Policy): string =>
  `Retry ${policy.budget} · ${policy.backoff} · jitter ${
    policy.jitter ? "on" : "off"
  }`;

/** One section's open state, the caller's policy and the body's own note. */
export interface DisclosureState {
  readonly open: boolean;
  readonly policy: Policy;
  readonly note: string;
}

export const initialDisclosure: DisclosureState = {
  open: false,
  policy: defaultPolicy,
  note: "",
};

/** Open a section; its body mounts with a fresh note. */
export const openSection = (state: DisclosureState): DisclosureState => ({
  ...state,
  open: true,
});

/**
 * Close a section: the body unmounts, so its note goes with it while the
 * caller's policy stays.
 */
export const closeSection = (state: DisclosureState): DisclosureState => ({
  ...state,
  open: false,
  note: "",
});

export const editNote = (
  state: DisclosureState,
  note: string,
): DisclosureState => ({ ...state, note });

export const editPolicy = (
  state: DisclosureState,
  policy: Policy,
): DisclosureState => ({ ...state, policy });

export const setBudget = (
  state: DisclosureState,
  delta: number,
): DisclosureState => ({
  ...state,
  policy: { ...state.policy, budget: stepBudget(state.policy.budget, delta) },
});

/**
 * The state a trigger's activation asks for.
 *
 * A disabled trigger changes nothing — including on an already-open section,
 * because the trigger's own press path is gated before the state is touched.
 */
export const nextOpen = (open: boolean, disabled: boolean): boolean =>
  disabled ? open : !open;
