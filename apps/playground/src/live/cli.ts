/**
 * The live CLI's arguments and scenario selection.
 *
 * The live runner used to ignore argv and drive every live scenario, so a check
 * for one component cost a full window run. Selection is pure and lives here so
 * the runner's contract is testable without opening a window: no `--only` and
 * no `--all` is a usage error, never a silent full run.
 */

import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The parsed live flags. */
export interface LiveFlags {
  /** Scenario ids to run, in the order given. Empty means "none selected". */
  readonly only: ReadonlyArray<string>;
  /** Run the whole live suite. Explicit, so a bare command cannot start it. */
  readonly all: boolean;
  /** Print the scenario ids and exit without opening a window. */
  readonly list: boolean;
  /** Print the JSON report after a run. */
  readonly json: boolean;
}

/** The flags plus any token the parser did not recognise. */
export interface ParsedLiveArgs {
  readonly flags: LiveFlags;
  readonly unknown: ReadonlyArray<string>;
}

/** What a scenario selection produced. */
export interface LiveSelection<A> {
  /** The requested scenarios, in registry order. */
  readonly selected: ReadonlyArray<A>;
  /** Requested ids the registry does not know. */
  readonly missing: ReadonlyArray<string>;
}

const EMPTY: LiveFlags = {
  only: [],
  all: false,
  list: false,
  json: false,
};

/** Splits `a,b` into ids, dropping blanks; `--only` also accepts repeats. */
const ids = (value: string): ReadonlyArray<string> =>
  pipe(value, Str.split(","), Arr.map(Str.trim), Arr.filter(Str.isNonEmpty));

/**
 * Parses the live runner's argv (without `node` and the script path).
 *
 * Unknown tokens are collected rather than ignored: a typo like `--onlyy` must
 * not fall through to a full run.
 */
export const parseArgs = (argv: ReadonlyArray<string>): ParsedLiveArgs => {
  const step = (
    rest: ReadonlyArray<string>,
    flags: LiveFlags,
    unknown: ReadonlyArray<string>,
  ): ParsedLiveArgs =>
    Option.match(Arr.head(rest), {
      onNone: () => ({ flags, unknown }),
      onSome: (token) => {
        const tail = Arr.drop(rest, 1);
        return Match.value(token).pipe(
          Match.when("--all", () =>
            step(tail, { ...flags, all: true }, unknown),
          ),
          Match.when("--list", () =>
            step(tail, { ...flags, list: true }, unknown),
          ),
          Match.when("--json", () =>
            step(tail, { ...flags, json: true }, unknown),
          ),
          Match.when("--only", () =>
            Option.match(Arr.head(tail), {
              onNone: () =>
                step(
                  tail,
                  flags,
                  Arr.append(unknown, "--only needs a scenario id"),
                ),
              onSome: (value) =>
                step(
                  Arr.drop(tail, 1),
                  { ...flags, only: Arr.appendAll(flags.only, ids(value)) },
                  unknown,
                ),
            }),
          ),
          Match.orElse((flag) => step(tail, flags, Arr.append(unknown, flag))),
        );
      },
    });

  return step(argv, EMPTY, []);
};

/** The ids the registry exposes, in run order. */
export const idsOf = <A extends { readonly id: string }>(
  list: ReadonlyArray<A>,
): ReadonlyArray<string> => Arr.map(list, (scenario) => scenario.id);

/**
 * Selects the requested scenarios, preserving registry order and dropping
 * duplicates. An absent selection is the full list; the runner decides whether
 * that is allowed (`--all`).
 */
export const selectLive = <A extends { readonly id: string }>(
  list: ReadonlyArray<A>,
  only: ReadonlyArray<string>,
): LiveSelection<A> => {
  if (Arr.length(only) === 0) return { selected: list, missing: [] };
  const wanted = HashSet.fromIterable(only);
  const known = HashSet.fromIterable(idsOf(list));
  return {
    selected: Arr.filter(list, (scenario) => HashSet.has(wanted, scenario.id)),
    missing: Arr.filter(only, (id) => !HashSet.has(known, id)),
  };
};

/** The usage text, including the two ways to choose scenarios. */
export const usage: string = Arr.join(
  [
    "usage:",
    "  --only <id[,id]>  run only these live scenarios (repeatable)",
    "  --all             run the full live suite (opens a window, ~9 minutes)",
    "  --list            print the scenario ids and exit",
    "  --json            print the JSON report after the run",
    "exit 2: the live suite produced no evidence",
  ],
  "\n",
);

/** A bad id names the id and every valid one, so a typo is self-correcting. */
export const formatMissing = (
  missing: ReadonlyArray<string>,
  known: ReadonlyArray<string>,
): string =>
  Arr.join(
    [
      `live smoke: unknown scenario id: ${Arr.join(missing, ", ")}`,
      `  known ids: ${Arr.join(known, ", ")}`,
      "exit 2: the live suite produced no evidence",
    ],
    "\n",
  );
