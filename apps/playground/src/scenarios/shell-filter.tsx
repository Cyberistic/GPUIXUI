/**
 * `shell-filter` — the playground's scenario filter (plan `528`).
 *
 * The registry is the sidebar, which keeps the UI and the smoke suite in step
 * but makes 100 entries a long scroll. This mounts the real `App`, types into
 * the filter through the native editor and proves the four rules a reader
 * relies on:
 *
 * - a query hides non-matching entries and shows a live count;
 * - the stage follows the first match when the pick is hidden;
 * - `escape` clears the query and restores the previous pick — the filter
 *   never rewrites the selection;
 * - a query with no match paints an empty state instead of a blank sidebar.
 *
 * The warning this guards: mapping `list` (rather than the filtered view) into
 * the nav, or highlighting `selected` instead of the derived current, leaves a
 * row painted that the stage is not showing.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import type { Smoke } from "@gpuixui/testing";
import { App } from "../app.js";
import { palettes } from "../palettes.js";
import { scenarios } from "./index.js";
import type { PlaygroundScenario } from "../types.js";

const bounds = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<Smoke.Bounds> => Option.fromNullishOr(ctx.host.bounds(testId));

const readout = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "");

const background = (
  ctx: Smoke.SmokeContext,
  testId: string,
): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (snapshot) => snapshot.backgroundColor,
  );

const titleOf = (id: string): string =>
  Option.match(
    Arr.findFirst(scenarios, (scenario) => scenario.id === id),
    {
      onNone: () => `missing:${id}`,
      onSome: (scenario) => scenario.title,
    },
  );

/** Types one key at a time into the focused filter. */
const typeKeys = (ctx: Smoke.SmokeContext, keys: ReadonlyArray<string>): void =>
  Arr.forEach(keys, (key) => ctx.host.key(key));

const count = (ctx: Smoke.SmokeContext): string =>
  readout(ctx, "shell-filter-count");

const total = (): string =>
  `${Arr.length(scenarios)} of ${Arr.length(scenarios)}`;

const draft = (ctx: Smoke.SmokeContext, query: string): Effect.Effect<void> =>
  Effect.sync(() => {
    ctx.host.click("shell-filter");
    typeKeys(ctx, Str.split(query, ""));
  });

export const shellFilterScenario: PlaygroundScenario = {
  id: "shell-filter",
  title: "Playground shell: the scenario filter",
  capability: "layout",
  view: () => <App list={scenarios} />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* draft(ctx, "crop");
      yield* ctx.expectEqual(
        "the filter counts only its match",
        count(ctx),
        `1 of ${Arr.length(scenarios)}`,
      );
      yield* ctx.expectSome(
        "the matching entry is painted",
        bounds(ctx, "nav-crop-area"),
      );
      yield* ctx.expectEqual(
        "a filtered-out entry leaves the sidebar",
        Option.isNone(bounds(ctx, "nav-window-layout")),
        true,
      );
      yield* ctx.expectEqual(
        "the stage follows the first match while the pick is hidden",
        readout(ctx, "stage-title"),
        titleOf("crop-area"),
      );
      yield* ctx.expectEqual(
        "the row the stage shows paints the accent",
        Option.getOrElse(background(ctx, "nav-crop-area"), () => "none"),
        palettes.dark.colors.accent,
      );

      ctx.host.click("nav-crop-area");
      yield* ctx.expectEqual(
        "clicking a filtered entry mounts it",
        readout(ctx, "stage-title"),
        titleOf("crop-area"),
      );
      yield* ctx.expectEqual(
        "the filter's current entry paints the accent",
        Option.getOrElse(background(ctx, "nav-crop-area"), () => "none"),
        palettes.dark.colors.accent,
      );

      ctx.host.key("escape");
      yield* ctx.expectEqual("Escape clears the query", count(ctx), total());
      yield* ctx.expectSome(
        "clearing restores every entry",
        bounds(ctx, "nav-window-layout"),
      );
      yield* ctx.expectEqual(
        "clearing keeps the pick the reader made",
        readout(ctx, "stage-title"),
        titleOf("crop-area"),
      );

      yield* draft(ctx, "CROP");
      yield* ctx.expectEqual(
        "the match is case-insensitive",
        count(ctx),
        `1 of ${Arr.length(scenarios)}`,
      );

      ctx.host.key("escape");
      yield* draft(ctx, "zzz");
      yield* ctx.expectEqual(
        "no match is zero, not everything",
        count(ctx),
        `0 of ${Arr.length(scenarios)}`,
      );
      yield* ctx.expectEqual(
        "the empty sidebar says so",
        readout(ctx, "shell-filter-empty"),
        "No scenarios match",
      );
      yield* ctx.expectEqual(
        "the stage has nothing to show",
        readout(ctx, "stage-title"),
        "no scenarios",
      );

      ctx.host.key("escape");
      ctx.host.click("nav-window-layout");
      yield* draft(ctx, "crop");
      yield* ctx.expectEqual(
        "a hidden pick yields to the first match",
        readout(ctx, "stage-title"),
        titleOf("crop-area"),
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "clearing restores the pick the filter hid",
        readout(ctx, "stage-title"),
        titleOf("window-layout"),
      );
    }),
};
