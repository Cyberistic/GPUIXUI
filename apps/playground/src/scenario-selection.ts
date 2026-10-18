/**
 * Scenario selection shared by the headless and live smoke CLIs.
 *
 * Both runners accept `--only a,b` repeatedly and must agree on the rules: an
 * empty selection is the full registry, the selection keeps registry order,
 * duplicate ids collapse, and an id the registry does not know is reported —
 * never silently dropped (plan `517` for the live half, plan `531` for the
 * headless half).
 */
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Str from "effect/String";

/** Splits `a,b` into ids, trimming and dropping blanks. */
export const parseIds = (value: string): ReadonlyArray<string> =>
  Arr.filter(Arr.map(Str.split(",")(value), Str.trim), Str.isNonEmpty);

/** The ids the registry exposes, in run order. */
export const idsOf = <A extends { readonly id: string }>(
  list: ReadonlyArray<A>,
): ReadonlyArray<string> => Arr.map(list, (scenario) => scenario.id);

/** What a scenario selection produced. */
export interface Selection<A> {
  /** The requested scenarios, in registry order. */
  readonly selected: ReadonlyArray<A>;
  /** Requested ids the registry does not know. */
  readonly missing: ReadonlyArray<string>;
}

/**
 * Selects the requested scenarios. An absent selection is the full list; the
 * caller decides whether that is allowed (`--all` for live, the default for
 * headless).
 */
export const selectScenarios = <A extends { readonly id: string }>(
  list: ReadonlyArray<A>,
  only: ReadonlyArray<string>,
): Selection<A> => {
  if (Arr.length(only) === 0) return { selected: list, missing: [] };
  const wanted = HashSet.fromIterable(only);
  const known = HashSet.fromIterable(idsOf(list));
  return {
    selected: Arr.filter(list, (scenario) => HashSet.has(wanted, scenario.id)),
    missing: Arr.filter(only, (id) => !HashSet.has(known, id)),
  };
};

/** A bad id names itself and every valid one, so a typo is self-correcting. */
export const formatMissing = (
  suite: "native smoke" | "live smoke",
  missing: ReadonlyArray<string>,
  known: ReadonlyArray<string>,
): string =>
  Arr.join(
    [
      `${suite}: unknown scenario id: ${Arr.join(missing, ", ")}`,
      `  known ids: ${Arr.join(known, ", ")}`,
      "exit 2: the suite produced no evidence",
    ],
    "\n",
  );
