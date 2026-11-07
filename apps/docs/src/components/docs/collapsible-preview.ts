export const MIN_BUDGET = 1;
export const MAX_BUDGET = 5;

export interface Policy {
  readonly budget: number;
  readonly backoff: "linear" | "exponential";
  readonly jitter: boolean;
}

export const defaultPolicy: Policy = {
  budget: 3,
  backoff: "exponential",
  jitter: false,
};

export const stepBudget = (budget: number, delta: number): number =>
  Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, budget + delta));

export const changedRows = (policy: Policy): ReadonlyArray<string> =>
  [
    policy.budget === defaultPolicy.budget ? null : "retry budget",
    policy.backoff === defaultPolicy.backoff ? null : "backoff",
    policy.jitter === defaultPolicy.jitter ? null : "jitter",
  ].filter((row): row is string => row !== null);

export const changedLabel = (policy: Policy): string => {
  const count = changedRows(policy).length;
  return count === 0 ? "Defaults" : `${count} of 3 changed`;
};

export const describePolicy = (policy: Policy): string =>
  `Retry ${policy.budget} · ${policy.backoff} · jitter ${
    policy.jitter ? "on" : "off"
  }`;

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

export const openSection = (state: DisclosureState): DisclosureState => ({
  ...state,
  open: true,
});

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

export const nextOpen = (open: boolean, disabled: boolean): boolean =>
  disabled ? open : !open;
