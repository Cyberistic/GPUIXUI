/**
 * Queries over the decoded accessibility tree the smoke host reports.
 *
 * A scenario addresses a node by the `aria-id` it authored, because AccessKit's
 * own node keys are ephemeral (`a`, `b`, …). Two probes need the same lookup, so
 * it lives here rather than in either scenario.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { Smoke } from "@gpuixui/testing";

/** The accessible node authored as `aria-id={authorId}`, when one exists. */
export const nodeFor = (
  tree: Smoke.A11yTree,
  authorId: string,
): Option.Option<Smoke.A11yNode> =>
  Option.flatMap(
    Arr.findFirst(R.values(tree.nodes), (entry) =>
      Option.exists(entry.aria, (aria) =>
        Option.contains(aria.author_id, authorId),
      ),
    ),
    (entry) => entry.aria,
  );

/** A node's field, or `"none"` so an assertion can name its absence. */
export const fieldText = (value: Option.Option<string>): string =>
  Option.getOrElse(value, () => "none");
