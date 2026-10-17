/**
 * `a11y-tree` — what the runtime actually exposes to assistive technology.
 *
 * The library's accessibility claims came from the published `HostProps` type.
 * This drives one node per supported ARIA prop and reads the painted frame's
 * AccessKit dump, which is the only runtime evidence there is. The findings are
 * not cosmetic: a custom Checkbox or Switch cannot announce a checked state
 * here, and a button's name does **not** come from its text, so every control
 * must pass `aria-label`.
 *
 * The virtual-list half matters for grids and trees: the dump follows the
 * painted window, not the retained rows.
 *
 * Measured facts: plan `160` §8.
 */
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";
import type { Props } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { fieldText as text, nodeFor } from "../a11y.js";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const VROWS = 50;

const A11yProbe = () => {
  const theme = useTheme();
  const label = { color: theme.colors.foreground };
  const row = (
    testId: string,
    authorId: string,
    props: Props,
    content: string,
  ) => (
    <div testId={testId} aria-id={authorId} {...props} style={{ padding: 4 }}>
      <text style={label}>{content}</text>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: 420,
        padding: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      {row(
        "a11y-button",
        "probe-button",
        {
          role: "button",
          "aria-label": "Save",
          onClick: () => {},
        },
        "Save",
      )}
      {row(
        "a11y-unnamed",
        "probe-unnamed",
        {
          role: "button",
          onClick: () => {},
        },
        "Unnamed",
      )}
      {row(
        "a11y-checkbox",
        "probe-checkbox",
        {
          role: "checkbox",
          "aria-label": "Check",
          tabIndex: 0,
        },
        "Check",
      )}
      {row(
        "a11y-switch",
        "probe-switch",
        {
          role: "switch",
          "aria-label": "Wifi",
        },
        "Wifi",
      )}
      {row(
        "a11y-slider",
        "probe-slider",
        {
          role: "slider",
          "aria-label": "Volume",
          "aria-valuetext": "42%",
          tabIndex: 0,
        },
        "Volume",
      )}
      {row(
        "a11y-heading",
        "probe-heading",
        {
          role: "heading",
          "aria-level": 3,
        },
        "Heading",
      )}
      {row(
        "a11y-option",
        "probe-option",
        {
          role: "option",
          "aria-selected": true,
        },
        "Option",
      )}
      {row(
        "a11y-collapsed",
        "probe-collapsed",
        {
          role: "button",
          "aria-expanded": false,
        },
        "Collapsed",
      )}
      {row(
        "a11y-decorative",
        "probe-decorative",
        {
          role: "presentation",
        },
        "decorative",
      )}
      <input
        testId="a11y-input"
        aria-id="probe-input"
        value="hello"
        placeholder="type"
        readOnly
        style={{ color: theme.colors.inputForeground }}
      />
      <virtual-list testId="a11y-vlist" style={{ height: 200 }}>
        {Array.from({ length: VROWS }, (_, index) => (
          <div
            key={index}
            testId={`a11y-vrow-${index}`}
            aria-id={`vrow-${index}`}
            aria-label={`row ${index}`}
            role="option"
            style={{ height: 32, padding: 6 }}
          >
            <text style={label}>{`row ${index}`}</text>
          </div>
        ))}
      </virtual-list>
      <Readout testId="a11y-frame">frame</Readout>
    </div>
  );
};

/** The decoded tree, or a labelled assertion failure. */
const treeOf = (ctx: Smoke.SmokeContext) =>
  ctx.expectSome(
    "the runtime painted an accessibility tree",
    Option.fromNullishOr(ctx.host.a11y()),
  );

/** Asserts one author id's node exists and returns it. */
const node = (ctx: Smoke.SmokeContext, tree: Smoke.A11yTree, id: string) =>
  ctx.expectSome(`node ${id} is exposed`, nodeFor(tree, id));

const role = (ctx: Smoke.SmokeContext, id: string, expected: string) =>
  Effect.gen(function* () {
    const tree = yield* treeOf(ctx);
    const aria = yield* node(ctx, tree, id);
    yield* ctx.expectEqual(`${id} role`, text(aria.role), expected);
  });

