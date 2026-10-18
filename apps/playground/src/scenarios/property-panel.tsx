/**
 * `property-panel` — the inspector composition a data grid and a property
 * editor both need: labelled key/value rows, one row owning a native editor,
 * the list windowing its rows, and the committed model driving a rendered
 * surface outside the list.
 *
 * The open question this probe answers: when a row holding the focused editor
 * leaves the virtual window and comes back, does the editor keep the committed
 * value and the draft, or is the host node rebuilt from the authored props? The
 * probe asserts the model is the source of truth either way, and plan `348` §9
 * records which one the runtime chose.
 *
 * Measured facts: plan `348` §9.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import { textStyle } from "@gpuixui/tokens";
import type { StyleDesc } from "@gpuix/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import { ariaOf, painted, read, readoutField, text } from "./probes.js";
import * as Inspector from "./property-model.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 96;
const EDITABLE = 8;
const ROW_HEIGHT = 36;
const LIST_HEIGHT = 288;
const LABEL_WIDTH = 96;
const ROW_GAP = 8;
const READOUT = "inspector-readout";

const editable = (property: Inspector.Property): boolean =>
  Number.parseInt(property.id.slice(2), 10) < EDITABLE;

const PropertyRow = ({
  property,
  index,
  state,
  onDraft,
  onCommit,
  onRevert,
}: {
  readonly property: Inspector.Property;
  readonly index: number;
  readonly state: Inspector.InspectorState;
  readonly onDraft: (id: string, value: string) => void;
  readonly onCommit: (id: string) => void;
  readonly onRevert: (id: string) => void;
}) => {
  const theme = useTheme();
  const value = Inspector.draftValue(state, property.id);
  const input: StyleDesc = {
    width: 150,
    height: 26,
    padding: 4,
    color: theme.colors.inputForeground,
    backgroundColor: theme.colors.input,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  };

  return (
    <div
      testId={`inspector-row-${index}`}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: ROW_GAP,
        height: ROW_HEIGHT,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <text
        testId={`inspector-label-${index}`}
        style={{
          ...textStyle(theme, "caption"),
          width: LABEL_WIDTH,
          color: theme.colors.mutedForeground,
        }}
      >
        {property.label}
      </text>
      {editable(property) ? (
        <input
          testId={`inspector-input-${index}`}
          aria-id={`inspector-input-${index}`}
          value={value}
          onChange={(event) => onDraft(property.id, event.value ?? "")}
          // The runtime's measured Enter path for a field is `onSubmit`
          // (`input-edit`); Escape arrives on the field's key down.
          onSubmit={() => onCommit(property.id)}
          onKeyDown={(event: EventPayload) => {
            if (event.key === "escape") {
              onRevert(property.id);
            }
          }}
          style={input}
        />
      ) : (
        <text
          testId={`inspector-value-${index}`}
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          {value}
        </text>
      )}
    </div>
  );
};

const PropertyPanelProbe = () => {
  const theme = useTheme();
  const [state, setState] = useState(() => Inspector.initial(ROWS));
  const [query, setQuery] = useState("");
  const visible = Inspector.filterProperties(state.properties, query);
  const name = Inspector.committedValue(state, "p-0");
  const opacity = Inspector.committedValue(state, "p-1");
  const surface: StyleDesc = {
    backgroundColor: theme.colors.card,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  };

  // Every mutation is a functional update: the live automation has no frame
  // boundary, so a commit's key can arrive in the same batch as the typing that
  // produced the draft (plan `348` §9).
  const commit = (id: string) =>
    setState((current) => Inspector.commit(current, id).state);

  return (
    <div
      testId="inspector-frame"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 16,
        width: 860,
        height: 440,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId="inspector-preview"
        style={{
          ...surface,
          width: 544,
          padding: theme.spacing.lg,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Preview
        </text>
        <text
          testId="inspector-preview-name"
          style={{
            ...textStyle(theme, "h3"),
            color: theme.colors.foreground,
          }}
        >
          {name}
        </text>
        <div
          style={{
            width: 120,
            height: 24,
            backgroundColor: theme.colors.muted,
            borderRadius: theme.radius.sm,
          }}
        >
          <div
            testId="inspector-preview-bar"
            style={{
              width: Inspector.barWidth(opacity),
              height: 24,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.sm,
            }}
          />
        </div>
        <Readout testId={READOUT}>
          {Inspector.describeInspector(state, query)}
        </Readout>
      </div>
      <div testId="inspector-pane" style={{ ...surface, width: 300 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
          }}
        >
          <text
            testId="inspector-heading"
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Inspector
          </text>
          <Pressable
            testId="inspector-reset"
            onClick={() => {
              setState((current) => Inspector.reset(current));
              setQuery("");
            }}
            style={{ padding: theme.spacing.sm }}
          >
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.foreground,
              }}
            >
              Reset
            </text>
          </Pressable>
        </div>
        <div style={{ paddingLeft: 12, paddingRight: 12, paddingBottom: 8 }}>
          <input
            testId="inspector-filter"
            aria-id="inspector-filter"
            placeholder="Filter properties"
            value={query}
            onChange={(event) => setQuery(event.value ?? "")}
            onKeyDown={(event: EventPayload) => {
              if (event.key === "escape") {
                setQuery("");
              }
            }}
            style={{
              width: 276,
              height: 28,
              padding: 4,
              color: theme.colors.inputForeground,
              backgroundColor: theme.colors.input,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.sm,
            }}
          />
        </div>
        <virtual-list
          // A new row set starts at the top: a stale anchor would point past
          // the filtered rows.
          key={query}
          testId="inspector-list"
          estimatedItemHeight={ROW_HEIGHT}
          style={{ height: LIST_HEIGHT }}
        >
          {Arr.map(visible, (property, index) => (
            <PropertyRow
              key={property.id}
              property={property}
              index={index}
              state={state}
              onDraft={(id, value) =>
                setState((current) => Inspector.setDraft(current, id, value))
              }
              onCommit={commit}
              onRevert={(id) =>
                setState((current) => Inspector.revert(current, id))
              }
            />
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

/** Types `keys` as one space-separated native keystroke sequence. */
const type = (ctx: Smoke.SmokeContext, keys: ReadonlyArray<string>): void =>
  ctx.host.key(Arr.join(keys, " "));

