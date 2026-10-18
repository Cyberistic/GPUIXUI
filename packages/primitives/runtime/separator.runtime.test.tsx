/**
 * The rule's cross-axis contract, measured in the real renderer.
 *
 * The bug this guards (plan `381`): a separator painted only its thick axis and
 * left the cross axis auto, so the parent's `align` decided whether the rule had
 * any extent at all. Measured before the fix: a vertical rule in a row with
 * `align="start"`, `"center"` or `"end"` painted `w 1, h 0` (invisible), and a
 * horizontal rule in a column with the same aligns painted `w 0, h 1`. The
 * default (stretch) row and `baseline` worked, which is why the one existing
 * runtime case never caught it.
 *
 * A rule now fills the stack's cross axis. The cases below cover the axis-aligned
 * stacks (three alignments each), the labelled composition whose rules keep a
 * definite height, `inset`, the caller's override, and the two orientation
 * mistakes that are documented rather than invented into a size.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Separator } from "../src/components/Separator.js";
import { Stack } from "../src/components/Stack.js";
import type { StackAlign } from "../src/core/layout.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, WINDOW, openWindow, testTheme } from "./fixture.js";

/** The frame's inner width: the extent a horizontal rule must fill. */
const ROOM = WINDOW.width - testTheme.spacing.lg * 2;

/** The sibling height a vertical rule must match. */
const ROW = 40;

const THIN = testTheme.borderWidth.thin;

const boundsOfId = (runtime: Runtime, id: number): Bounds =>
  Option.getOrElse(runtime.boundsOfId(id), () =>
    expect.fail(`the runtime painted no box for element ${id}`),
  );

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const COLUMN_ALIGNS: ReadonlyArray<StackAlign> = ["start", "center", "end"];
const ROW_ALIGNS: ReadonlyArray<StackAlign> = [
  "start",
  "center",
  "end",
  "baseline",
];

it.each(COLUMN_ALIGNS)(
  "fills a column's width under align=%s",
  async (align) => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <Stack direction="column" align={align}>
          <Box tone="card" style={{ width: 40, height: 20 }} testId="a" />
          <Separator orientation="horizontal" testId="rule" />
        </Stack>
      </Surface>,
    );
    const rule = boundsOf(runtime, "rule");
    expect(rule.width).toBe(ROOM);
    expect(rule.height).toBe(THIN);
  },
);

it.each(ROW_ALIGNS)("fills a row's height under align=%s", async (align) => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" align={align}>
        <Box tone="card" style={{ width: ROW, height: ROW }} testId="a" />
        <Separator orientation="vertical" testId="rule" />
      </Stack>
    </Surface>,
  );
  const rule = boundsOf(runtime, "rule");
  expect(rule.height).toBe(ROW);
  expect(rule.width).toBe(THIN);
});

it("paints no width for a horizontal rule inside a row", async () => {
  // A rule laid along its stack's axis has no cross extent to fill. The page
  // states this orientation rule; the case keeps a later "fix" from inventing a
  // width the caller never asked for.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Box tone="card" style={{ width: 40, height: 20 }} testId="a" />
        <Separator orientation="horizontal" testId="rule" />
      </Stack>
    </Surface>,
  );
  expect(boundsOf(runtime, "rule")).toStrictEqual({
    x: expect.any(Number),
    y: expect.any(Number),
    width: 0,
    height: THIN,
  });
});

it("paints no height for a vertical rule inside a column", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Separator orientation="vertical" testId="rule" />
        <Box tone="card" style={{ width: 40, height: 20 }} testId="a" />
      </Stack>
    </Surface>,
  );
  expect(boundsOf(runtime, "rule")).toStrictEqual({
    x: expect.any(Number),
    y: expect.any(Number),
    width: THIN,
    height: 0,
  });
});

it("keeps a labelled separator's rules one border tall", async () => {
  // The composition centres its children, so stretch could take the rules to
  // the caption's line height. Their definite `height` must win.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" align="center">
        <Separator orientation="horizontal" label="Advanced" testId="sep" />
      </Stack>
    </Surface>,
  );
  const root = Option.getOrElse(runtime.element("sep"), () =>
    expect.fail("the labelled separator painted no root"),
  );
  const rules = Arr.flatMap(root.children, (id) =>
    Option.match(Option.fromNullishOr(runtime.renderer.getElement(id)), {
      onNone: () => [],
      onSome: (child) =>
        child.type === "div" ? [boundsOfId(runtime, id)] : [],
    }),
  );
  expect(rules).toHaveLength(2);
  expect(Arr.map(rules, (rule) => rule.height)).toStrictEqual([THIN, THIN]);
  expect(rules[0]?.y).toBe(rules[1]?.y);
});

it("subtracts an inset from the stretched length", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" align="center">
        <Box tone="card" style={{ width: ROW, height: ROW }} testId="a" />
        <Separator orientation="vertical" inset="sm" testId="rule" />
      </Stack>
    </Surface>,
  );
  expect(boundsOf(runtime, "rule").height).toBe(ROW - 2 * testTheme.spacing.sm);
});

it("lets a caller's style win over the stretch", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" align="center">
        <Separator
          orientation="horizontal"
          testId="rule"
          style={{ alignSelf: "center", width: 120 }}
        />
      </Stack>
    </Surface>,
  );
  expect(boundsOf(runtime, "rule").width).toBe(120);
});
