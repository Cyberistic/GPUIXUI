/**
 * Guards the runner contract.
 *
 * If a failing scenario aborted the suite, a defect killed it, `expectNear`
 * compared exclusively, or `expectSome` ignored absence, the report could mark a
 * capability `verified` for checks that never ran — the exact lie the smoke
 * suite exists to prevent.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { CheckOutcome } from "./smoke.js";
import { checkOf, labelsOf, run, scenario, statusOf } from "./test-support.js";

const holds = (
  check: Option.Option<{ readonly outcome: CheckOutcome }>,
  guard: (outcome: CheckOutcome) => boolean,
): boolean => Option.exists(check, (result) => guard(result.outcome));

describe("runScenarios", () => {
  it.effect("a failing scenario does not stop the suite", () =>
    Effect.gen(function* () {
      const report = yield* run([
        scenario("first", "layout", (ctx) => ctx.expectEqual("width", 10, 20)),
        scenario("second", "scroll", (ctx) =>
          ctx.expectEqual("offset", -40, -40),
        ),
      ]);
      expect(Arr.map(report.scenarios, (result) => result.id)).toEqual([
        "first",
        "second",
      ]);
      expect(Option.getOrUndefined(statusOf(report, "layout"))).toBe("failed");
      expect(Option.getOrUndefined(statusOf(report, "scroll"))).toBe(
        "verified",
      );
      expect(holds(checkOf(report, 0), CheckOutcome.guards.failed)).toBe(true);
    }),
  );

  it.effect("a defect is data and the next scenario still runs", () =>
    Effect.gen(function* () {
      const report = yield* run([
        scenario("boom", "overlay", () => Effect.die("kaboom")),
        scenario("after", "focus", (ctx) =>
          ctx.expectEqual("mode", "on", "on"),
        ),
      ]);
      expect(Arr.map(report.scenarios, (result) => result.id)).toEqual([
        "boom",
        "after",
      ]);
      expect(Option.getOrUndefined(statusOf(report, "overlay"))).toBe("failed");
      expect(Option.getOrUndefined(statusOf(report, "focus"))).toBe("verified");
      expect(holds(checkOf(report, 0), CheckOutcome.guards.errored)).toBe(true);
    }),
  );

  it.effect("records checks in the order they ran", () =>
    Effect.gen(function* () {
      const report = yield* run([
        scenario("ordered", "input", (ctx) =>
          Effect.gen(function* () {
            yield* ctx.expectEqual("a", 1, 1);
            yield* ctx.expectContains("b", "hello", "ell");
          }),
        ),
      ]);
      expect(labelsOf(report, 0)).toEqual(["a", "b"]);
    }),
  );
});

describe("expectNear", () => {
  it.effect("passes at the tolerance boundary and fails just past it", () =>
    Effect.gen(function* () {
      const report = yield* run([
        scenario("edge", "panel", (ctx) => ctx.expectNear("edge", 100, 98, 2)),
        scenario("past", "panel", (ctx) =>
          ctx.expectNear("past", 100, 98, 1.9),
        ),
      ]);
      expect(holds(checkOf(report, 0), CheckOutcome.guards.passed)).toBe(true);
      expect(holds(checkOf(report, 1), CheckOutcome.guards.failed)).toBe(true);
      expect(Option.getOrUndefined(statusOf(report, "panel"))).toBe("failed");
    }),
  );
});

describe("expectSome", () => {
  it.effect("returns the value on Some and fails on None", () =>
    Effect.gen(function* () {
      const report = yield* run([
        scenario("some", "text", (ctx) =>
          Effect.flatMap(
            ctx.expectSome("present box", Option.some(7)),
            (value) => ctx.expectEqual("value", value, 7),
          ),
        ),
        scenario("none", "text", (ctx) =>
          ctx.expectSome("missing box", Option.none<number>()),
        ),
      ]);
      expect(holds(checkOf(report, 0), CheckOutcome.guards.passed)).toBe(true);
      expect(holds(checkOf(report, 1), CheckOutcome.guards.failed)).toBe(true);
    }),
  );
});
