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
import * as Str from "effect/String";
import type { Smoke } from "@gpuixui/testing";
import { nodeFor as nodeForAuthor } from "../a11y.js";

/** A readout's text, or `"none"` so a failure names the absence. */
export const read = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "none");

/** A node's field, or `"none"` so a failure names the absence. */
export const text = (value: Option.Option<string>): string =>
  Option.getOrElse(value, () => "none");

/** The `testId` of whatever holds native focus, or `"none"`. */
export const focusedId = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.focused()), () => "none");

/** A `key=value` field of a readout's text, or `None` when the key is absent. */
export const fieldOf = (readout: string, key: string): Option.Option<string> =>
  Option.map(
    Arr.findFirst(Str.split(readout, " "), Str.startsWith(`${key}=`)),
    (part) => Str.replace(`${key}=`, "")(part),
  );

/** A `key=value` field of `testId`'s readout, or `None` when it is absent. */
export const readoutField = (
  ctx: Smoke.SmokeContext,
  testId: string,
  key: string,
): Option.Option<string> =>
  Option.flatMap(Option.fromNullishOr(ctx.host.text(testId)), (readout) =>
    fieldOf(readout, key),
  );

/** A numeric readout field, or `None` when it is absent or unparseable. */
export const readoutNumber = (
  ctx: Smoke.SmokeContext,
  testId: string,
  key: string,
): Option.Option<number> =>
  Option.flatMap(readoutField(ctx, testId, key), (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Option.some(parsed) : Option.none();
  });

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

/** A painted element's bounds, or `None` when it never painted. */
export const painted = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.fromNullishOr(ctx.host.bounds(testId));

/** An element's applied style, or `None` when it never painted. */
export const styleOf = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.fromNullishOr(ctx.host.paintedStyle(testId));

/** The accessible node authored as `aria-id={authorId}`, when the frame holds one. */
export const ariaOf = (ctx: Smoke.SmokeContext, authorId: string) =>
  Option.flatMap(Option.fromNullishOr(ctx.host.a11y()), (tree) =>
    nodeForAuthor(tree, authorId),
  );