const field = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, READOUT, key), () => "none");

const paintedLines = (ctx: Smoke.SmokeContext): ReadonlyArray<string> =>
  ctx.host.paintedText();

const paints = (ctx: Smoke.SmokeContext, line: string): boolean =>
  Arr.some(paintedLines(ctx), (paintedLine) => paintedLine === line);

/** The accessibility value of the editor at `index`, or `"none"`. */
const editorValue = (ctx: Smoke.SmokeContext, index: number): string =>
  Option.getOrElse(
    Option.flatMap(
      ariaOf(ctx, `inspector-input-${index}`),
      (node) => node.value,
    ),
    () => "none",
  );

export const propertyPanelScenario: PlaygroundScenario = {
  id: "property-panel",
  title: "Inspector: key/value rows, an editor in a virtual list, reset",
  capability: "inspector",
  view: () => <PropertyPanelProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const frame = yield* ctx.expectSome(
        "the inspector frame painted",
        painted(ctx, "inspector-frame"),
      );
      const pane = yield* ctx.expectSome(
        "the inspector pane painted",
        painted(ctx, "inspector-pane"),
      );
      yield* ctx.expectNear(
        // 0.10.0 reports the border box minus its 1 px borders (plan 529 §6.3).
        "the inspector pane is 298 px inside its borders",
        pane.width,
        298,
        1,
      );
      yield* ctx.expectNear(
        "the pane ends at the frame's right edge",
        pane.x + pane.width,
        frame.x + frame.width,
        1,
      );

      const row = yield* ctx.expectSome(
        "the first property row painted",
        painted(ctx, "inspector-row-0"),
      );
      const label = yield* ctx.expectSome(
        "the first label painted",
        painted(ctx, "inspector-label-0"),
      );
      const input = yield* ctx.expectSome(
        "the first editor painted",
        painted(ctx, "inspector-input-0"),
      );
      yield* ctx.expectNear("a property row is 36 px tall", row.height, 36, 1);
      yield* ctx.expectNear("the label column is 96 px", label.width, 96, 1);
      yield* ctx.expectNear(
        // The editor's content origin is 5 px inside it (plan 529 §6.3).
        "the editor starts one gap plus its inset after the label",
        input.x - (label.x + label.width),
        13,
        1,
      );
      yield* ctx.expectEqual(
        "the key column paints its label",
        paints(ctx, "Name"),
        true,
      );
      yield* ctx.expectEqual(
        "the value column paints the committed value",
        paints(ctx, "Untitled"),
        true,
      );

      const editor = yield* ctx.expectSome(
        "the property editor is exposed to assistive technology",
        ariaOf(ctx, "inspector-input-0"),
      );
      yield* ctx.expectEqual(
        "the property editor is a TextInput",
        text(editor.role),
        "TextInput",
      );
      yield* ctx.expectEqual(
        "the editor exposes the committed value",
        text(editor.value),
        "Untitled",
      );

      // 1. Typing is a draft: the committed model and the preview do not move.
      ctx.host.click("inspector-input-0");
      ctx.host.key("cmd-a");
      type(ctx, ["r", "e", "n", "a", "m", "e", "d"]);
      yield* ctx.expectEqual(
        "typing changes the draft only",
        field(ctx, "drafts"),
        "1",
      );
      yield* ctx.expectEqual(
        "the committed value is unchanged before Enter",
        field(ctx, "name"),
        "Untitled",
      );

      // 2. Enter commits, and the rendered preview reads the model.
      ctx.host.key("enter");
      yield* ctx.expectEqual(
        "Enter commits the draft",
        field(ctx, "commits"),
        "1",
      );
      yield* ctx.expectEqual(
        "a commit clears the draft",
        field(ctx, "drafts"),
        "0",
      );
      yield* ctx.expectEqual(
        "the committed value reaches the preview",
        read(ctx, "inspector-preview-name"),
        "renamed",
      );

      // 3. Escape reverts a second draft without a commit.
      ctx.host.click("inspector-input-0");
      type(ctx, ["x"]);
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape does not commit",
        field(ctx, "commits"),
        "1",
      );
      yield* ctx.expectEqual(
        "Escape restores the committed value",
        editorValue(ctx, 0),
        "renamed",
      );

      // 4. A numeric property drives geometry outside the list.
      ctx.host.click("inspector-input-1");
      ctx.host.key("cmd-a");
      type(ctx, ["4", "0"]);
      ctx.host.key("enter");
      const bar = yield* ctx.expectSome(
        "the preview bar painted",
        painted(ctx, "inspector-preview-bar"),
      );
      yield* ctx.expectNear(
        "editing Opacity resizes the preview bar",
        bar.width,
        48,
        1,
      );

      // 5. Windowing: the row leaves the painted window and comes back with the
      // model's committed value, not a stale native echo.
      ctx.host.scrollToItem("inspector-list", 40);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the edited row leaves the painted window",
        paints(ctx, "Name"),
        false,
      );
      yield* ctx.expectEqual(
        "the window paints the row it scrolled to",
        paints(ctx, "Property 40"),
        true,
      );
      ctx.host.scrollToItem("inspector-list", 0);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the committed value survives a windowing scroll",
        editorValue(ctx, 0),
        "renamed",
      );

      // 6. A draft is parent-owned, so a windowed rebuild cannot lose it.
      ctx.host.click("inspector-input-0");
      type(ctx, ["z"]);
      yield* ctx.expectEqual(
        "the second draft is recorded",
        field(ctx, "drafts"),
        "1",
      );
      ctx.host.scrollToItem("inspector-list", 40);
      ctx.host.advance(50);
      ctx.host.scrollToItem("inspector-list", 0);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the draft survives a windowing scroll",
        field(ctx, "drafts"),
        "1",
      );
      yield* ctx.expectEqual(
        "the editor paints the surviving draft",
        editorValue(ctx, 0),
        "renamedz",
      );

      // 7. Filtering hides rows but keeps their drafts; Escape restores them.
      ctx.host.click("inspector-filter");
      type(ctx, ["r", "o", "l", "e"]);
      yield* ctx.expectEqual(
        "the filter records its query",
        field(ctx, "filter"),
        "role",
      );
      yield* ctx.expectEqual(
        "the filter keeps the matching row",
        paints(ctx, "Role"),
        true,
      );
      yield* ctx.expectEqual(
        "the filter hides non-matching rows",
        paints(ctx, "Name"),
        false,
      );
      yield* ctx.expectEqual(
        "filtering does not discard a draft",
        field(ctx, "drafts"),
        "1",
      );
      ctx.host.key("escape");
      yield* ctx.expectEqual(
        "Escape in the filter restores every row",
        field(ctx, "filter"),
        "-",
      );
      yield* ctx.expectEqual(
        "the restored list paints the first row again",
        paints(ctx, "Name"),
        true,
      );

      // 8. Reset restores the baseline, the drafts, the filter and the preview.
      ctx.host.click("inspector-reset");
      yield* ctx.expectEqual(
        "reset restores the committed value",
        field(ctx, "name"),
        "Untitled",
      );
      yield* ctx.expectEqual(
        "reset clears the draft",
        field(ctx, "drafts"),
        "0",
      );
      yield* ctx.expectEqual(
        "reset clears the filter",
        field(ctx, "filter"),
        "-",
      );
      const restored = yield* ctx.expectSome(
        "the preview bar still paints after reset",
        painted(ctx, "inspector-preview-bar"),
      );
      yield* ctx.expectNear(
        "reset restores the preview geometry",
        restored.width,
        96,
        1,
      );
      yield* ctx.expectEqual(
        "reset repaints the preview text",
        read(ctx, "inspector-preview-name"),
        "Untitled",
      );
    }),
};
