/**
 * Guards the filter-rule model plan `378` measured in the native runtime.
 *
 * The bugs these catch: a field change that carries a stale operator or value
 * (`contains` on a number, a status value applied to a score), an empty rule
 * that matches everything under `any` (so an unfinished row silently widens a
 * query), a numeric operator that includes a bound it should exclude, a
 * case-sensitive text match that hides a row the user can see, and a summary
 * that drops or reorders the rules.
 *
 * Every expected count is hand-computed from the 120-row fixture — never a
 * second call of the function under test.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Rule } from "./query-model.js";
import {
  completeCount,
  defaultRule,
  fieldOptions,
  filterRows,
  INITIAL_ROWS,
  isComplete,
  matchesRule,
  operatorsFor,
  retype,
  rowAt,
  summarize,
} from "./query-model.js";

const rule = (
  key: number,
  field: Rule["field"],
  op: Rule["op"],
  value: Option.Option<string>,
): Rule => ({ key, field, op, value });

const some = (value: string): Option.Option<string> => Option.some(value);

const count = (
  combinator: "all" | "any",
  rules: ReadonlyArray<Rule>,
): number => Arr.length(filterRows(INITIAL_ROWS, combinator, rules));

describe("defaultRule and retype", () => {
  it("starts each field kind on its own operator, with no value", () => {
    expect(defaultRule(1, "name")).toEqual(rule(1, "name", "contains", Option.none()));
    expect(defaultRule(1, "status")).toEqual(rule(1, "status", "is", Option.none()));
    expect(defaultRule(1, "owner")).toEqual(rule(1, "owner", "is", Option.none()));
    expect(defaultRule(1, "score")).toEqual(rule(1, "score", "gt", Option.none()));
  });

  it("offers only the operators a field kind can apply", () => {
    expect(operatorsFor("name")).toEqual(["contains", "is", "isNot"]);
    expect(operatorsFor("status")).toEqual(["is", "isNot"]);
    expect(operatorsFor("score")).toEqual(["gt", "gte", "lt", "lte"]);
  });

  it("resets operator and value when the field changes, keeping the key", () => {
    const typed = rule(7, "name", "isNot", some("Item 1"));
    expect(retype(typed, "score")).toEqual(rule(7, "score", "gt", Option.none()));
  });

  it("offers enum options only for enum fields", () => {
    expect(Option.getOrElse(fieldOptions("status"), () => [])).toEqual([
      "active",
      "paused",
      "archived",
    ]);
    expect(Option.getOrElse(fieldOptions("owner"), () => [])).toEqual([
      "Ada",
      "Grace",
      "Linus",
      "Margaret",
    ]);
    expect(Option.isNone(fieldOptions("name"))).toBe(true);
    expect(Option.isNone(fieldOptions("score"))).toBe(true);
  });
});

describe("isComplete", () => {
  it("treats an absent, empty and whitespace value as incomplete", () => {
    expect(isComplete(rule(1, "name", "contains", Option.none()))).toBe(false);
    expect(isComplete(rule(1, "name", "contains", some("")))).toBe(false);
    expect(isComplete(rule(1, "name", "contains", some("   ")))).toBe(false);
  });

  it("treats any real text as complete", () => {
    expect(isComplete(rule(1, "name", "contains", some("0")))).toBe(true);
  });
});

describe("matchesRule", () => {
  const item = rowAt(10); // Item 10, paused, Linus, score 10

  it("matches text case-insensitively for contains and is", () => {
    expect(matchesRule(item, rule(1, "name", "contains", some("ITEM 1")))).toBe(true);
    expect(matchesRule(item, rule(1, "name", "is", some("item 10")))).toBe(true);
    expect(matchesRule(item, rule(1, "name", "is", some("item 1")))).toBe(false);
  });

  it("inverts with isNot for text and enum values", () => {
    expect(matchesRule(item, rule(1, "name", "isNot", some("item 10")))).toBe(false);
    expect(matchesRule(item, rule(1, "status", "isNot", some("paused")))).toBe(false);
    expect(matchesRule(item, rule(1, "status", "isNot", some("active")))).toBe(true);
  });

  it("keeps a numeric bound out of gt and inside gte", () => {
    const at80 = rowAt(80);
    expect(matchesRule(at80, rule(1, "score", "gt", some("80")))).toBe(false);
    expect(matchesRule(at80, rule(1, "score", "gte", some("80")))).toBe(true);
    expect(matchesRule(at80, rule(1, "score", "lt", some("80")))).toBe(false);
    expect(matchesRule(at80, rule(1, "score", "lte", some("80")))).toBe(true);
  });

  it("matches nothing for a non-numeric value", () => {
    expect(matchesRule(rowAt(50), rule(1, "score", "gt", some("abc")))).toBe(false);
  });

  it("keeps every row for an incomplete rule", () => {
    expect(matchesRule(item, rule(1, "status", "is", Option.none()))).toBe(true);
  });
});

describe("filterRows over the fixture", () => {
  it("narrows a status and an owner to the expected counts", () => {
    expect(count("all", [rule(1, "status", "is", some("paused"))])).toBe(40);
    expect(count("all", [rule(1, "owner", "is", some("Ada"))])).toBe(30);
    expect(count("all", [rule(1, "owner", "isNot", some("Ada"))])).toBe(90);
  });

  it("matches text by substring and exactly", () => {
    expect(count("all", [rule(1, "name", "contains", some("item 1"))])).toBe(31);
    expect(count("all", [rule(1, "name", "is", some("item 1"))])).toBe(1);
    expect(count("all", [rule(1, "name", "is", some("zzz"))])).toBe(0);
  });

  it("applies the numeric bounds to the fixture", () => {
    expect(count("all", [rule(1, "score", "gt", some("80"))])).toBe(19);
    expect(count("all", [rule(1, "score", "gte", some("80"))])).toBe(20);
    expect(count("all", [rule(1, "score", "lt", some("10"))])).toBe(20);
  });

  it("composes with all and any", () => {
    const paused = rule(1, "status", "is", some("paused"));
    const name = rule(2, "name", "contains", some("item 1"));
    expect(count("all", [paused, name])).toBe(12);
    expect(count("any", [paused, name])).toBe(59);
  });

  it("intersects two enum cycles", () => {
    expect(
      count("all", [
        rule(1, "owner", "is", some("Ada")),
        rule(2, "status", "is", some("paused")),
      ]),
    ).toBe(10);
  });

  it("ignores an incomplete rule under both combinators", () => {
    const paused = rule(1, "status", "is", some("paused"));
    const empty = rule(2, "name", "contains", Option.none());
    expect(count("all", [paused, empty])).toBe(40);
    expect(count("any", [paused, empty])).toBe(40);
    expect(count("any", [empty, rule(3, "owner", "is", Option.none())])).toBe(
      120,
    );
  });

  it("preserves the source order", () => {
    expect(
      Arr.map(
        Arr.take(filterRows(INITIAL_ROWS, "all", [
          rule(1, "score", "gte", some("80")),
        ]), 3),
        (row) => row.id,
      ),
    ).toEqual([80, 81, 82]);
  });

  it("counts the complete rules", () => {
    expect(
      completeCount([
        rule(1, "status", "is", some("paused")),
        rule(2, "name", "contains", Option.none()),
      ]),
    ).toBe(1);
  });
});

describe("summarize", () => {
  const paused = rule(1, "status", "is", some("paused"));
  const name = rule(2, "name", "contains", some("item 1"));

  it("joins the complete rules with the combinator word", () => {
    expect(summarize("all", [paused, name])).toBe(
      "status is paused and name contains item 1",
    );
    expect(summarize("any", [paused, name])).toBe(
      "status is paused or name contains item 1",
    );
  });

  it("leaves an incomplete rule out and keeps source order", () => {
    expect(summarize("all", [paused, rule(2, "owner", "is", Option.none()), name])).toBe(
      "status is paused and name contains item 1",
    );
  });

  it("says none when nothing is complete", () => {
    expect(summarize("all", [rule(1, "name", "contains", Option.none())])).toBe(
      "none",
    );
    expect(summarize("any", [])).toBe("none");
  });

  it("renders a numeric operator as its symbol", () => {
    expect(summarize("all", [rule(1, "score", "gte", some("80"))])).toBe(
      "score >= 80",
    );
  });
});
