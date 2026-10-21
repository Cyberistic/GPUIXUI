/**
 * Tier 5 probe: `editor-surface` — what an editor package can build on.
 *
 * The runtime ships the two halves of a code surface as host elements: a
 * `<textarea>` that edits, and a read-only `<code>` that paints highlighted
 * source at exact line heights. There is no caret or selection API, so the
 * honest editor is "edit in the textarea, display in the code view" — this probe
 * measures the editing contract that makes that possible and the display the
 * viewer gets for free:
 *
 * - Enter in a `<textarea>` with **no** `onSubmit` listener inserts a newline
 *   (the same field with a listener reports Enter instead, which is why an
 *   editor must not set one);
 * - the arrow keys move the native caret, proved by where the next typed
 *   character lands;
 * - `<code code language showLineNumbers>` paints its source, and `<diff patch>`
 *   paints both sides of a changed line.
 *
 * Everything a real editor needs on top — caret, selection, scroll sync and
 * inline decorations — has no runtime API; that is recorded as the gap rather
 * than worked around with a fake.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const SOURCE = [
  "const total = add(1, 2);",
  "export const doubled = total * 2;",
  "console.log(doubled);",
  "function add(a: number, b: number) {",
  "  return a + b;",
  "}",
  "const labels = ['one', 'two'];",
  "const joined = labels.join(', ');",
  "export const summary = { total, joined };",
  "console.log(summary);",
].join("\n");

const PATCH = [
  "diff --git a/count.ts b/count.ts",
  "--- a/count.ts",
  "+++ b/count.ts",
  "@@ -1 +1 @@",
  "-legacyCount(1);",
  "+modernCount(1);",
].join("\n");

const EditorProbe = () => {
  const theme = useTheme();
  const [value, setValue] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 620 }}>
      <Readout testId="editor-readout">
        {`value=${value.replace(/\n/g, "\\n")}`}
      </Readout>
      <textarea
        testId="editor-input"
        value={value}
        minRows={3}
        onChange={(event) => setValue(event.value ?? "")}
        style={{
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
          padding: 8,
        }}
      />
      <div
        testId="editor-code-view"
        style={{ height: 80, overflow: "scroll" }}
      >
        <code
          testId="editor-code"
          code={SOURCE}
          language="ts"
          showLineNumbers
          style={{ color: theme.colors.foreground }}
        />
      </div>
      <diff
        testId="editor-diff"
        patch={PATCH}
        wordDiff
        style={{ color: theme.colors.foreground }}
      />
    </div>
  );
};

export const editorScenario: ScenarioBody = {
  view: () => <EditorProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const read = (): string =>
        Option.getOrElse(
          Option.fromNullishOr(ctx.host.text("editor-readout")),
          () => "",
        );

      ctx.host.click("editor-input");
      ctx.host.key("ab");
      ctx.host.key("enter");
      ctx.host.key("cd");
      yield* ctx.expectEqual(
        "Enter in a textarea without onSubmit inserts a newline",
        read(),
        "value=ab\\ncd",
      );

      // The caret: two lefts from the end of `cd` put it before `c`, so the next
      // character lands there. A textarea that ignored the arrow keys would
      // produce `cdX`.
      ctx.host.key("left");
      ctx.host.key("left");
      ctx.host.key("X");
      yield* ctx.expectEqual(
        "the arrow keys move the native caret",
        read(),
        "value=ab\\nXcd",
      );

      // The read-only halves: highlighted source and a unified diff paint their
      // own text (they do not expose it through `getAllText`).
      const painted = ctx.host.paintedText().join("\n");
      yield* ctx.expectContains(
        "the code view paints its source",
        painted,
        "const total = add(1, 2);",
      );
      yield* ctx.expectContains(
        "the code view paints every line",
        painted,
        "console.log(doubled);",
      );
      yield* ctx.expectContains(
        "the diff paints the removed line",
        painted,
        "legacyCount(1);",
      );
      yield* ctx.expectContains(
        "the diff paints the added line",
        painted,
        "modernCount(1);",
      );

      // A long file scrolls in its own bounded viewport, which is what an editor
      // pane is: the code element is the scroller's content.
      ctx.host.wheel("editor-code-view", 0, -60);
      const offset = yield* ctx.expectSome(
        "the code viewport scrolls",
        Option.fromNullishOr(ctx.host.scrollOffset("editor-code-view")),
      );
      yield* ctx.expectEqual(
        "the wheel moved the code viewport",
        offset.y < 0,
        true,
      );
      yield* ctx.expectEqual(
        "the code viewport scrolls on its own axis only",
        offset.x,
        0,
      );
    }),
};
