/**
 * The pure model behind `query-builder` (plan `378`): fields, operators,
 * completeness, the predicate and the summary a rule builder renders.
 *
 * The rules are here, not in the view, so the semantics a UI depends on are
 * provable without a renderer (the repo's `core/` convention): a field change
 * resets a rule, an empty value is ignored by both combinators, text compares
 * case-insensitively, and a numeric operator respects its bound.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** The fields a rule can address. */
export const Field = Schema.Literals(["name", "status", "owner", "score"]);
/** The fields a rule can address. */
export type Field = typeof Field.Type;

/** The operators a rule can use; a field offers only its own kind's subset. */
export const Operator = Schema.Literals([
  "contains",
  "is",
  "isNot",
  "gt",
  "gte",
  "lt",
  "lte",
]);
/** The operators a rule can use; a field offers only its own kind's subset. */
export type Operator = typeof Operator.Type;

/** How the rules combine. */
export const Combinator = Schema.Literals(["all", "any"]);
/** How the rules combine. */
export type Combinator = typeof Combinator.Type;

/** Whether `value` names a field. */
export const isField = Schema.is(Field);
/** Whether `value` names an operator. */
export const isOperator = Schema.is(Operator);

/** What control a field's value needs. */
export type FieldKind = "text" | "enum" | "number";

/** One filter rule. `key` is React identity; `value` is absent until chosen. */
export interface Rule {
  readonly key: number;
  readonly field: Field;
  readonly op: Operator;
  readonly value: Option.Option<string>;
}

/** One fixture row. */
export interface Row {
  readonly id: number;
  readonly name: string;
  readonly status: string;
  readonly owner: string;
  readonly score: number;
}

/** The enum values for `status`, in cycle order. */
export const STATUSES: ReadonlyArray<string> = [
  "active",
  "paused",
  "archived",
];

/** The enum values for `owner`, in cycle order. */
export const OWNERS: ReadonlyArray<string> = ["Ada", "Grace", "Linus", "Margaret"];

/** Every field, in the order the field picker shows them. */
export const FIELDS: ReadonlyArray<Field> = ["name", "status", "owner", "score"];

/** The kind of control a field needs. */
export const kindOf = (field: Field): FieldKind =>
  Match.value(field).pipe(
    Match.when("name", () => "text" as const),
    Match.when("score", () => "number" as const),
    Match.when("status", () => "enum" as const),
    Match.when("owner", () => "enum" as const),
    Match.exhaustive,
  );

/** The operators a field offers. */
export const operatorsFor = (field: Field): ReadonlyArray<Operator> =>
  Match.value(kindOf(field)).pipe(
    Match.when("text", () => ["contains", "is", "isNot"] as const),
    Match.when("enum", () => ["is", "isNot"] as const),
    Match.when("number", () => ["gt", "gte", "lt", "lte"] as const),
    Match.exhaustive,
  );

/** The operator a field starts with. */
export const defaultOperator = (field: Field): Operator =>
  Option.getOrElse(Arr.head(operatorsFor(field)), () => "is");

/** A fresh rule for `field`: the field's first operator and no value. */
export const defaultRule = (key: number, field: Field): Rule => ({
  key,
  field,
  op: defaultOperator(field),
  value: Option.none(),
});

/**
 * The same rule on a new field.
 *
 * The operator and value reset: `contains` cannot apply to a number, and a
 * status value must not survive a switch to `score`.
 */
export const retype = (rule: Rule, field: Field): Rule =>
  defaultRule(rule.key, field);

/** Whether the rule has a value to apply; an empty one is ignored. */
export const isComplete = (rule: Rule): boolean =>
  Option.exists(rule.value, (value) => !Str.isEmpty(Str.trim(value)));

/** The surface label of a field. */
export const fieldLabel = (field: Field): string =>
  Match.value(field).pipe(
    Match.when("name", () => "Name"),
    Match.when("status", () => "Status"),
    Match.when("owner", () => "Owner"),
    Match.when("score", () => "Score"),
    Match.exhaustive,
  );

/** The surface label of an operator. */
export const operatorLabel = (op: Operator): string =>
  Match.value(op).pipe(
    Match.when("contains", () => "contains"),
    Match.when("is", () => "is"),
    Match.when("isNot", () => "is not"),
    Match.when("gt", () => ">"),
    Match.when("gte", () => ">="),
    Match.when("lt", () => "<"),
    Match.when("lte", () => "<="),
    Match.exhaustive,
  );

/**
 * The picker options for a field, or `None` when the value is free text.
 *
 * `None` is the "render an `<input>`" decision, not a missing value.
 */