export const a11yScenario: PlaygroundScenario = {
  id: "a11y-tree",
  title: "Accessibility: roles, names, states and the painted window",
  capability: "a11y",
  view: () => <A11yProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const tree = yield* treeOf(ctx);
      yield* ctx.expectEqual(
        "the tree holds the probe nodes",
        tree.frame.node_count >= 10,
        true,
      );
      yield* ctx.expectEqual(
        "explicit tab stops and the input reach the frame",
        tree.frame.tab_stop_count,
        3,
      );

      yield* role(ctx, "probe-button", "Button");
      const button = yield* node(ctx, tree, "probe-button");
      yield* ctx.expectEqual(
        "aria-label is the accessible name",
        text(button.label),
        "Save",
      );
      yield* ctx.expectContains(
        "a click listener becomes the Click action",
        Arr.join(
          Option.getOrElse(button.on_action, () => []),
          ",",
        ),
        "Click",
      );

      yield* role(ctx, "probe-unnamed", "Button");
      const unnamed = yield* node(ctx, tree, "probe-unnamed");
      yield* ctx.expectEqual(
        "a button's name is not derived from its text",
        Option.isNone(unnamed.label),
        true,
      );

      yield* role(ctx, "probe-checkbox", "CheckBox");
      const checkbox = yield* node(ctx, tree, "probe-checkbox");
      yield* ctx.expectEqual(
        "the checkbox is named",
        text(checkbox.label),
        "Check",
      );
      yield* ctx.expectEqual(
        "the checkbox has no state channel",
        Option.isNone(checkbox.value) && Option.isNone(checkbox.selected),
        true,
      );

      yield* role(ctx, "probe-switch", "Switch");
      const toggle = yield* node(ctx, tree, "probe-switch");
      yield* ctx.expectEqual("the switch is named", text(toggle.label), "Wifi");

      yield* role(ctx, "probe-slider", "Slider");
      const slider = yield* node(ctx, tree, "probe-slider");
      yield* ctx.expectEqual(
        "aria-valuetext is the value",
        text(slider.value),
        "42%",
      );

      yield* role(ctx, "probe-heading", "Heading");
      const heading = yield* node(ctx, tree, "probe-heading");
      yield* ctx.expectEqual(
        "aria-level is the heading level",
        Option.getOrElse(heading.level, () => 0),
        3,
      );

      yield* role(ctx, "probe-option", "ListBoxOption");
      const option = yield* node(ctx, tree, "probe-option");
      yield* ctx.expectEqual(
        "aria-selected reaches the tree",
        Option.getOrElse(option.selected, () => false),
        true,
      );

      const collapsed = yield* node(ctx, tree, "probe-collapsed");
      yield* ctx.expectEqual(
        "another expanded=false is preserved",
        Option.getOrElse(collapsed.expanded, () => true),
        false,
      );

      yield* ctx.expectEqual(
        "role=presentation produces no node",
        Option.isNone(nodeFor(tree, "probe-decorative")),
        true,
      );
      yield* ctx.expectContains(
        "its text is still painted",
        Arr.join(ctx.host.paintedText(), "\n"),
        "decorative",
      );

      const input = yield* node(ctx, tree, "probe-input");
      yield* ctx.expectEqual(
        "the input is a TextInput",
        text(input.role),
        "TextInput",
      );
      yield* ctx.expectEqual(
        "its value is exposed",
        text(input.value),
        "hello",
      );
      yield* ctx.expectEqual(
        "its placeholder is exposed",
        text(input.placeholder),
        "type",
      );

      const paintedRows = Arr.filter(R.values(tree.nodes), (entry) =>
        Option.exists(entry.aria, (aria) =>
          Str.startsWith("vrow-")(Option.getOrElse(aria.author_id, () => "")),
        ),
      );
      yield* ctx.expectEqual(
        "the first virtual row is exposed",
        Option.isSome(nodeFor(tree, "vrow-0")),
        true,
      );
      yield* ctx.expectEqual(
        "an off-window row is not exposed",
        Option.isNone(nodeFor(tree, `vrow-${VROWS - 1}`)),
        true,
      );
      yield* ctx.expectEqual(
        "the tree follows the painted window, not every retained row",
        Arr.length(paintedRows) < VROWS,
        true,
      );
    }),
};
