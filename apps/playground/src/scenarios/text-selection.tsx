/**
 * `text-selection` — native selection across text, code and diff.
 *
 * The log viewer's copy, a code block and a diff all promise selectable text,
 * with chrome (line numbers, markers, file and hunk headers) excluded, and
 * `userSelect: "none"` opting a subtree out. The runtime is the only place to
 * prove that. `dragSelect` flushes between steps because selection listeners are
 * registered during paint, so a hand-rolled drag selects nothing.
 *
 * Measured facts: plan `163` §8.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import type { PlaygroundScenario } from "../types.js";

const PATCH = [
  "diff --git a/example.ts b/example.ts",
  "--- a/example.ts",
  "+++ b/example.ts",
  "@@ -1,2 +1,2 @@",
  "-const removed = 1",
  "+const added = 1",
].join("\n");

const SelectionProbe = () => {
  const theme = useTheme();
  const label = { color: theme.colors.foreground };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        padding: 8,
        width: 620,
        backgroundColor: theme.colors.background,
      }}
    >
      <text testId="select-heading" style={label}>
        Selection heading
      </text>
      <text testId="select-body-1" style={label}>
        first line
      </text>
      <text testId="select-body-2" style={label}>
        second line
      </text>
      <div style={{ userSelect: "none" }}>
        <text testId="select-toolbar" style={label}>
          toolbar chrome
        </text>
      </div>
      <text testId="select-after" style={label}>
        after toolbar
      </text>
      <code
        testId="select-code"
        code={"alpha();\nbeta();"}
        language="ts"
        showLineNumbers
        style={label}
      />
      <text testId="select-before-diff" style={label}>
        before diff
      </text>
      <diff
        testId="select-diff"
        patch={PATCH}
        style={{ width: 600, ...label }}
      />
    </div>
  );
};

/** The selected text, treating `null` as empty. */
const selection = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.selectedText()), () => "");

/** Selects `from` to `to` and returns the renderer's selection as a string. */
const select = (ctx: Smoke.SmokeContext, from: string, to: string): string =>
  Option.getOrElse(
    Option.fromNullishOr(ctx.host.selectText(from, to)),
    () => "",
  );

export const textSelectionScenario: PlaygroundScenario = {
  id: "text-selection",
  title: "Text selection: across elements, code, diff and chrome",
  capability: "selection",
  view: () => <SelectionProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const all = select(ctx, "select-heading", "select-body-2");
      yield* ctx.expectContains(
        "the heading is selected",
        all,
        "Selection heading",
      );
      yield* ctx.expectContains(
        "the first body line is selected",
        all,
        "first line",
      );
      yield* ctx.expectContains(
        "the second body line is selected",
        all,
        "second line",
      );

      const anchoredInChrome = select(ctx, "select-toolbar", "select-after");
      yield* ctx.expectEqual(
        "a drag anchored in userSelect none selects nothing",
        anchoredInChrome,
        "",
      );

      const skipped = select(ctx, "select-body-2", "select-after");
      yield* ctx.expectContains(
        "the text before the toolbar is selected",
        skipped,
        "second line",
      );
      yield* ctx.expectContains(
        "the text after the toolbar is selected",
        skipped,
        "after toolbar",
      );
      yield* ctx.expectEqual(
        "userSelect none is excluded from the selection",
        Str.includes("toolbar chrome")(skipped),
        false,
      );

      const code = select(ctx, "select-code", "select-code");
      yield* ctx.expectContains("the code is selectable", code, "alpha();");
      yield* ctx.expectContains(
        "every code line is selectable",
        code,
        "beta();",
      );
      yield* ctx.expectEqual(
        "line numbers stay out of the selection",
        Str.includes("1")(code) || Str.includes("2")(code),
        false,
      );

      const diff = select(ctx, "select-before-diff", "select-diff");
      yield* ctx.expectContains(
        "the added diff line is selectable",
        diff,
        "const added = 1",
      );
      yield* ctx.expectContains(
        "the removed diff line is selectable",
        diff,
        "const removed = 1",
      );
      yield* ctx.expectEqual(
        "the diff file header stays out of the selection",
        Str.includes("example.ts")(diff),
        false,
      );
      yield* ctx.expectEqual(
        "the diff hunk header stays out of the selection",
        Str.includes("@@")(diff),
        false,
      );

      ctx.host.clearSelection();
      yield* ctx.expectEqual(
        "clearSelection empties the selection",
        selection(ctx),
        "",
      );

      ctx.host.click("select-body-1");
      yield* ctx.expectEqual("a click does not select", selection(ctx), "");
    }),
};
