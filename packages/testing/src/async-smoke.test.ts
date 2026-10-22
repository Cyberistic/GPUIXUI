/**
 * Guards the live-window runner contract.
 *
 * The bug this prevents: a window verb that fails (a missing locator, a closed
 * window) being recorded as a *passed* or merely *failed* check, or aborting the
 * remaining probes. A live run must report a host failure as `errored`, keep the
 * suite going, and keep the capability verdict `failed` — otherwise a broken
 * window reads as verified evidence.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  CheckOutcome,
  SmokeHostError,
  type AsyncSmokeHost,
  type AsyncSmokeScenario,
  type SmokeReport,
  runAsyncScenarios,
} from "./smoke.js";
import { checkOf, statusOf } from "./test-support.js";

const inertHost: AsyncSmokeHost = {
  text: () => Effect.succeed(""),
  paintedText: () => Effect.succeed([]),
  bounds: () => Effect.succeed(null),
  windowSize: () => Effect.succeed({ width: 900, height: 520 }),
  zoomWindow: () => Effect.void,
  focused: () => Effect.succeed(null),
  click: () => Effect.void,
  rightClick: () => Effect.void,
  hover: () => Effect.void,
  drag: () => Effect.void,
  wheel: () => Effect.void,
  scrollOffset: () => Effect.succeed(null),
  scrollToItem: () => Effect.void,
  listAnchor: () => Effect.succeed(null),
  key: () => Effect.void,
  selectedText: () => Effect.succeed(null),
  clearSelection: () => Effect.void,
  keyUp: () => Effect.void,
  focusNext: () => Effect.void,
  focusElement: () => Effect.void,
  registerFont: () => Effect.void,
  waitFor: () => Effect.void,
  capture: () => Effect.void,
  pixels: () =>
    Effect.fail(new SmokeHostError({ verb: "pixels", cause: "inert host" })),
};

const probe = (
  id: string,
  steps: AsyncSmokeScenario["steps"],
): AsyncSmokeScenario => ({
  id,
  title: `probe ${id}`,
  capability: "focus",
  steps,
});

const run = (
  host: AsyncSmokeHost,
  probes: ReadonlyArray<AsyncSmokeScenario>,
): Effect.Effect<SmokeReport> =>
  runAsyncScenarios(host, probes, { host: "fixture window", startedAt: 0 });

const isFailed = (report: SmokeReport, index: number): boolean =>
  Option.exists(checkOf(report, index), (check) =>
    CheckOutcome.guards.failed(check.outcome),
  );

const erroredDetail = (
  report: SmokeReport,
  index: number,
): Option.Option<string> =>
  Option.flatMap(checkOf(report, index), (check) =>
    CheckOutcome.match(check.outcome, {
      passed: () => Option.none(),
      failed: () => Option.none(),
      errored: (outcome) => Option.some(outcome.detail),
    }),
  );

describe("SmokeHostError", () => {
  it("names the verb that broke and keeps the cause readable", () => {
    const error = new SmokeHostError({
      verb: "text composer",
      cause: new Error("No element"),
    });
    expect(error.message).toBe("text composer: No element");
  });

  it("does not print an unreadable cause as a stack", () => {
    const error = new SmokeHostError({ verb: "click save", cause: 42 });
    expect(error.message).toBe("click save: unknown error");
  });
});

describe("runAsyncScenarios", () => {
  it.effect(
    "records a live probe's assertions and verifies its capability",
    () =>
      Effect.gen(function* () {
        const report = yield* run(inertHost, [
          probe("focus-visible", (ctx) =>
            Effect.gen(function* () {
              yield* ctx.expectEqual("tab focus", "tab-ring", "tab-ring");
              yield* ctx.expectContains("painted", "ring", "ring");
            }),
          ),
        ]);

        expect(Arr.length(report.scenarios[0]?.checks ?? [])).toBe(2);
        expect(Option.getOrUndefined(statusOf(report, "focus"))).toBe(
          "verified",
        );
      }),
  );

  it.effect("records a failed assertion and still runs the next probe", () =>
    Effect.gen(function* () {
      const report = yield* run(inertHost, [
        probe("first", (ctx) => ctx.expectEqual("focus", "left", "right")),
        probe("second", (ctx) => ctx.expectEqual("focus", "right", "right")),
      ]);

      expect(isFailed(report, 0)).toBe(true);
      expect(Arr.length(report.scenarios)).toBe(2);
      expect(Option.getOrUndefined(statusOf(report, "focus"))).toBe("failed");
    }),
  );

  it.effect("reports a window verb failure as errored, not as a pass", () =>
    Effect.gen(function* () {
      const report = yield* run(
        {
          ...inertHost,
          text: (testId) =>
            Effect.fail(
              new SmokeHostError({
                verb: `text ${testId}`,
                cause: "window closed",
              }),
            ),
        },
        [probe("window", (ctx) => Effect.map(ctx.host.text("row"), () => {}))],
      );

      expect(isFailed(report, 0)).toBe(false);
      expect(Option.getOrUndefined(erroredDetail(report, 0))).toContain(
        "text row: window closed",
      );
    }),
  );
});
