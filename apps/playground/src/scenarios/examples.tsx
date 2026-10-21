/**
 * The example gallery: every shipped `@gpuixui/components` example in the real
 * runtime.
 *
 * A component's behaviour suite proves its parts; nothing proved that the
 * screens a reader copies out of the docs *mount*. `packages/components/examples`
 * is the registry this app is its only consumer of, so the gallery pages through
 * it one screen at a time: mounting 39 screens at once would lay out a very tall
 * tree and leave a screen's timer or `Effect` fiber running behind the next one.
 *
 * Per page, all read from the renderer: the readout names the id, the example's
 * wrapper lays out a height of its own, and the wrapper's subtree carries text —
 * a screen that renders nothing paints no text, and the wrapper would be zero
 * high. The paging control is the only input; a page that never advances would
 * leave the readout on the first id and fail by name.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { examples } from "@gpuixui/components/examples";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";
import { Body, Pressable, Readout } from "../ui.js";

/**
 * Every example id, sorted.
 *
 * The registry's key order is the object literal's, which is a review artefact
 * rather than a plan; sorting makes the page order stable, so a failing check
 * names the same id on every run.
 */
export const exampleIds: ReadonlyArray<string> = Arr.sort(
  R.keys(examples),
  Order.String,
);

/** The id on a page, or `None` past the end. */
const idAt = (page: number): Option.Option<string> =>
  Option.fromNullishOr(exampleIds[page]);

/** One example, in a wrapper the gallery can address and measure. */
const ExamplePage = ({ id }: { readonly id: string }) => {
  const Example: ComponentType | undefined = examples[id];
  return (
    <div
      testId={`example-${id}`}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {Example === undefined ? null : <Example />}
    </div>
  );
};

const Gallery = () => {
  const [page, setPage] = useState(0);
  const id = idAt(page);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Pressable
          testId="example-next"
          onClick={() => setPage((shown) => shown + 1)}
        >
          <Body>next example</Body>
        </Pressable>
        <Readout testId="example-readout">
          {`example=${Option.getOrElse(id, () => "none")} page=${page} of=${Arr.length(exampleIds)}`}
        </Readout>
      </div>
      {Option.match(id, {
        onNone: (): ReactNode => null,
        onSome: (shown) => <ExamplePage id={shown} />,
      })}
    </div>
  );
};

const readout = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.text("example-readout")),
    () => "",
  );

export const examplesMountScenario: ScenarioBody = {
  view: () => <Gallery />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const painted = yield* Effect.forEach(
        exampleIds,
        (id) =>
          Effect.gen(function* () {
            yield* ctx.expectContains(
              `the gallery is showing ${id}`,
              readout(ctx),
              `example=${id}`,
            );

            const box = yield* ctx.expectSome(
              `${id} paints its root`,
              Option.fromNullishOr(ctx.host.bounds(`example-${id}`)),
            );
            yield* ctx.expectEqual(
              `${id} lays out a height of its own`,
              box.height > 0,
              true,
            );

            const text = Option.getOrElse(
              Option.fromNullishOr(ctx.host.text(`example-${id}`)),
              () => "",
            );
            yield* ctx.expectEqual(
              `${id} paints content of its own`,
              Str.isNonEmpty(Str.trim(text)),
              true,
            );

            ctx.host.click("example-next");
            return text;
          }),
        { concurrency: 1 },
      );

      // A registry row pointing at an example another row already mounts shows
      // the reader one screen under two names: the wrapper and the readout would
      // differ, so only the screen's own text catches it.
      yield* ctx.expectEqual(
        "no two examples paint the same screen",
        Arr.length(Arr.dedupe(painted)),
        Arr.length(painted),
      );

      // The plan ends where the registry does: one press past the last id shows
      // no example at all, which also unmounts the last screen's timers.
      yield* ctx.expectContains(
        "the gallery ends after the last example",
        readout(ctx),
        "example=none",
      );
    }),
};
