import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { examples as componentExamples } from "@gpuixui/components/examples";
import { examples as fileExamples } from "@gpuixui/files/examples";
import { examples as dataExamples } from "@gpuixui/data/examples";
import { examples as fxExamples } from "@gpuixui/fx/examples";
import {
  AppMenuExample,
  StatusBarExample,
  ToolbarExample,
} from "@gpuixui/shell/examples";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";
import { Body, Pressable, Readout } from "../ui.js";

const shellExamples: Readonly<Record<string, ComponentType>> = {
  "app-menu": AppMenuExample,
  "status-bar": StatusBarExample,
  toolbar: ToolbarExample,
};

export const examples: Readonly<Record<string, ComponentType>> = {
  ...componentExamples,
  ...dataExamples,
  ...fxExamples,
  ...shellExamples,
  ...fileExamples,
};

export const exampleIds: ReadonlyArray<string> = Arr.sort(
  R.keys(examples),
  Order.String,
);

const idAt = (page: number): Option.Option<string> =>
  Option.fromNullishOr(exampleIds[page]);

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

      yield* ctx.expectEqual(
        "no two examples paint the same screen",
        Arr.length(Arr.dedupe(painted)),
        Arr.length(painted),
      );

      yield* ctx.expectContains(
        "the gallery ends after the last example",
        readout(ctx),
        "example=none",
      );
    }),
};
