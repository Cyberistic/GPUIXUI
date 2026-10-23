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
import * as Schema from "effect/Schema";
import {
  CheckOutcome,
  StyleSnapshot,
  coverageOf,
  formatModifiers,
} from "./smoke.js";
import type { SmokeScenario } from "./smoke.js";
import { nullHost } from "./test-support.js";
import { runScenarios } from "./smoke.js";
import {
  checkOf,
  labelsOf,
  run,
  runScoped,
  scenario,
  statusOf,
} from "./test-support.js";

const holds = (
  check: Option.Option<{ readonly outcome: CheckOutcome }>,
  guard: (outcome: CheckOutcome) => boolean,
): boolean => Option.exists(check, (result) => guard(result.outcome));

describe("StyleSnapshot", () => {
  const decode = Schema.decodeUnknownOption(StyleSnapshot);
  const field = <A>(
    snapshot: Option.Option<StyleSnapshot>,
    get: (style: StyleSnapshot) => Option.Option<A>,
  ): Option.Option<A> => Option.flatMap(snapshot, get);

  it("keeps the properties a token check asserts on, verbatim", () => {
    const snapshot = decode({
      width: 40,
      height: 20,
      backgroundColor: "#7567F23D",
      borderRadius: 10,
      fontFamily: "Menlo, monospace",
      fontSize: 13,
      boxShadow: {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadRadius: 3,
        color: "#3B76F6",
        inset: false,
      },
    });
    expect(field(snapshot, (style) => style.backgroundColor)).toEqual(
      Option.some("#7567F23D"),
    );
    expect(field(snapshot, (style) => style.borderRadius)).toEqual(
      Option.some(10),
    );
    expect(field(snapshot, (style) => style.fontSize)).toEqual(Option.some(13));
    expect(field(snapshot, (style) => style.fontFamily)).toEqual(
      Option.some("Menlo, monospace"),
    );
    expect(
      field(snapshot, (style) =>
        Option.map(style.boxShadow, (shadow) => shadow.spreadRadius),
      ),
    ).toEqual(Option.some(3));
    expect(
      field(snapshot, (style) =>
        Option.map(style.boxShadow, (shadow) => shadow.color),
      ),
    ).toEqual(Option.some("#3B76F6"));
  });

  it("reports a property the runtime left out as absent, never as empty", () => {
    const snapshot = decode({ width: 40, height: 20 });
    expect(Option.isSome(snapshot)).toBe(true);
    expect(field(snapshot, (style) => style.backgroundColor)).toEqual(
      Option.none(),
    );
    expect(field(snapshot, (style) => style.borderRadius)).toEqual(
      Option.none(),
    );
    expect(field(snapshot, (style) => style.color)).toEqual(Option.none());
    expect(field(snapshot, (style) => style.boxShadow)).toEqual(Option.none());
  });

  it("refuses a whole snapshot whose property type changed", () => {
    // A runtime that renames or retypes a property is a defect a scenario must
    // see: silently coercing "13px" to 13 would let a token check pass against a
    // style report that is no longer the one the tokens were written for.
    expect(Option.isNone(decode({ fontSize: "13px" }))).toBe(true);
    expect(Option.isNone(decode({ boxShadow: "#3B76F6" }))).toBe(true);
  });
});

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

