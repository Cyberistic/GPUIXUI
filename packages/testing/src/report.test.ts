/**
 * Guards the report's honesty.
 *
 * If the JSON encoder dropped a nested tagged union, a failed scenario reported
 * exit `0`, or the human report hid which check failed and what it expected, a
 * red smoke run could look green or be impossible to act on.
 */
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { exitCode, formatReport, passed, reportJson } from "./report.js";
import { CheckOutcome, SmokeReport } from "./smoke.js";
import { checkOf, run, runScoped, scenario, statusOf } from "./test-support.js";

const decodeReport = Schema.decodeUnknownSync(
  Schema.fromJsonString(SmokeReport),
);
const sameReport = Schema.toEquivalence(SmokeReport);

const failingReport = run([
  scenario("panel-resize", "panel", (ctx) =>
    ctx.expectNear("left width", 320, 400, 1),
  ),
  scenario("layout-flex", "layout", (ctx) => ctx.expectNear("gap", 8, 8, 1)),
]);

describe("reportJson", () => {
  it.effect(
    "round-trips through the schema with the failure detail intact",
    () =>
      Effect.gen(function* () {
        const report = yield* failingReport;
        const json = reportJson(report);
        const decoded = decodeReport(json);
        expect(sameReport(decoded, report)).toBe(true);
        expect(json).toContain("left width");
        expect(json).toContain("expected 400 ± 1");
        expect(
          Option.exists(checkOf(decoded, 0), (check) =>
            CheckOutcome.guards.failed(check.outcome),
          ),
        ).toBe(true);
      }),
  );
});

describe("exitCode", () => {
  it.effect("is 1 for a failed scenario and 0 for a clean run", () =>
    Effect.gen(function* () {
      const failing = yield* failingReport;
      const clean = yield* run([
        scenario("layout-flex", "layout", (ctx) =>
          ctx.expectNear("gap", 8, 8, 1),
        ),
      ]);
      expect(exitCode(failing)).toBe(1);
      expect(exitCode(clean)).toBe(0);
      expect(passed(failing)).toBe(false);
      expect(passed(clean)).toBe(true);
    }),
  );

  it.effect("treats a scenario that ran no checks as no evidence", () =>
    Effect.gen(function* () {
      const report = yield* run([
        scenario("silent", "tree", () => Effect.void),
      ]);
      expect(passed(report)).toBe(false);
      expect(Option.getOrUndefined(statusOf(report, "tree"))).toBe("failed");
    }),
  );
});

describe("formatReport", () => {
  it.effect("names every scenario and the failed check's numbers", () =>
    Effect.gen(function* () {
      const text = formatReport(yield* failingReport);
      expect(text).toContain("panel-resize");
      expect(text).toContain("layout-flex");
      expect(text).toContain("left width");
      expect(text).toContain("expected 400 ± 1");
      expect(text).toContain("got 320");
    }),
  );

  it.effect("explains an unverified capability a scoped run sampled", () =>
    // `workspace=unverified` beside `1/1 scenarios passed` reads as a failure
    // unless the summary says why: the selection did not cover the capability.
    Effect.gen(function* () {
      const one = scenario("one", "workspace", (ctx) =>
        ctx.expectEqual("a", 1, 1),
      );
      const two = scenario("two", "workspace", (ctx) =>
        ctx.expectEqual("b", 2, 2),
      );
      const scoped = formatReport(yield* runScoped([one], [one, two]));
      expect(scoped).toContain("workspace=unverified");
      expect(scoped).toContain(
        "(unverified: the run did not cover every probe of that capability)",
      );
    }),
  );

  it.effect("leaves a full pass's summary line unqualified", () =>
    Effect.gen(function* () {
      const report = yield* run([
        scenario("solo", "layout", (ctx) => ctx.expectEqual("a", 1, 1)),
      ]);
      const text = formatReport(report);
      expect(text).toContain("1/1 scenarios passed");
      expect(text).not.toContain("unverified");
    }),
  );
});
