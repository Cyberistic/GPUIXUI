/**
 * `text-native` — `<text>`, `<code>` and `<markdown>`.
 *
 * The trap upstream documents: GPUI does not inherit `color`, so text with no
 * explicit colour paints black and vanishes on a dark surface. This scenario
 * sets a colour on every node and checks both text channels — `getAllText()`
 * sees `<text>`, and `getPaintedText()` sees what `<code>`/`<markdown>` paint
 * themselves.
 */
import { Effect } from "effect";
import * as Option from "effect/Option";
import { theme } from "../theme.js";
import type { PlaygroundScenario } from "../types.js";

const TextProbe = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 480 }}>
    <text testId="text-plain" style={{ color: theme.text }}>
      hello gpuix
    </text>
    <code
      testId="text-code"
      code="const a = 1"
      language="ts"
      style={{ color: theme.text }}
    />
    <markdown
      testId="text-markdown"
      source={"# Heading\n\npara"}
      style={{ color: theme.text }}
    />
  </div>
);

export const textScenario: PlaygroundScenario = {
  id: "text-native",
  title: "Native text: <text>, <code> and <markdown>",
  capability: "text",
  view: () => <TextProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const plain = yield* ctx.expectSome(
        "plain text present",
        Option.fromNullishOr(ctx.host.text("text-plain")),
      );
      yield* ctx.expectContains("plain text content", plain, "hello gpuix");

      const painted = ctx.host.paintedText().join("\n");
      yield* ctx.expectContains(
        "code paints its own text",
        painted,
        "const a = 1",
      );
      yield* ctx.expectContains(
        "markdown paints its own text",
        painted,
        "Heading",
      );
    }),
};
