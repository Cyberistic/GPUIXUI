/**
 * `Text`'s clamp in the real GPUix runtime, and the layout cache it must not
 * depend on.
 *
 * **The bug this file guards (plan 082).** `Text.clamp` used to set the
 * runtime's `lineClamp`. That field is applied to the shaped text layout, and
 * the runtime keeps one layout per string/font/width for the whole window — so
 * whichever copy of an identical string is laid out first decides the clamp for
 * every other copy at that width. Measured before the fix: a clamped `Text`
 * followed by an unclamped copy of the same string painted **36 / 36 px** (the
 * plain text was silently clipped), and a plain copy followed by a clamped one
 * painted **108 / 108 px** (the clamp was ignored). The clamp is now the
 * element's own `maxHeight` + `overflow: hidden`, which no cache can share; the
 * trade is a hard cut with no ellipsis.
 *
 * Every case opens its own window (`fixture.tsx`), because the shared text
 * layout lives in the window itself — reusing one would hide the very leak this
 * suite measures.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Text } from "../src/components/Text.js";
import { a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const LINE = testTheme.typography.body.lineHeight;

const LONG =
  "The quick brown fox jumps over the lazy dog, and then it keeps running for a very long time.";

/** One text in a fixed-width column, so wrapping has one possible line count. */
const frame = (
  testId: string,
  text: string,
  props: { readonly clamp?: number; readonly truncate?: boolean } = {},
) => (
  <Box tone="none" style={{ width: 120 }} testId={testId}>
    <Text role="body" clamp={props.clamp} truncate={props.truncate}>
      {text}
    </Text>
  </Box>
);

const heightOf = (runtime: Runtime, testId: string): number =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  ).height;

it("clamps to the line count, and still truncates on one line", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      {frame("clamped", LONG, { clamp: 2 })}
      {frame("single", LONG, { clamp: 1 })}
      {frame("truncated", LONG, { truncate: true })}
    </Surface>,
  );
  expect(heightOf(runtime, "clamped")).toBe(2 * LINE);
  expect(heightOf(runtime, "single")).toBe(LINE);
  expect(heightOf(runtime, "truncated")).toBe(LINE);
});

/**
 * The direction that used to clip an innocent `Text`: a clamped copy is laid
 * out first, and the plain copy of the same string at the same width must keep
 * its full height.
 */
it("does not let a clamp leak to an identical unclamped text", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      {frame("clamped", LONG, { clamp: 2 })}
      {frame("plain", LONG)}
    </Surface>,
  );
  expect(heightOf(runtime, "clamped")).toBe(2 * LINE);
  expect(heightOf(runtime, "plain")).toBe(6 * LINE);
});

/**
 * The direction that used to ignore the clamp: the unclamped copy is laid out
 * first, and the clamped copy must still stop at two lines.
 */
it("clamps an identical text even when the plain copy came first", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      {frame("plain", LONG)}
      {frame("clamped", LONG, { clamp: 2 })}
    </Surface>,
  );
  expect(heightOf(runtime, "plain")).toBe(6 * LINE);
  expect(heightOf(runtime, "clamped")).toBe(2 * LINE);
});

it("caps the clamp at the role's own line height", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      {frame("two", LONG, { clamp: 2 })}
      {frame("three", LONG, { clamp: 3 })}
    </Surface>,
  );
  expect(heightOf(runtime, "two")).toBe(2 * LINE);
  expect(heightOf(runtime, "three")).toBe(3 * LINE);
  expect(heightOf(runtime, "three")).toBeGreaterThan(heightOf(runtime, "two"));
});

it("keeps the whole string in the accessibility tree when clamped", async () => {
  const runtime = await openWindow();
  runtime.render(<Surface>{frame("clamped", LONG, { clamp: 2 })}</Surface>);
  expect(a11yValueOf(runtime.a11y(), { role: "Label" })).toEqual(
    Option.some(LONG),
  );
});
