/**
 * The inspector probe's pure state.
 *
 * An inspector is a list of labelled values where an edit is a **draft** until
 * it is committed, filtering hides rows without discarding their drafts, and the
 * committed model — not the native editor — is what the rendered surface reads.
 * Keeping those rules here makes them testable without a runtime, and gives a
 * future property-panel package a contract to copy.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";

/** One labelled property row. */
export interface Property {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/** Committed rows, the rows as last committed, the pending drafts and the session commit count. */
export interface InspectorState {
  readonly baseline: ReadonlyArray<Property>;
  readonly properties: ReadonlyArray<Property>;
  readonly drafts: Readonly<Record<string, string>>;
  readonly commits: number;
}

/** The labels the probe gives a meaning to; later rows are numbered. */
const LABELS = [
  "Name",
  "Opacity",
  "Role",
  "Visible",
  "Created",
  "Owner",
  "Path",
  "Notes",
] as const;

/** The first two values the preview reads; later rows are numbered. */
const DEFAULTS = ["Untitled", "80"] as const;

const property = (index: number): Property => ({
  id: `p-${index}`,
  label: Option.getOrElse(Arr.get(LABELS, index), () => `Property ${index}`),
  value: Option.getOrElse(Arr.get(DEFAULTS, index), () => `value ${index}`),
});

/** A fresh inspector: `count` rows, every value at its baseline. */
export const initial = (count: number): InspectorState => {
  const baseline = Arr.makeBy(count, property);
  return { baseline, properties: baseline, drafts: {}, commits: 0 };
};

const valueOf = (properties: ReadonlyArray<Property>, id: string): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(properties, (candidate) => candidate.id === id),
      (found) => found.value,
    ),
    () => "",
  );

/** The committed value of `id`, ignoring any draft. */
export const committedValue = (state: InspectorState, id: string): string =>
  valueOf(state.properties, id);

/** The editor's value: the draft when one exists, else the committed value. */
export const draftValue = (state: InspectorState, id: string): string =>
  Option.getOrElse(R.get(state.drafts, id), () => committedValue(state, id));

/** Records an uncommitted edit. The committed row is untouched. */
export const setDraft = (
  state: InspectorState,
  id: string,
  value: string,
): InspectorState => ({
  ...state,
  drafts: R.set(state.drafts, id, value),
});

/** The result of a commit attempt, so a caller only counts real commits. */
export interface CommitResult {
  readonly state: InspectorState;
  readonly committed: boolean;
}

/**
 * Moves a row's draft into its committed value and drops the draft.
 *
 * An unknown row or a row without a draft reports `committed: false` and
 * returns the same state — pressing Enter in an untouched row commits nothing.
 */
export const commit = (state: InspectorState, id: string): CommitResult => {
  const draft = R.get(state.drafts, id);
  const known = Arr.some(state.properties, (candidate) => candidate.id === id);
  if (Option.isNone(draft) || !known) {
    return { state, committed: false };
  }
  return {
    state: {
      ...state,
      properties: Arr.map(state.properties, (candidate) =>
        candidate.id === id ? { ...candidate, value: draft.value } : candidate,
      ),
      drafts: R.remove(state.drafts, id),
      commits: state.commits + 1,
    },
    committed: true,
  };
};

/** Drops a row's draft, keeping the committed value. */
export const revert = (state: InspectorState, id: string): InspectorState =>
  R.has(state.drafts, id)
    ? { ...state, drafts: R.remove(state.drafts, id) }
    : state;

/** Every value back to its baseline and every draft dropped. */
export const reset = (state: InspectorState): InspectorState => ({
  ...state,
  properties: state.baseline,
  drafts: {},
});

/**
 * Rows whose label contains `query`, case-insensitively, in declaration order.
 * A whitespace-only query returns every row.
 */
export const filterProperties = (
  properties: ReadonlyArray<Property>,
  query: string,
): ReadonlyArray<Property> => {
  const needle = Str.toLowerCase(Str.trim(query));
  return Str.isEmpty(needle)
    ? properties
    : Arr.filter(properties, (candidate) =>
        Str.includes(needle)(Str.toLowerCase(candidate.label)),
      );
};

/** An integer percentage clamped to `0…100`; unparseable input is `0`. */
export const percentOf = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
};

/** The preview bar's width: a percentage of 120 px. */
export const barWidth = (value: string): number => percentOf(value) * 1.2;

/** The state summary the probe's readout prints. */
export const describeInspector = (
  state: InspectorState,
  query: string,
): string =>
  `name=${committedValue(state, "p-0")} drafts=${Arr.length(
    R.keys(state.drafts),
  )} filter=${Str.isEmpty(Str.trim(query)) ? "-" : query} commits=${
    state.commits
  }`;
