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
  HighlightMatch,
  SmokeHostError,
  StyleSnapshot,
  decodeHighlights,
  runAsyncScenarios,
} from "./smoke.js";
import { asyncScenario, nullAsyncHost, nullHost } from "./test-support.js";
import { runScenarios } from "./smoke.js";
import { checkOf, labelsOf, run, scenario, statusOf } from "./test-support.js";

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

describe("HighlightMatch", () => {
  const decode = Schema.decodeUnknownOption(HighlightMatch);

  it("keeps the run text, offsets and every rect", () => {
    const match = decode({
      elementId: 42,
      sub: 1,
      text: "The error handler",
      start: 4,
      end: 9,
      active: true,
      rects: [
        { x: 10, y: 20, width: 30, height: 14 },
        { x: 10, y: 34, width: 12, height: 14 },
      ],
    });
    expect(
      Option.map(match, (value) => value.text.slice(value.start, value.end)),
    ).toEqual(Option.some("error"));
    expect(Option.map(match, (value) => value.active)).toEqual(
      Option.some(true),
    );
    expect(Option.map(match, (value) => Arr.length(value.rects))).toEqual(
      Option.some(2),
    );
  });

  it("refuses a wash whose geometry is not a rect", () => {
    // The adapter drops a malformed entry; a rect that became a string must not
    // be coerced, or a scenario would assert on a box the runtime never painted.
    expect(
      Option.isNone(
        decode({
          elementId: 42,
          sub: 0,
          text: "error",
          start: 0,
          end: 5,
          active: false,
          rects: [{ x: 10, y: 20, width: "30", height: 14 }],
        }),
      ),
    ).toBe(true);
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

describe("decodeHighlights", () => {
  const wash = {
    elementId: 4,
    sub: 1,
    text: "The error handler logs an error.",
    start: 4,
    end: 9,
    active: true,
    rects: [{ x: 68, y: 30, width: 31, height: 20 }],
  };

  it("keeps a well-formed wash, offsets and geometry intact", () => {
    const [match] = decodeHighlights([wash]);
    expect(match?.text.slice(match.start, match.end)).toBe("error");
    expect(match?.active).toBe(true);
    expect(Arr.map(match?.rects ?? [], (rect) => rect.width)).toEqual([31]);
  });

  it("drops a malformed wash without hiding the valid one beside it", () => {
    const corrupted = {
      ...wash,
      rects: [{ x: 68, y: 30, width: "31", height: 20 }],
    };
    const matches = decodeHighlights([corrupted, wash]);
    expect(Arr.length(matches)).toBe(1);
    expect(matches[0]?.elementId).toBe(4);
  });
});

describe("runAsyncScenarios", () => {
  it.effect("aggregates the same report from effectful host verbs", () =>
    Effect.gen(function* () {
      const report = yield* runAsyncScenarios(
        {
          ...nullAsyncHost,
          text: (testId) => Effect.succeed(testId === "x" ? "hi" : null),
        },
        [
          asyncScenario("reads", "text", (ctx) =>
            Effect.gen(function* () {
              const reported = yield* ctx.host.text("x");
              const text = yield* ctx.expectSome(
                "the host reports text",
                Option.fromNullishOr(reported),
              );
              yield* ctx.expectEqual("the text", text, "hi");
            }),
          ),
          asyncScenario("misses", "input", (ctx) =>
            Effect.gen(function* () {
              const reported = yield* ctx.host.text("y");
              yield* ctx.expectSome(
                "a missing node",
                Option.fromNullishOr(reported),
              );
            }),
          ),
        ],
        { host: "async fixture", startedAt: 0 },
      );
      expect(Option.getOrUndefined(statusOf(report, "text"))).toBe("verified");
      expect(Option.getOrUndefined(statusOf(report, "input"))).toBe("failed");
      expect(labelsOf(report, 0)).toEqual([
        "the host reports text",
        "the text",
      ]);
    }),
  );

  it.effect("a missing list anchor fails the scenario that needs it", () =>
    Effect.gen(function* () {
      // A host that cannot read an anchor must not let a persistence check pass
      // on an absent value: `expectSome` turns the null into a failed check.
      const report = yield* runAsyncScenarios(
        nullAsyncHost,
        [
          asyncScenario("anchor", "virtual-list", (ctx) =>
            Effect.gen(function* () {
              const anchor = yield* ctx.expectSome(
                "the list reports an anchor",
                Option.fromNullishOr(yield* ctx.host.listScrollTop("list")),
              );
              yield* ctx.expectEqual("the first row", anchor[0], 0);
            }),
          ),
        ],
        { host: "async fixture", startedAt: 0 },
      );
      expect(Option.getOrUndefined(statusOf(report, "virtual-list"))).toBe(
        "failed",
      );
      expect(holds(checkOf(report, 0), CheckOutcome.guards.failed)).toBe(true);
    }),
  );

  it.effect("a failed host verb is an errored check, never a silent pass", () =>
    Effect.gen(function* () {
      // The automation protocol reports over promises, so a live host can fail
      // where the sync test host cannot. That failure must be visible as a
      // harness error with the verb's name — a scenario that treated it as
      // "no value" would report a missing element instead.
      const report = yield* runAsyncScenarios(
        {
          ...nullAsyncHost,
          text: () =>
            Effect.fail(new SmokeHostError({ verb: "text", cause: "boom" })),
        },
        [
          asyncScenario("broken", "text", (ctx) =>
            Effect.asVoid(ctx.host.text("x")),
          ),
          asyncScenario("after", "text", (ctx) =>
            ctx.expectEqual("still runs", 1, 1),
          ),
        ],
        { host: "async fixture", startedAt: 0 },
      );
      expect(Option.getOrUndefined(statusOf(report, "text"))).toBe("failed");
      expect(labelsOf(report, 0)).toEqual(["host text"]);
      expect(holds(checkOf(report, 0), CheckOutcome.guards.errored)).toBe(true);
      expect(labelsOf(report, 1)).toEqual(["still runs"]);
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
