/**
 * `font-family` / `live-font-family`: does a named typeface reach the glyphs the
 * runtime shapes?
 *
 * The platform type styles (macOS / Linux / Windows) name a monospace family,
 * and `theme-platform` reads those names back from the runtime's **authored**
 * style report. Nothing in the suite ever varied `fontFamily` and looked at the
 * shaped run, so a runtime that accepted the property and shaped every run with
 * the default face would pass every check while the three platform styles typed
 * identically.
 *
 * This probe varies only `fontFamily` on runs of the same text and reads the
 * highlight wash — the quad the runtime paints for that run, and the only
 * advance signal both hosts expose (plan `342` used it for weight). The default
 * face is proportional, the platform mono is uniform, the same phrase advances
 * differently across the two, and a family no host has falls back to the
 * default's advance. The relations are pure in `font-metrics.ts`.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { systemMonoFamily } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";
import {
  FONT_SIZE,
  MISSING_FAMILY,
  NARROW_RUN,
  PHRASE_RUN,
  WIDE_RUN,
  differs,
  missingFamilyIsForeign,
  proportional,
  runWidths,
  same,
  uniform,
} from "./font-metrics.js";

const FontProbe = () => {
  const theme = useTheme();
  const ink = { color: theme.colors.foreground };
  const run = { fontSize: FONT_SIZE, ...ink };
  const mono = { ...run, fontFamily: systemMonoFamily };
  return (
    <div
      testId="font-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: 420,
        padding: 16,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        testId="font-system-narrow"
        highlight={{ query: NARROW_RUN }}
        style={run}
      >
        {NARROW_RUN}
      </text>
      <text
        testId="font-system-wide"
        highlight={{ query: WIDE_RUN }}
        style={run}
      >
        {WIDE_RUN}
      </text>
      <text
        testId="font-mono-narrow"
        highlight={{ query: NARROW_RUN }}
        style={mono}
      >
        {NARROW_RUN}
      </text>
      <text
        testId="font-mono-wide"
        highlight={{ query: WIDE_RUN }}
        style={mono}
      >
        {WIDE_RUN}
      </text>
      <text
        testId="font-system-run"
        highlight={{ query: PHRASE_RUN }}
        style={run}
      >
        {PHRASE_RUN}
      </text>
      <text
        testId="font-mono-run"
        highlight={{ query: PHRASE_RUN }}
        style={mono}
      >
        {PHRASE_RUN}
      </text>
      <text
        testId="font-missing-run"
        highlight={{ query: PHRASE_RUN }}
        style={{ ...run, fontFamily: MISSING_FAMILY }}
      >
        {PHRASE_RUN}
      </text>
    </div>
  );
};

export const fontFamilyView = (): ReactNode => <FontProbe />;

/** The advances the relations need, one per fixture run. */
interface RunAdvances {
  readonly narrowSystem: number;
  readonly wideSystem: number;
  readonly narrowMono: number;
  readonly wideMono: number;
  readonly phraseSystem: number;
  readonly phraseMono: number;
  readonly phraseMissing: number;
}

/** Reads one run's advance by its paint-order index, failing by name. */
const advanceAt = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  read: (text: string) => Effect.Effect<ReadonlyArray<number>, E>,
  text: string,
  index: number,
  label: string,
): Effect.Effect<number, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const widths = yield* read(text);
    return yield* ctx.expectSome(label, Arr.get(widths, index));
  });

/**
 * The narrow/wide runs appear twice (default then mono) and the phrase three
 * times (default, mono, missing) in document order — the same paint-order
 * convention plan `342` uses. A swapped index cannot pass silently: the two
 * faces have opposite properties, so the uniform or proportional check fails
 * (measured: the uniform check, §11 of plan `771`).
 */
const readAdvances = <Host, E>(
  ctx: Smoke.SmokeContext<Host>,
  read: (text: string) => Effect.Effect<ReadonlyArray<number>, E>,
): Effect.Effect<RunAdvances, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const narrowSystem = yield* advanceAt(
      ctx,
      read,
      NARROW_RUN,
      0,
      "the default face paints the narrow run",
    );
    const wideSystem = yield* advanceAt(
      ctx,
      read,
      WIDE_RUN,
      0,
      "the default face paints the wide run",
    );
    const narrowMono = yield* advanceAt(
      ctx,
      read,
      NARROW_RUN,
      1,
      "the mono face paints the narrow run",
    );
    const wideMono = yield* advanceAt(
      ctx,
      read,
      WIDE_RUN,
      1,
      "the mono face paints the wide run",
    );
    const phraseSystem = yield* advanceAt(
      ctx,
      read,
      PHRASE_RUN,
      0,
      "the default face paints the phrase",
    );
    const phraseMono = yield* advanceAt(
      ctx,
      read,
      PHRASE_RUN,
      1,
      "the mono face paints the phrase",
    );
    const phraseMissing = yield* advanceAt(
      ctx,
      read,
      PHRASE_RUN,
      2,
      "the missing family paints the phrase",
    );
    return {
      narrowSystem,
      wideSystem,
      narrowMono,
      wideMono,
      phraseSystem,
      phraseMono,
      phraseMissing,
    };
  });

/** The shared contract: every threshold is a relation, never a host width. */
const fontChecks = <Host,>(
  ctx: Smoke.SmokeContext<Host>,
  w: RunAdvances,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    yield* ctx.expectEqual(
      "the missing-family fixture is not a real family",
      missingFamilyIsForeign(systemMonoFamily),
      true,
    );
    yield* ctx.expectEqual(
      "the default face is proportional",
      proportional(w.narrowSystem, w.wideSystem, 16),
      true,
    );
    yield* ctx.expectEqual(
      "the platform mono face is monospaced",
      uniform([w.narrowMono, w.wideMono], 1),
      true,
    );
    yield* ctx.expectEqual(
      "the same phrase advances differently in the two faces",
      differs(w.phraseMono, w.phraseSystem, 4),
      true,
    );
    yield* ctx.expectEqual(
      "a family the host lacks falls back to the default face",
      same(w.phraseMissing, w.phraseSystem, 4),
      true,
    );
    yield* ctx.expectEqual(
      "the fallback is not the mono face",
      differs(w.phraseMissing, w.phraseMono, 4),
      true,
    );
  });

export const fontFamilyScenario: PlaygroundScenario = {
  id: "font-family",
  title: "Fonts: the platform mono face, the default face and the fallback",
  capability: "typography",
  view: fontFamilyView,
  steps: (ctx) =>
    Effect.gen(function* () {
      const highlights = ctx.host.highlights();
      const advances = yield* readAdvances(ctx, (text) =>
        Effect.succeed(runWidths(highlights, text)),
      );
      yield* fontChecks(ctx, advances);
    }),
};

export const fontFamilyLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-font-family",
  title: "Live fonts: the platform mono face and the fallback in a window",
  capability: "typography",
  steps: (ctx) =>
    Effect.gen(function* () {
      const highlights = yield* ctx.host.highlights();
      const advances = yield* readAdvances(ctx, (text) =>
        Effect.succeed(runWidths(highlights, text)),
      );
      yield* fontChecks(ctx, advances);
    }),
};
