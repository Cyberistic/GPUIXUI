/**
 * Split a sequence into maximal contiguous runs of equal group names.
 *
 * Shared by every component that paints one heading per run (the Combobox's
 * options and the command palette's actions, plan 395 and plan 783). An
 * interleaved group produces two runs, and an absent group is its own run, so a
 * heading never jumps across a section the caller declared in between.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** One contiguous slice of a sequence sharing a group name. */
export interface Run<A> {
  readonly group: Option.Option<string>;
  readonly items: ReadonlyArray<A>;
  /** Index of the run's first item; ranking tie-breaks use it. */
  readonly from: number;
}

const sameGroup = (
  left: Option.Option<string>,
  right: Option.Option<string>,
): boolean =>
  Option.match(left, {
    onNone: () => Option.isNone(right),
    onSome: (name) => Option.exists(right, (candidate) => candidate === name),
  });

/** The runs, in declaration order. */
export const runsBy = <A>(
  items: ReadonlyArray<A>,
  groupOf: (item: A) => Option.Option<string>,
): ReadonlyArray<Run<A>> =>
  Arr.reduce(items, Arr.empty<Run<A>>(), (runs, item, index) => {
    const group = groupOf(item);
    return Option.match(Arr.last(runs), {
      onNone: () => [{ group, items: [item], from: index }],
      onSome: (run) =>
        sameGroup(run.group, group)
          ? Arr.append(Arr.dropRight(runs, 1), {
              ...run,
              items: Arr.append(run.items, item),
            })
          : Arr.append(runs, { group, items: [item], from: index }),
    });
  });
