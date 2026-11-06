import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import type { ScenarioBody } from "../types.js";

const A11yProbe = () => {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        testId="a11y-button"
        role="button"
        tabIndex={0}
        aria-label="Save project"
        aria-description="Writes the file"
        aria-id="file.save"
        onClick={() => {}}
        style={{ padding: 8, backgroundColor: theme.colors.primary }}
      >
        <text style={{ color: theme.colors.primaryForeground }}>Save</text>
      </div>
      <div
        testId="a11y-option"
        role="option"
        aria-label="Chosen row"
        aria-selected={true}
        aria-expanded={true}
      />
      <div
        testId="a11y-heading"
        role="heading"
        aria-label="Diagnostics"
        aria-level={2}
      />
      <div
        testId="a11y-progress"
        role="progressbar"
        aria-label="Sync"
        aria-valuetext="42%"
      />
      <div testId="a11y-none" role="none" aria-label="hidden by role" />
      <div testId="a11y-plain" aria-label="silent" />
      <text testId="a11y-label" style={{ color: theme.colors.foreground }}>
        Hello accessibility
      </text>
    </div>
  );
};

const nodeNamed = (
  tree: Smoke.A11yTree,
  label: string,
): Option.Option<Smoke.A11yNode> =>
  Arr.findFirst(tree.nodes, (node) => Option.contains(node.label, label));

const shown = (value: Option.Option<string>): string =>
  Option.getOrElse(value, () => "");

const node = (
  ctx: Smoke.SmokeContext,
  tree: Smoke.A11yTree,
  label: string,
): Effect.Effect<Smoke.A11yNode, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `the tree describes "${label}"`,
    nodeNamed(tree, label).pipe(
      Option.orElse(() =>
        Arr.findFirst(tree.nodes, (candidate) =>
          Option.contains(candidate.value, label),
        ),
      ),
    ),
  );

export const a11yTreeScenario: ScenarioBody = {
  view: () => <A11yProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const tree = yield* ctx.expectSome(
        "the renderer reports an accessibility tree",
        Option.fromNullishOr(ctx.host.a11yTree()),
      );

      const button = yield* node(ctx, tree, "Save project");
      yield* ctx.expectEqual(
        "the aria token becomes the platform's role name",
        Option.getOrElse(button.role, () => ""),
        "Button",
      );
      yield* ctx.expectEqual(
        "aria-description reaches the tree",
        shown(button.description),
        "Writes the file",
      );
      yield* ctx.expectEqual(
        "aria-id reaches the tree",
        shown(button.author_id),
        "file.save",
      );
      const actions = Option.getOrElse(button.on_action, () => []);
      yield* ctx.expectEqual(
        "a press and a focus are actions the platform offers",
        Arr.contains(actions, "Click") && Arr.contains(actions, "Focus"),
        true,
      );

      const option = yield* node(ctx, tree, "Chosen row");
      yield* ctx.expectEqual(
        "an option is a ListBoxOption, not the token's spelling",
        Option.getOrElse(option.role, () => ""),
        "ListBoxOption",
      );
      yield* ctx.expectEqual(
        "aria-selected reaches the tree",
        Option.getOrElse(option.selected, () => false),
        true,
      );
      yield* ctx.expectEqual(
        "aria-expanded reaches the tree",
        Option.getOrElse(option.expanded, () => false),
        true,
      );
      const heading = yield* node(ctx, tree, "Diagnostics");
      yield* ctx.expectEqual(
        "aria-level reaches the tree",
        Option.getOrElse(heading.level, () => -1),
        2,
      );
      const progress = yield* node(ctx, tree, "Sync");
      yield* ctx.expectEqual(
        "aria-valuetext is the node's value",
        shown(progress.value),
        "42%",
      );

      const label = yield* node(ctx, tree, "Hello accessibility");
      yield* ctx.expectEqual(
        "a <text> is a Label node",
        Option.getOrElse(label.role, () => ""),
        "Label",
      );

      yield* ctx.expectEqual(
        "an aria-label without a role paints no node",
        Option.isNone(nodeNamed(tree, "silent")),
        true,
      );
      yield* ctx.expectEqual(
        "role=none paints no node",
        Option.isNone(nodeNamed(tree, "hidden by role")),
        true,
      );

      yield* ctx.expectEqual(
        "the window is in the tree",
        Arr.some(tree.nodes, (candidate) =>
          Option.contains(candidate.role, "Window"),
        ),
        true,
      );
    }),
};