export const fieldOptions = (
  field: Field,
): Option.Option<ReadonlyArray<string>> =>
  Match.value(field).pipe(
    Match.when("status", () => Option.some(STATUSES)),
    Match.when("owner", () => Option.some(OWNERS)),
    Match.when("name", () => Option.none()),
    Match.when("score", () => Option.none()),
    Match.exhaustive,
  );

const normalized = (value: string): string => Str.toLowerCase(Str.trim(value));

const textMatches = (
  rowValue: string,
  op: Operator,
  value: string,
): boolean => {
  const haystack = normalized(rowValue);
  const needle = normalized(value);
  return Match.value(op).pipe(
    Match.when("contains", () => Str.includes(needle)(haystack)),
    Match.when("is", () => haystack === needle),
    Match.when("isNot", () => haystack !== needle),
    Match.orElse(() => false),
  );
};

const enumMatches = (
  rowValue: string,
  op: Operator,
  value: string,
): boolean =>
  Match.value(op).pipe(
    Match.when("is", () => rowValue === value),
    Match.when("isNot", () => rowValue !== value),
    Match.orElse(() => false),
  );

const numberMatches = (
  rowValue: number,
  op: Operator,
  value: string,
): boolean => {
  const bound = Number.parseFloat(value);
  if (!Number.isFinite(bound)) return false;
  return Match.value(op).pipe(
    Match.when("gt", () => rowValue > bound),
    Match.when("gte", () => rowValue >= bound),
    Match.when("lt", () => rowValue < bound),
    Match.when("lte", () => rowValue <= bound),
    Match.orElse(() => false),
  );
};

/** Whether one rule keeps `row`; an incomplete rule keeps every row. */
export const matchesRule = (row: Row, rule: Rule): boolean => {
  if (!isComplete(rule)) return true;
  const value = Option.getOrElse(rule.value, () => "");
  return Match.value(rule.field).pipe(
    Match.when("name", () => textMatches(row.name, rule.op, value)),
    Match.when("status", () => enumMatches(row.status, rule.op, value)),
    Match.when("owner", () => enumMatches(row.owner, rule.op, value)),
    Match.when("score", () => numberMatches(row.score, rule.op, value)),
    Match.exhaustive,
  );
};

/**
 * Whether `row` survives the complete rules, combined by `combinator`.
 *
 * No complete rule means "every row", under both combinators: an empty builder
 * shows the whole table.
 */
export const matchesAll = (
  combinator: Combinator,
  rules: ReadonlyArray<Rule>,
  row: Row,
): boolean =>
  Arr.match(Arr.filter(rules, isComplete), {
    onEmpty: () => true,
    onNonEmpty: (active) =>
      Match.value(combinator).pipe(
        Match.when("all", () =>
          Arr.every(active, (rule) => matchesRule(row, rule)),
        ),
        Match.when("any", () =>
          Arr.some(active, (rule) => matchesRule(row, rule)),
        ),
        Match.exhaustive,
      ),
  });

/** The rows the rules keep, in source order. */
export const filterRows = (
  rows: ReadonlyArray<Row>,
  combinator: Combinator,
  rules: ReadonlyArray<Rule>,
): ReadonlyArray<Row> =>
  Arr.filter(rows, (row) => matchesAll(combinator, rules, row));

/** How many rules have a value. */
export const completeCount = (rules: ReadonlyArray<Rule>): number =>
  Arr.length(Arr.filter(rules, isComplete));

/** One rule as a sentence fragment, e.g. `score >= 80`. */
export const summarizeRule = (rule: Rule): string =>
  `${rule.field} ${operatorLabel(rule.op)} ${Option.getOrElse(rule.value, () => "")}`;

/** The complete rules as one sentence joined by the combinator. */
export const summarize = (
  combinator: Combinator,
  rules: ReadonlyArray<Rule>,
): string =>
  Arr.match(Arr.map(Arr.filter(rules, isComplete), summarizeRule), {
    onEmpty: () => "none",
    onNonEmpty: (parts) =>
      Arr.join(parts, combinator === "all" ? " and " : " or "),
  });

/** The fixture row at `id`: name, cycling status and owner, score `id % 100`. */
export const rowAt = (id: number): Row => ({
  id,
  name: `Item ${id}`,
  status: Option.getOrElse(Arr.get(STATUSES, id % 3), () => "active"),
  owner: Option.getOrElse(Arr.get(OWNERS, id % 4), () => "Ada"),
  score: id % 100,
});

/** The 120-row fixture. */
export const INITIAL_ROWS: ReadonlyArray<Row> = Arr.map(
  Arr.range(0, 119),
  rowAt,
);