describe("formatModifiers", () => {
  // The protocol reads a chord as one string, so the spelling is part of the
  // measurement: two argument orders must not name two presses.
  it("spells a chord in one order whatever the caller's order", () => {
    expect(formatModifiers(["shift", "cmd"])).toBe("cmd-shift");
    expect(formatModifiers(["cmd", "shift"])).toBe("cmd-shift");
  });

  it("collapses a repeat and keeps one modifier alone", () => {
    expect(formatModifiers(["shift", "shift"])).toBe("shift");
    expect(formatModifiers(["alt"])).toBe("alt");
  });

  it("writes the empty set as the empty string, which is no modifier", () => {
    expect(formatModifiers([])).toBe("");
  });

  it("writes every modifier in the protocol's order", () => {
    expect(formatModifiers(["shift", "alt", "ctrl", "cmd"])).toBe(
      "cmd-ctrl-alt-shift",
    );
  });
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

describe("runScenarios mount seam", () => {
  it.effect("mounts each scenario once, in order, before its steps run", () =>
    Effect.gen(function* () {
      const mounted: string[] = [];
      const report = yield* runScenarios(
        nullHost,
        [
          scenario("a", "layout", (ctx) => ctx.expectEqual("x", 1, 1)),
          scenario("b", "scroll", (ctx) => ctx.expectEqual("y", 1, 1)),
        ],
        { host: "fixture host", startedAt: 0 },
        (mount) => Effect.sync(() => mounted.push(mount.id)),
      );
      expect(mounted).toEqual(["a", "b"]);
      expect(Arr.map(report.scenarios, (result) => result.id)).toEqual([
        "a",
        "b",
      ]);
      expect(Option.getOrUndefined(statusOf(report, "layout"))).toBe(
        "verified",
      );
    }),
  );
});

describe("a scoped run's capability verdict", () => {
  const first = scenario("first", "input", (ctx) => ctx.expectEqual("a", 1, 1));
  const second = scenario("second", "input", (ctx) =>
    ctx.expectEqual("b", 2, 2),
  );
  const registry: ReadonlyArray<SmokeScenario> = [first, second];

  it.effect("withholds verified from a capability it only sampled", () =>
    // The bug: `--only first` printed `input=verified` while `second` — the
    // other probe covering input — never ran, so a scoped run was citable as a
    // capability total it had not measured.
    Effect.gen(function* () {
      const report = yield* runScoped([first], registry);
      expect(Option.getOrUndefined(statusOf(report, "input"))).toBe(
        "unverified",
      );
    }),
  );

  it.effect("verifies a capability the selection covers whole", () =>
    Effect.gen(function* () {
      const report = yield* runScoped(registry, registry);
      expect(Option.getOrUndefined(statusOf(report, "input"))).toBe("verified");
    }),
  );

  it.effect(
    "does not let a repeated probe stand in for the one it skipped",
    () =>
      // The bug: the verdict compared the number of **results** to the number
      // of declared probes, so `[first, first]` counted two and reported the
      // capability `verified` while `second` had never run — the same evidence
      // lie a scoped `--only` was already protected from.
      Effect.gen(function* () {
        const report = yield* runScoped([first, first], registry);
        expect(Option.getOrUndefined(statusOf(report, "input"))).toBe(
          "unverified",
        );
      }),
  );

  it.effect("still fails a capability when its sampled probe failed", () =>
    // `unverified` must not swallow a real failure: a scoped run that saw a
    // failure has evidence, and it says so.
    Effect.gen(function* () {
      const failing = scenario("second", "input", (ctx) =>
        ctx.expectEqual("b", 1, 2),
      );
      const report = yield* runScoped([failing], registry);
      expect(Option.getOrUndefined(statusOf(report, "input"))).toBe("failed");
    }),
  );

  it.effect(
    "keeps the run's own list as the fallback when no scope is given",
    () =>
      // A caller that owns the whole list has nothing to declare against; the
      // existing contract (every given scenario passed) stands, so no consumer
      // that passes a registry-free list changes its verdict.
      Effect.gen(function* () {
        const report = yield* run([first]);
        expect(Option.getOrUndefined(statusOf(report, "input"))).toBe(
          "verified",
        );
      }),
  );

  it.effect("omits a capability the run did not touch", () =>
    Effect.gen(function* () {
      const layoutA = scenario("layout-a", "layout", (ctx) =>
        ctx.expectEqual("x", 1, 1),
      );
      const layoutB = scenario("layout-b", "layout", (ctx) =>
        ctx.expectEqual("y", 2, 2),
      );
      const report = yield* runScoped(
        [layoutA],
        [...registry, layoutA, layoutB],
      );
      expect(statusOf(report, "input")).toEqual(Option.none());
      expect(Option.getOrUndefined(statusOf(report, "layout"))).toBe(
        "unverified",
      );
    }),
  );

  it("counts the distinct probes the registry declares, in the suite's order", () => {
    expect(coverageOf(registry)).toEqual([
      { capability: "input", declared: 2 },
    ]);
    // A doubled registry is still two probes: counting entries would declare a
    // scope bigger than the one that exists, and no run could ever cover it.
    expect(coverageOf([...registry, ...registry])).toEqual([
      { capability: "input", declared: 2 },
    ]);
    expect(coverageOf([])).toEqual([]);
  });
});
