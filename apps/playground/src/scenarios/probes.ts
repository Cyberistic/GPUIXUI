/**
 * Shared readers for the primitive probes.
 *
 * The readout text and the AccessKit dump are the two things the
 * `primitives-*` scenarios assert against; keeping the lookups here means one
 * failure message shape and one place to change when the dump's shape moves.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import type { Smoke } from "@gpuixui/testing";

/** A readout's text, or `"none"` so a failure names the absence. */
export const read = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "none");

/** A node's field, or `"none"` so a failure names the absence. */
export const text = (value: Option.Option<string>): string =>
  Option.getOrElse(value, () => "none");

/** The `testId` of whatever holds native focus, or `"none"`. */
export const focusedId = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

/** The painted accessibility tree, or a labelled assertion failure. */
export const treeOf = (ctx: Smoke.SmokeContext) =>
  ctx.expectSome(
    "the runtime painted an accessibility tree",
    Option.fromNullishOr(ctx.host.a11y()),
  );

/** The accessible node with `role` and `label`, when the dump has one. */
export const nodeFor = (
  tree: Smoke.A11yTree,
  role: string,
  label: string,
): Option.Option<Smoke.A11yNode> =>
  Option.flatMap(
    Arr.findFirst(
      R.values(tree.nodes),
      (entry) =>
        Option.exists(entry.aria, (aria) => Option.contains(aria.role, role)) &&
        Option.exists(entry.aria, (aria) => Option.contains(aria.label, label)),
    ),
    (entry) => entry.aria,
  );

/** Asserts the node exists and returns it. */
export const node = (
  ctx: Smoke.SmokeContext,
  tree: Smoke.A11yTree,
  role: string,
  label: string,
) =>
  ctx.expectSome(
    `node ${role} "${label}" is exposed`,
    nodeFor(tree, role, label),
  );
