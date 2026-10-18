/**
 * `query-builder` — a filter-rule builder over a virtualized table (plan `378`).
 *
 * The Tier 5 row **Advanced filtering / query builders** had no runtime
 * evidence, and three questions were open: do three native `Select`s compose in
 * one row inside a scrolled strip, can component code reveal and focus a rule
 * it just appended, and does one derived predicate drive a virtualized result
 * set. This probe answers them. The predicate itself is pure
 * (`query-model.ts`); this file renders it and records what the runtime adds:
 *
 * - a 132 px strip that scrolls after three rules;
 * - field/operator/value pickers whose popups paint past the strip's clip;
 * - an appended rule revealed and focused from component code;
 * - `all`/`any`, enum/text/numeric operators, incomplete rules and the empty
 *   state over a 120-row `<virtual-list>`;
 * - Escape closing the strip and returning focus to the toggle.
 */
import { useEffect, useRef, useState } from "react";
import { Effect, Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { palettes } from "../palettes.js";
import { ariaOf, readoutField, text } from "./probes.js";
import type { PlaygroundScenario } from "../types.js";
import type { Combinator, Field, Row } from "./query-model.js";
import {
  completeCount,
  defaultRule,
  FIELDS,
  fieldLabel,
  fieldOptions,
  filterRows,
  INITIAL_ROWS,
  isField,
  isOperator,
  operatorLabel,
  operatorsFor,
  retype,
  summarize,
} from "./query-model.js";

const FRAME_WIDTH = 780;
const TOOLBAR_HEIGHT = 40;
const BUILDER_HEIGHT = 132;
const RULE_HEIGHT = 40;
const RULE_GAP = 4;
const CONTROL_HEIGHT = 26;
const FIELD_WIDTH = 120;
const OPERATOR_WIDTH = 90;
const VALUE_WIDTH = 150;
const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 28;
const VIEWPORT_HEIGHT = 360;
const WHEEL_TO_ROW_30 = -840;

const COLUMNS = [
  { id: "name", width: 300, label: "Name" },
  { id: "status", width: 160, label: "Status" },
  { id: "owner", width: 160, label: "Owner" },
  { id: "score", width: 160, label: "Score" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

/** The text a row shows for one column. */
const cell = (row: Row, column: ColumnId): string =>
  Match.value(column).pipe(
    Match.when("name", () => row.name),
    Match.when("status", () => row.status),
    Match.when("owner", () => row.owner),
    Match.when("score", () => `${row.score}`),
    Match.exhaustive,
  );

interface PickerOption {
  readonly value: string;
  readonly label: string;
}

const FIELD_OPTIONS: ReadonlyArray<PickerOption> = Arr.map(FIELDS, (field) => ({
  value: field,
  label: fieldLabel(field),
}));

const operatorOptions = (field: Field): ReadonlyArray<PickerOption> =>
  Arr.map(operatorsFor(field), (op) => ({
    value: op,
    label: operatorLabel(op),
  }));

/** One controlled native `Select`, sized for a rule row. */
const Picker = ({
  testId,
  label,
  value,
  options,
  placeholder,
  width,
  onChange,
}: {
  readonly testId: string;
  readonly label: string;
  readonly value: Option.Option<string>;
  readonly options: ReadonlyArray<PickerOption>;
  readonly placeholder: string;
  readonly width: number;
  readonly onChange: (value: string) => void;
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={Option.getOrUndefined(value)}
      onValueChange={onChange}
      items={options}
      style={{ width }}
    >
      <SelectTrigger
        testId={testId}
        aria-id={testId}
        aria-label={label}
        style={{
          width,
          height: CONTROL_HEIGHT,
          paddingLeft: 6,
          paddingRight: 6,
          justifyContent: "center",
          backgroundColor: theme.colors.input,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.sm,
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        testId={`${testId}-content`}
        side="bottom"
        align="start"
        style={{
          backgroundColor: theme.colors.popover,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.sm,
        }}
      >
        {Arr.map(options, (option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            testId={`${testId}-item-${option.value}`}
          >
            <text
              style={{ fontSize: 11, color: theme.colors.popoverForeground }}
            >
              {option.label}
            </text>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const QueryBuilderProbe = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const toggle = useRef<PublicInstance | null>(null);
  const valueNodes = useRef(new Map<string, PublicInstance | null>());
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<
    ReadonlyArray<ReturnType<typeof defaultRule>>
  >([defaultRule(1, "status")]);
  const [nextKey, setNextKey] = useState(2);
  const [match, setMatch] = useState<Combinator>("all");
  const [selected, setSelected] = useState<Option.Option<number>>(
    Option.none(),
  );
  const [anchor, setAnchor] = useState(0);
  const [focusRule, setFocusRule] = useState<Option.Option<number>>(
    Option.none(),
  );

  const visible = filterRows(INITIAL_ROWS, match, rules);
  const matched = Arr.length(visible);

  /** The list's post-scroll anchor; the range payload lags a gesture (`300`). */
  const syncAnchor = (): void => {
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) =>
        Option.match(Option.fromNullishOr(renderer?.getListScrollTop?.(id)), {
          onNone: () => {},
          onSome: (value) => setAnchor(value[0] ?? 0),
        }),
    });
  };

  /** A rule edit is a row-set change: it starts at the first row and drops the pick. */
  const changeQuery = (): void => {
    setSelected(Option.none());
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, 0),
    });
    setAnchor(0);
  };

  const changeRule = (
    index: number,
    change: (
      rule: ReturnType<typeof defaultRule>,
    ) => ReturnType<typeof defaultRule>,
  ): void => {
    setRules((current) =>
      Arr.map(current, (rule, at) => (at === index ? change(rule) : rule)),
    );
    changeQuery();
  };

  /**
   * Appends a rule and asks the effect below to reveal and focus it.
   *
   * The row does not exist until the commit, so the focus call cannot happen in
   * this handler — it is the effect that makes the new rule usable from the
   * keyboard without a click.
   */
  const add = (): void => {
    setRules((current) => Arr.append(current, defaultRule(nextKey, "name")));
    setNextKey((current) => current + 1);
    setFocusRule(Option.some(Arr.length(rules)));
    changeQuery();
  };

  useEffect(() => {
    Option.match(focusRule, {
      onNone: () => {},
      onSome: (index) => {
        Option.match(
          Option.fromNullishOr(
            valueNodes.current.get(`qb-rule-${index}-value`),
          ),
          {
            onNone: () => {},
            onSome: (node) => {
              node.scrollIntoView?.();
              renderer?.focusElement?.(node.id);
            },
          },
        );
        setFocusRule(Option.none());
      },
    });
  }, [focusRule, renderer, rules]);

  const remove = (index: number): void => {
    setRules((current) => Arr.filter(current, (_rule, at) => at !== index));
    changeQuery();
  };

  const chooseMatch = (next: Combinator): void => {
    if (match === next) return;
    setMatch(next);
    changeQuery();
  };

  const clear = (): void => {
    setRules([defaultRule(nextKey, "status")]);
    setNextKey((current) => current + 1);
    setMatch("all");
    setSelected(Option.none());
    setFocusRule(Option.none());
    Option.match(Option.fromNullishOr(list.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.scrollToItem?.(id, 0),
    });
    setAnchor(0);
  };

  const close = (): void => {
    setOpen(false);
    Option.match(Option.fromNullishOr(toggle.current?.id), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
  };

  const toggleRow = (id: number): void => {
    setSelected((current) =>
      Option.contains(current, id) ? Option.none() : Option.some(id),
    );
  };

  const button = {
    height: CONTROL_HEIGHT,
    padding: 0,
    paddingLeft: 8,
    paddingRight: 8,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  };

  const selectedLabel = Option.getOrElse(selected, () => "none");

  return (
    <div
      testId="qb-frame"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: FRAME_WIDTH,
      }}
    >
      <div
        testId="qb-toolbar"
        role="toolbar"
        aria-id="qb-toolbar"
        aria-label="Query"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: TOOLBAR_HEIGHT,
          paddingLeft: 4,
          backgroundColor: theme.colors.muted,
        }}
      >
        <Pressable
          testId="qb-toggle"
          ref={toggle}
          onClick={() => setOpen(!open)}
          style={button}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            {`filters (${completeCount(rules)})`}
          </text>
        </Pressable>
        {(["all", "any"] as const).map((value) => (
          <Pressable
            key={value}
            testId={`qb-match-${value}`}
            onClick={() => chooseMatch(value)}
            style={{
              ...button,
              backgroundColor:
                match === value ? theme.colors.accent : theme.colors.muted,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              {value}
            </text>
          </Pressable>
        ))}
        <Pressable testId="qb-add" onClick={add} style={button}>
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            add rule
          </text>
        </Pressable>
        <Pressable testId="qb-clear" onClick={clear} style={button}>
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            clear
          </text>
        </Pressable>
        <text
          testId="qb-matched"
          style={{ fontSize: 11, color: theme.colors.mutedForeground }}
        >
          {`matched=${matched}`}
        </text>
      </div>

      <div
        testId="qb-builder"
        role="group"
        aria-id="qb-builder"
        aria-label="Filters"
        onKeyDown={(event) => {
          if (event.key === "escape") close();
        }}
        style={{
          display: "flex",
          justifyContent: open ? "flex-start" : "center",
          alignItems: open ? "stretch" : "center",
          width: FRAME_WIDTH,
          height: BUILDER_HEIGHT,
          backgroundColor: theme.colors.muted,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        }}
      >
        {open ? (
          <div
            testId="qb-rules"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: RULE_GAP,
              width: FRAME_WIDTH,
              height: BUILDER_HEIGHT,
              overflowY: "scroll",
            }}
          >
            {Arr.match(rules, {
              onEmpty: () => (
                <text
                  testId="qb-rules-empty"
                  style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                >
                  no rules
                </text>
              ),
              onNonEmpty: (list) =>
                Arr.map(list, (rule, index) => {
                  const valueTestId = `qb-rule-${index}-value`;
                  const options = fieldOptions(rule.field);
                  return (
                    <div
                      key={rule.key}
                      testId={`qb-rule-${index}`}
                      role="group"
                      aria-id={`qb-rule-${index}`}
                      aria-label={`Rule ${index + 1}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        height: RULE_HEIGHT,
                        flexShrink: 0,
                        paddingLeft: 4,
                        backgroundColor: theme.colors.background,
                        borderWidth: theme.borderWidth.thin,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Picker
                        testId={`qb-rule-${index}-field`}
                        label="Field"
                        value={Option.some(rule.field)}
                        options={FIELD_OPTIONS}
                        placeholder="field"
                        width={FIELD_WIDTH}
                        onChange={(next) => {
                          if (isField(next)) {
                            changeRule(index, (current) =>
                              retype(current, next),
                            );
                          }
                        }}
                      />
                      <Picker
                        testId={`qb-rule-${index}-op`}
                        label="Operator"
                        value={Option.some(rule.op)}
                        options={operatorOptions(rule.field)}
                        placeholder="operator"
                        width={OPERATOR_WIDTH}
                        onChange={(next) => {
                          if (isOperator(next)) {
                            changeRule(index, (current) => ({
                              ...current,
                              op: next,
                            }));
                          }
                        }}
                      />
                      {Option.match(options, {
                        onNone: () => (
                          <input
                            testId={valueTestId}
                            ref={(node) => {
                              valueNodes.current.set(valueTestId, node);
                            }}
                            aria-id={valueTestId}
                            aria-label="Value"
                            placeholder="value"
                            value={Option.getOrElse(rule.value, () => "")}
                            onChange={(event) =>
                              changeRule(index, (current) => ({
                                ...current,
                                value: Option.some(event.value ?? ""),
                              }))
                            }
                            style={{
                              height: CONTROL_HEIGHT,
                              width: VALUE_WIDTH,
                              paddingLeft: theme.spacing.sm,
                              fontSize: 11,
                              color: theme.colors.inputForeground,
                              backgroundColor: theme.colors.input,
                              borderWidth: theme.borderWidth.thin,
                              borderColor: theme.colors.border,
                              borderRadius: theme.radius.sm,
                            }}
                          />
                        ),
                        onSome: (values) => (
                          <Picker
                            testId={valueTestId}
                            label="Value"
                            value={rule.value}
                            options={Arr.map(values, (value) => ({
                              value,
                              label: value,
                            }))}
                            placeholder="value"
                            width={VALUE_WIDTH}
                            onChange={(next) =>
                              changeRule(index, (current) => ({
                                ...current,
                                value: Option.some(next),
                              }))
                            }
                          />
                        ),
                      })}
                      <Pressable
                        testId={`qb-rule-${index}-remove`}
                        onClick={() => remove(index)}
                        style={button}
                      >
                        <text
                          style={{
                            fontSize: 11,
                            color: theme.colors.foreground,
                          }}
                        >
                          x
                        </text>
                      </Pressable>
                    </div>
                  );
                }),
            })}
          </div>
        ) : (
          <text
            testId="qb-closed"
            style={{ fontSize: 11, color: theme.colors.mutedForeground }}
          >
            filters closed
          </text>
        )}
      </div>

      <Readout testId="qb-summary">{summarize(match, rules)}</Readout>

      <div
        testId="qb-header"
        style={{
          display: "flex",
          height: HEADER_HEIGHT,
          backgroundColor: theme.colors.muted,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(COLUMNS, (column) => (
          <div
            key={column.id}
            testId={`qb-head-${column.id}`}
            style={{
              width: column.width,
              justifyContent: "center",
              paddingLeft: 8,
            }}
          >
            <text style={{ fontSize: 11, color: theme.colors.foreground }}>
              {column.label}
            </text>
          </div>
        ))}
      </div>

      <div
        testId="qb-viewport"
        style={{ width: FRAME_WIDTH, height: VIEWPORT_HEIGHT }}
      >
        {matched === 0 ? (
          <div
            testId="qb-empty"
            style={{
              width: FRAME_WIDTH,
              height: VIEWPORT_HEIGHT,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.colors.background,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
              No matching rows
            </text>
          </div>
        ) : (
          <virtual-list
            testId="qb-list"
            ref={list}
            estimatedItemHeight={ROW_HEIGHT}
            onVisibleRange={syncAnchor}
            style={{ width: FRAME_WIDTH, height: VIEWPORT_HEIGHT }}
          >
            {Arr.map(visible, (row) => (
              <div
                key={row.id}
                testId={`qb-row-${row.id}`}
                role="row"
                aria-selected={Option.contains(selected, row.id)}
                onClick={() => toggleRow(row.id)}
                style={{
                  display: "flex",
                  height: ROW_HEIGHT,
                  flexShrink: 0,
                  backgroundColor: Option.contains(selected, row.id)
                    ? theme.colors.accent
                    : theme.colors.background,
                  borderWidth: theme.borderWidth.thin,
                  borderColor: theme.colors.border,
                  hover: { backgroundColor: theme.colors.muted },
                }}
              >
                {Arr.map(COLUMNS, (column) => (
                  <div
                    key={column.id}
                    testId={`qb-row-${row.id}-${column.id}`}
                    style={{
                      width: column.width,
                      justifyContent: "center",
                      paddingLeft: 8,
                    }}
                  >
                    <text
                      style={{ fontSize: 12, color: theme.colors.foreground }}
                    >
                      {cell(row, column.id)}
                    </text>
                  </div>
                ))}
              </div>
            ))}
          </virtual-list>
        )}
      </div>

      <Readout testId="qb-state">
        {`open=${open} rules=${Arr.length(rules)} complete=${completeCount(rules)} matched=${matched} match=${match} selected=${selectedLabel} anchor=${anchor}`}
      </Readout>
    </div>
  );
};

/** A `key=value` field of the state readout, or `"none"`. */
const stateField = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "qb-state", key), () => "none");

/** A painted element's box, or `None` when it never painted. */
const box = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.fromNullishOr(ctx.host.bounds(testId));

/** A painted element's text, or `"none"`. */
const read = (ctx: Smoke.SmokeContext, testId: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(testId)), () => "none");

/** The list's anchor index, or `-1` when it never reported one. */
const anchorIndex = (ctx: Smoke.SmokeContext): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.listScrollTop("qb-list")),
      (anchor) => anchor[0],
    ),
    () => -1,
  );

/** The background of a painted element, or `None` when it has no style. */
const background = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.flatMap(
    Option.fromNullishOr(ctx.host.paintedStyle(testId)),
    (style) => style.backgroundColor,
  );

/** Opens the field picker of `index` and chooses `field`. */
const chooseField = (
  ctx: Smoke.SmokeContext,
  index: number,
  field: string,
): void => {
  ctx.host.click(`qb-rule-${index}-field`);
  ctx.host.click(`qb-rule-${index}-field-item-${field}`);
};

/** Opens the operator picker of `index` and chooses `op`. */
const chooseOperator = (
  ctx: Smoke.SmokeContext,
  index: number,
  op: string,
): void => {
  ctx.host.click(`qb-rule-${index}-op`);
  ctx.host.click(`qb-rule-${index}-op-item-${op}`);
};

/** Opens the value picker of `index` and chooses `value`. */
const chooseValue = (
  ctx: Smoke.SmokeContext,
  index: number,
  value: string,
): void => {
  ctx.host.click(`qb-rule-${index}-value`);
  ctx.host.click(`qb-rule-${index}-value-item-${value}`);
};

/** Replaces the text of `index`'s value input. */
const retypeValue = (
  ctx: Smoke.SmokeContext,
  index: number,
  keystrokes: string,
): void => {
  ctx.host.click(`qb-rule-${index}-value`);
  ctx.host.key("cmd-a");
  ctx.host.key(keystrokes);
};

export const queryBuilderScenario: PlaygroundScenario = {
  id: "query-builder",
  title: "Query builder: rules, operators, combinators and a derived table",
  capability: "query",
  view: () => <QueryBuilderProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // The frame, the toolbar and a closed builder at rest.
      const frame = yield* ctx.expectSome(
        "the frame paints",
        box(ctx, "qb-frame"),
      );
      yield* ctx.expectNear("the frame is 780 px wide", frame.width, 780, 1);
      const toolbar = yield* ctx.expectSome(
        "the toolbar paints",
        box(ctx, "qb-toolbar"),
      );
      yield* ctx.expectNear("the toolbar is 40 px tall", toolbar.height, 40, 1);
      const builder = yield* ctx.expectSome(
        "the builder strip paints even while closed",
        box(ctx, "qb-builder"),
      );
      yield* ctx.expectNear(
        // 0.10.0 reports the border box minus its 1 px borders (plan 529 §6.3).
        "the builder strip is 130 px inside its borders",
        builder.height,
        130,
        1,
      );
      yield* ctx.expectNear(
        "the builder sits under the toolbar",
        builder.y,
        toolbar.y + TOOLBAR_HEIGHT + 8,
        1,
      );
      yield* ctx.expectEqual(
        "the builder starts closed with one incomplete rule",
        `${stateField(ctx, "open")}:${stateField(ctx, "rules")}:${stateField(ctx, "complete")}:${stateField(ctx, "matched")}:${stateField(ctx, "match")}:${stateField(ctx, "selected")}`,
        "false:1:0:120:all:none",
      );
      yield* ctx.expectEqual(
        "an incomplete builder has no summary",
        read(ctx, "qb-summary"),
        "none",
      );

      // Opening: the strip paints its rules and exposes both roles.
      ctx.host.click("qb-toggle");
      yield* ctx.expectEqual(
        "the toggle opens the builder",
        stateField(ctx, "open"),
        "true",
      );
      yield* ctx.expectSome("the rule row paints", box(ctx, "qb-rule-0"));
      const first = yield* ctx.expectSome(
        "the first result row paints",
        box(ctx, "qb-row-0"),
      );
      const viewport = yield* ctx.expectSome(
        "the result viewport paints",
        box(ctx, "qb-viewport"),
      );
      yield* ctx.expectNear(
        "the first result starts at the viewport top",
        first.y,
        viewport.y,
        1,
      );
      const toolbarNode = yield* ctx.expectSome(
        "the toolbar is exposed to assistive technology",
        ariaOf(ctx, "qb-toolbar"),
      );
      yield* ctx.expectEqual(
        "the toolbar is a named Toolbar",
        `${text(toolbarNode.role)}:${text(toolbarNode.label)}`,
        "Toolbar:Query",
      );
      const builderNode = yield* ctx.expectSome(
        "the builder is exposed to assistive technology",
        ariaOf(ctx, "qb-builder"),
      );
      yield* ctx.expectEqual(
        "the builder is a named Group",
        `${text(builderNode.role)}:${text(builderNode.label)}`,
        "Group:Filters",
      );
      const ruleNode = yield* ctx.expectSome(
        "the rule row is exposed to assistive technology",
        ariaOf(ctx, "qb-rule-0"),
      );
      yield* ctx.expectEqual(
        "the rule row is a named Group",
        `${text(ruleNode.role)}:${text(ruleNode.label)}`,
        "Group:Rule 1",
      );

      // A status rule: a native Select commits and the table narrows.
      ctx.host.click("qb-rule-0-value");
      yield* ctx.expectContains(
        "the value picker paints its options",
        read(ctx, "qb-rule-0-value-content"),
        "paused",
      );
      ctx.host.click("qb-rule-0-value-item-paused");
      yield* ctx.expectEqual(
        "choosing a status narrows the rows",
        `${stateField(ctx, "complete")}:${stateField(ctx, "matched")}`,
        "1:40",
      );
      yield* ctx.expectEqual(
        "the value picker closed after the choice",
        ctx.host.text("qb-rule-0-value-content") === null,
        true,
      );
      yield* ctx.expectEqual(
        "the summary names the complete rule",
        read(ctx, "qb-summary"),
        "status is paused",
      );
      const pausedFirst = yield* ctx.expectSome(
        "the first paused row paints",
        box(ctx, "qb-row-1"),
      );
      yield* ctx.expectNear(
        "the first paused row is at the top",
        pausedFirst.y,
        viewport.y,
        1,
      );
      yield* ctx.expectEqual(
        "an active row is unpainted",
        Option.isNone(box(ctx, "qb-row-0")),
        true,
      );

      // Appending: the new rule is revealed and takes focus.
      ctx.host.click("qb-add");
      yield* ctx.expectEqual(
        "add appends a rule but keeps the result",
        `${stateField(ctx, "rules")}:${stateField(ctx, "matched")}`,
        "2:40",
      );
      yield* ctx.expectEqual(
        "the appended rule takes focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "qb-rule-1-value",
      );
      yield* ctx.expectEqual(
        "the appended rule defaults to a name contains rule",
        `${read(ctx, "qb-rule-1-field")}:${read(ctx, "qb-rule-1-op")}`,
        "Name:contains",
      );

      // A second complete rule narrows under `all` and widens under `any`.
      ctx.host.click("qb-rule-1-value");
      ctx.host.key("i t e m space 1");
      yield* ctx.expectEqual(
        "the second rule narrows under all",
        `${stateField(ctx, "complete")}:${stateField(ctx, "matched")}`,
        "2:12",
      );
      yield* ctx.expectEqual(
        "the summary joins both rules",
        read(ctx, "qb-summary"),
        "status is paused and name contains item 1",
      );
      yield* ctx.expectSome(
        "a row matching both rules paints",
        box(ctx, "qb-row-10"),
      );
      yield* ctx.expectEqual(
        "a row matching only one rule is unpainted under all",
        Option.isNone(box(ctx, "qb-row-11")),
        true,
      );
      ctx.host.click("qb-match-any");
      yield* ctx.expectEqual(
        "any widens the result",
        `${stateField(ctx, "match")}:${stateField(ctx, "matched")}`,
        "any:59",
      );
      yield* ctx.expectSome(
        "a row matching only one rule paints under any",
        box(ctx, "qb-row-11"),
      );
      yield* ctx.expectEqual(
        "a row matching neither rule stays unpainted",
        Option.isNone(box(ctx, "qb-row-2")),
        true,
      );
      yield* ctx.expectContains(
        "the summary switches combinator",
        read(ctx, "qb-summary"),
        " or ",
      );

      // A numeric field resets the operator and value, and the bounds are exact.
      ctx.host.click("qb-clear");
      yield* ctx.expectEqual(
        "clear restores one incomplete rule",
        `${stateField(ctx, "rules")}:${stateField(ctx, "complete")}:${stateField(ctx, "matched")}:${stateField(ctx, "match")}`,
        "1:0:120:all",
      );
      chooseField(ctx, 0, "score");
      yield* ctx.expectEqual(
        "re-typing a rule resets its operator",
        read(ctx, "qb-rule-0-op"),
        ">",
      );
      yield* ctx.expectEqual(
        "re-typing a rule clears its value",
        `${stateField(ctx, "complete")}:${stateField(ctx, "matched")}`,
        "0:120",
      );
      ctx.host.click("qb-rule-0-value");
      ctx.host.key("8 0");
      yield* ctx.expectEqual(
        "gt excludes its bound",
        stateField(ctx, "matched"),
        "19",
      );
      chooseOperator(ctx, 0, "gte");
      yield* ctx.expectEqual(
        "gte includes the bound",
        stateField(ctx, "matched"),
        "20",
      );
      chooseOperator(ctx, 0, "lt");
      yield* ctx.expectEqual(
        "lt excludes its bound",
        stateField(ctx, "matched"),
        "100",
      );
      retypeValue(ctx, 0, "1 0");
      yield* ctx.expectEqual(
        "a numeric bound narrows to the fixture",
        stateField(ctx, "matched"),
        "20",
      );
      retypeValue(ctx, 0, "a b c");
      yield* ctx.expectEqual(
        "a non-numeric value matches nothing",
        `${stateField(ctx, "complete")}:${stateField(ctx, "matched")}`,
        "1:0",
      );
      yield* ctx.expectSome(
        "the empty state paints when nothing matches",
        box(ctx, "qb-empty"),
      );
      yield* ctx.expectContains(
        "the empty state names the situation",
        read(ctx, "qb-empty"),
        "No matching rows",
      );
      yield* ctx.expectEqual(
        "no result row paints under the empty state",
        Option.isNone(box(ctx, "qb-row-80")),
        true,
      );

      // An enum operator pair, and an incomplete rule under `any`.
      ctx.host.click("qb-clear");
      chooseField(ctx, 0, "owner");
      chooseValue(ctx, 0, "Ada");
      yield* ctx.expectEqual(
        "an enum value narrows to the owner",
        stateField(ctx, "matched"),
        "30",
      );
      chooseOperator(ctx, 0, "isNot");
      yield* ctx.expectEqual(
        "is not inverts the owner",
        stateField(ctx, "matched"),
        "90",
      );
      yield* ctx.expectEqual(
        "the summary names the operator",
        read(ctx, "qb-summary"),
        "owner is not Ada",
      );
      ctx.host.click("qb-add");
      yield* ctx.expectEqual(
        "an incomplete rule is ignored under all",
        `${stateField(ctx, "complete")}:${stateField(ctx, "matched")}`,
        "1:90",
      );
      ctx.host.click("qb-match-any");
      yield* ctx.expectEqual(
        "an incomplete rule is ignored under any",
        `${stateField(ctx, "match")}:${stateField(ctx, "matched")}`,
        "any:90",
      );

      // Removing every rule returns every row.
      ctx.host.click("qb-rule-1-remove");
      yield* ctx.expectEqual(
        "remove drops the rule",
        stateField(ctx, "rules"),
        "1",
      );
      ctx.host.click("qb-rule-0-remove");
      yield* ctx.expectEqual(
        "removing the last rule shows every row",
        `${stateField(ctx, "rules")}:${stateField(ctx, "complete")}:${stateField(ctx, "matched")}`,
        "0:0:120",
      );
      yield* ctx.expectContains(
        "the empty builder names its state",
        read(ctx, "qb-rules-empty"),
        "no rules",
      );
      ctx.host.click("qb-add");
      yield* ctx.expectSome(
        "a rule can be added to an empty builder",
        box(ctx, "qb-rule-0"),
      );
      yield* ctx.expectEqual(
        "the added rule takes focus",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "qb-rule-0-value",
      );
      ctx.host.click("qb-rule-0-value");
      ctx.host.key("z z z");
      yield* ctx.expectEqual(
        "a text rule with no match empties the table",
        `${stateField(ctx, "complete")}:${stateField(ctx, "matched")}`,
        "1:0",
      );

      // A query edit resets the anchor and clears the selection.
      ctx.host.click("qb-clear");
      ctx.host.wheel("qb-viewport", 0, WHEEL_TO_ROW_30);
      yield* ctx.expectEqual(
        "the wheel moves the result to row 30",
        anchorIndex(ctx),
        30,
      );
      ctx.host.click("qb-row-31");
      yield* ctx.expectEqual(
        "a row click selects it",
        stateField(ctx, "selected"),
        "31",
      );
      yield* ctx.expectEqual(
        "the selected row paints the accent",
        Option.getOrElse(background(ctx, "qb-row-31"), () => "none"),
        palettes.dark.colors.accent,
      );
      chooseValue(ctx, 0, "paused");
      yield* ctx.expectEqual(
        "a rule edit resets the anchor",
        anchorIndex(ctx),
        0,
      );
      yield* ctx.expectEqual(
        "the reset reaches the readout",
        stateField(ctx, "anchor"),
        "0",
      );
      yield* ctx.expectEqual(
        "a rule edit clears the selection",
        stateField(ctx, "selected"),
        "none",
      );
      const resetFirst = yield* ctx.expectSome(
        "the first filtered row paints after the reset",
        box(ctx, "qb-row-1"),
      );
      yield* ctx.expectNear(
        "the reset puts the first filtered row at the top",
        resetFirst.y,
        viewport.y,
        1,
      );

      // Four rules: the appended row is revealed inside the strip.
      ctx.host.click("qb-clear");
      ctx.host.click("qb-add");
      ctx.host.click("qb-add");
      ctx.host.click("qb-add");
      yield* ctx.expectEqual(
        "four rules are listed",
        stateField(ctx, "rules"),
        "4",
      );
      const strip = yield* ctx.expectSome(
        "the rule strip paints",
        box(ctx, "qb-rules"),
      );
      const appended = yield* ctx.expectSome(
        "the appended row is inside the strip",
        box(ctx, "qb-rule-3"),
      );
      // Measured on published 0.10.0: `scrollIntoView` from the mount effect
      // no-ops before the appended row's first paint, so the fourth rule stays
      // below the strip. main's post-paint work fixes it; a component on the
      // published runtime needs its own post-paint reveal (plan 529 §6.3).
      yield* ctx.expectEqual(
        "the appended row is not revealed before its first paint",
        appended.y + appended.height > strip.y + strip.height,
        true,
      );
      const firstRule = yield* ctx.expectSome(
        "the first rule keeps painted bounds",
        box(ctx, "qb-rule-0"),
      );
      yield* ctx.expectEqual(
        "the first rule is still inside the strip (no reveal, plan 529 §6.3)",
        firstRule.y >= strip.y,
        true,
      );

      // The field picker works inside the strip. The fourth row is not revealed
      // on 0.10.0 (above), so the picker is driven from the visible second row.
      ctx.host.click("qb-rule-1-field");
      yield* ctx.expectSome(
        "a picker opened from the strip paints its content",
        box(ctx, "qb-rule-1-field-content"),
      );
      yield* ctx.expectSome(
        "the picker's items are painted",
        box(ctx, "qb-rule-1-field-item-score"),
      );
      ctx.host.click("qb-rule-1-field-item-score");
      yield* ctx.expectEqual(
        "the row commits its field",
        read(ctx, "qb-rule-1-op"),
        ">",
      );

      // Escape closes the strip, returns focus, and keeps the rules.
      ctx.host.click("qb-rule-1-value");
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "escape closes the builder",
        stateField(ctx, "open"),
        "false",
      );
      yield* ctx.expectEqual(
        "the closed builder paints its placeholder",
        Option.isSome(box(ctx, "qb-closed")),
        true,
      );
      yield* ctx.expectEqual(
        "escape returns focus to the toggle",
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.focused()),
          () => "none",
        ),
        "qb-toggle",
      );
      ctx.host.click("qb-toggle");
      yield* ctx.expectEqual(
        "reopening keeps the rules",
        `${stateField(ctx, "open")}:${stateField(ctx, "rules")}`,
        "true:4",
      );

      // The result list still windows.
      ctx.host.click("qb-clear");
      yield* ctx.expectSome("row 0 paints", box(ctx, "qb-row-0"));
      yield* ctx.expectEqual(
        "a row past the window is unpainted",
        Option.isNone(box(ctx, "qb-row-60")),
        true,
      );
    }),
};
