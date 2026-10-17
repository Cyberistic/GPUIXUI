/**
 * Layout, type and scrolling in the real GPUix runtime.
 *
 * Every assertion here is on something the runtime produced — a painted box, a
 * `getElementBounds` measurement, a scroll offset, a string GPUI painted — not
 * on the `StyleDesc` a resolver returned. That distinction is the whole point of
 * this suite: `src/core/layout.test.ts` already proves the resolver's numbers,
 * and this proves the numbers survive layout.
 *
 * The frame and the theme are `fixture.tsx`'s, so a measurement is asserted
 * against the theme's own spacing step rather than a magic pixel.
 */

import { expect, it } from "vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Label } from "../src/components/Label.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Separator, Spacer } from "../src/components/Separator.js";
import { Grid, Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import type { Density } from "../src/core/theme.js";
import { createRuntime, type Bounds } from "./harness.js";
import { SURFACE, Surface, WINDOW, testTheme } from "./fixture.js";

const runtime = await Effect.runPromise(createRuntime(WINDOW));

const boundsOf = (testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const inner = { width: WINDOW.width - testTheme.spacing.lg * 2 } as const;

/** A card of an exact size, so a measurement has one unknown: the layout. */
const card = (testId: string, width: number, height: number) => (
  <Box tone="card" style={{ width, height }} testId={testId} />
);

it("pads the surface by the theme's spacing step", () => {
  runtime.render(
    <Surface>
      <Box tone="card" style={{ height: 20 }} testId="first" />
    </Surface>,
  );
  const frame = boundsOf(SURFACE);
  const first = boundsOf("first");
  expect(first.x - frame.x).toBe(testTheme.spacing.lg);
  expect(first.y - frame.y).toBe(testTheme.spacing.lg);
  expect(frame.width).toBe(WINDOW.width);
  expect(first.width).toBe(inner.width);
});

it("separates a row Stack's children by the theme's gap", () => {
  runtime.render(
    <Surface>
      <Stack direction="row" gap="md" testId="row">
        {card("a", 40, 20)}
        {card("b", 40, 20)}
      </Stack>
    </Surface>,
  );
  const row = boundsOf("row");
  const a = boundsOf("a");
  const b = boundsOf("b");
  expect(a.y).toBe(b.y);
  expect(a.x - row.x).toBe(0);
  expect(b.x - a.x).toBe(40 + testTheme.spacing.md);
});

it("stacks a column Stack's children by the theme's gap", () => {
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm" style={{ alignItems: "flex-start" }}>
        {card("a", 40, 20)}
        {card("b", 40, 20)}
      </Stack>
    </Surface>,
  );
  const a = boundsOf("a");
  const b = boundsOf("b");
  expect(a.x).toBe(b.x);
  expect(b.y - a.y).toBe(20 + testTheme.spacing.sm);
});

it("lays a Grid's children into equal columns and wraps to a new row", () => {
  runtime.render(
    <Surface>
      <Grid columns={2}>
        {card("a", 40, 20)}
        {card("b", 40, 20)}
        {card("c", 40, 20)}
      </Grid>
    </Surface>,
  );
  const a = boundsOf("a");
  const b = boundsOf("b");
  const c = boundsOf("c");
  expect(a.y).toBe(b.y);
  expect(b.x).toBeGreaterThan(a.x);
  expect(c.y).toBeGreaterThan(a.y);
});

it("draws a horizontal Separator as one border step across the surface", () => {
  runtime.render(
    <Surface>
      <Separator orientation="horizontal" />
    </Surface>,
  );
  const rule = Option.getOrElse(
    Option.flatMap(runtime.element(SURFACE), (surface) =>
      Option.map(Option.fromNullishOr(surface.children[0]), (id) =>
        runtime.boundsOfId(id),
      ),
    ),
    () => expect.fail("the surface painted no separator"),
  );
  const box = Option.getOrElse(rule, () =>
    expect.fail("the separator painted no box"),
  );
  expect(box.height).toBe(testTheme.borderWidth.thin);
  expect(box.width).toBe(inner.width);
});

it("lets a Spacer push its sibling to the far edge", () => {
  runtime.render(
    <Surface>
      <Stack direction="row">
        {card("a", 40, 20)}
        <Spacer />
        {card("b", 40, 20)}
      </Stack>
    </Surface>,
  );
  const a = boundsOf("a");
  const b = boundsOf("b");
  const frame = boundsOf(SURFACE);
  expect(b.x + b.width).toBe(frame.x + frame.width - testTheme.spacing.lg);
  expect(a.x - frame.x).toBe(testTheme.spacing.lg);
});

it("scrolls a ScrollArea by the wheel's delta", () => {
  runtime.render(
    <Surface>
      <ScrollArea axis="vertical" style={{ height: 60, width: 200 }} testId="s">
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  const before = Option.getOrElse(runtime.scrollOffset("s"), () =>
    expect.fail("the ScrollArea painted no scrollable box"),
  );
  expect(before.y).toBe(0);
  // GPUI's deltaY is negative to scroll down (plan 140 §4).
  runtime.wheel("s", 0, -100);
  const after = Option.getOrElse(runtime.scrollOffset("s"), () =>
    expect.fail("the ScrollArea lost its scroll offset"),
  );
  expect(after.y).toBe(-100);
  expect(after.x).toBe(0);
});

it("paints the type scale, not just the style", () => {
  runtime.render(
    <Surface>
      <Box tone="none" testId="h1">
        <Text role="h1">Heading</Text>
      </Box>
      <Box tone="none" testId="body">
        <Text role="body">Body copy</Text>
      </Box>
    </Surface>,
  );
  expect(runtime.allText()).toContain("Heading");
  const h1 = boundsOf("h1");
  const body = boundsOf("body");
  expect(h1.height).toBe(testTheme.typography.h1.lineHeight);
  expect(body.height).toBe(testTheme.typography.body.lineHeight);
  expect(h1.height).toBeGreaterThan(body.height);
});

it("paints a Label's name and its description", () => {
  runtime.render(
    <Surface>
      <Label description="Required before saving">Project name</Label>
    </Surface>,
  );
  expect(runtime.allText()).toContain("Project name");
  expect(runtime.allText()).toContain("Required before saving");
});

it("moves a control's height with density and keeps its colour", () => {
  const comfortable = {
    ...testTheme.density,
    name: "comfortable",
  } as const;
  const compact: Density = {
    name: "compact",
    controlHeight: { sm: 22, md: 26, lg: 30 },
    controlPaddingX: { sm: 6, md: 8, lg: 10 },
    rowHeight: 26,
  };
  const heights = (
    density: Density,
  ): { readonly height: number; readonly background: unknown } => {
    runtime.render(
      <Surface density={density}>
        <Stack direction="row">
          <Button testId="b">Save</Button>
        </Stack>
      </Surface>,
    );
    const box = boundsOf("b");
    const background = Option.flatMap(runtime.element("b"), (element) =>
      Option.fromNullishOr(element.style.backgroundColor),
    );
    return {
      height: box.height,
      background: Option.getOrUndefined(background),
    };
  };
  const before = heights(comfortable);
  const after = heights(compact);
  expect(before.height).toBe(comfortable.controlHeight.md);
  expect(after.height).toBe(compact.controlHeight.md);
  expect(after.height).toBeLessThan(before.height);
  expect(after.background).toBe(before.background);
});
