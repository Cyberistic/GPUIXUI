/**
 * The live CLI's arguments and scenario selection.
 *
 * The live runner used to ignore argv and drive every live scenario, so a check
 * for one component cost a full window run. Selection is pure and lives here so
 * the runner's contract is testable without opening a window: no `--only` and
 * no `--all` is a usage error, never a silent full run.
 *
 * The generic rules (id parsing, registry-order selection, the missing-id
 * message) are shared with the headless CLI in `../scenario-selection.js`;
 * plan `531` hoisted them so the two runners cannot drift.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  formatMissing as formatMissingFor,
  idsOf,
  parseIds,
  selectScenarios,
  type Selection,
} from "../scenario-selection.js";

export { idsOf };

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
export type LiveSelection<A> = Selection<A>;

const EMPTY: LiveFlags = {
  only: [],
  all: false,
  list: false,
  json: false,
};

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
                  {
                    ...flags,
                    only: Arr.appendAll(flags.only, parseIds(value)),
                  },
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

/**
 * Selects the requested scenarios, preserving registry order and dropping
 * duplicates. An absent selection is the full list; the runner decides whether
 * that is allowed (`--all`).
 */
export const selectLive = <A extends { readonly id: string }>(
  list: ReadonlyArray<A>,
  only: ReadonlyArray<string>,
): LiveSelection<A> => selectScenarios(list, only);

/** A bad id names the id and every valid one, so a typo is self-correcting. */
export const formatMissing = (
  missing: ReadonlyArray<string>,
  known: ReadonlyArray<string>,
): string => formatMissingFor("live smoke", missing, known);

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
