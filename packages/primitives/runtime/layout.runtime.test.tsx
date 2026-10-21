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
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Label } from "../src/components/Label.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Separator, Spacer } from "../src/components/Separator.js";
import { Grid, Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import type { Density } from "../src/core/theme.js";
import type { Bounds, Runtime } from "./harness.js";
import { SURFACE, Surface, WINDOW, openWindow, testTheme } from "./fixture.js";

const next = { width: WINDOW.width - testTheme.spacing.lg * 2 } as const;

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** A card of an exact size, so a measurement has one unknown: the layout. */
const card = (testId: string, width: number, height: number) => (
  <Box tone="card" style={{ width, height }} testId={testId} />
);

it("pads the surface by the theme's spacing step", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box tone="card" style={{ height: 20 }} testId="first" />
    </Surface>,
  );
  const frame = boundsOf(runtime, SURFACE);
  const first = boundsOf(runtime, "first");
  expect(first.x - frame.x).toBe(testTheme.spacing.lg);
  expect(first.y - frame.y).toBe(testTheme.spacing.lg);
  expect(frame.width).toBe(WINDOW.width);
  expect(first.width).toBe(next.width);
});

it("separates a row Stack's children by the theme's gap", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" gap="md" testId="row">
        {card("a", 40, 20)}
        {card("b", 40, 20)}
      </Stack>
    </Surface>,
  );
  const row = boundsOf(runtime, "row");
  const a = boundsOf(runtime, "a");
  const b = boundsOf(runtime, "b");
  expect(a.y).toBe(b.y);
  expect(a.x - row.x).toBe(0);
  expect(b.x - a.x).toBe(40 + testTheme.spacing.md);
});

it("stacks a column Stack's children by the theme's gap", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm" style={{ alignItems: "flex-start" }}>
        {card("a", 40, 20)}
        {card("b", 40, 20)}
      </Stack>
    </Surface>,
  );
  const a = boundsOf(runtime, "a");
  const b = boundsOf(runtime, "b");
  expect(a.x).toBe(b.x);
  expect(b.y - a.y).toBe(20 + testTheme.spacing.sm);
});

it("lays a Grid's children into equal columns and wraps to a new row", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Grid columns={2}>
        {card("a", 40, 20)}
        {card("b", 40, 20)}
        {card("c", 40, 20)}
      </Grid>
    </Surface>,
  );
  const a = boundsOf(runtime, "a");
  const b = boundsOf(runtime, "b");
  const c = boundsOf(runtime, "c");
  expect(a.y).toBe(b.y);
  expect(b.x).toBeGreaterThan(a.x);
  expect(c.y).toBeGreaterThan(a.y);
});

it("draws a horizontal Separator as one border step across the surface", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Separator orientation="horizontal" />
    </Surface>,
  );
  const rule = Option.getOrElse(
    Option.flatMap(runtime.element(SURFACE), (surface) =>
      Option.flatMap(Option.fromNullishOr(surface.children[0]), (id) =>
        runtime.boundsOfId(id),
      ),
    ),
    () => expect.fail("the surface painted no separator"),
  );
  expect(rule.height).toBe(testTheme.borderWidth.thin);
  expect(rule.width).toBe(next.width);
});

it("lets a Spacer push its sibling to the far edge", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        {card("a", 40, 20)}
        <Spacer />
        {card("b", 40, 20)}
      </Stack>
    </Surface>,
  );
  const a = boundsOf(runtime, "a");
  const b = boundsOf(runtime, "b");
  const frame = boundsOf(runtime, SURFACE);
  expect(b.x + b.width).toBe(frame.x + frame.width - testTheme.spacing.lg);
  expect(a.x - frame.x).toBe(testTheme.spacing.lg);
});

it("scrolls a ScrollArea by the wheel's delta", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        viewportTestId="s"
      >
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

it("forwards a ScrollArea's scroll deltas to the caller", async () => {
  const runtime = await openWindow();
  const deltas: number[] = [];
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        viewportTestId="s"
        onScroll={(event) => deltas.push(event.deltaY ?? 0)}
      >
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  runtime.wheel("s", 0, -100);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  expect(deltas).toContain(-100);
});

it("tints and sizes the platform's scrollbar", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        viewportTestId="s"
        scrollbarWidth={9}
      >
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  const scroller = Option.getOrElse(runtime.element("s"), () =>
    expect.fail("the ScrollArea painted no viewport"),
  );
  const style = Option.getOrElse(
    Option.map(
      Option.fromNullishOr(runtime.renderer.getElement(scroller.id)),
      (element) => element.style,
    ),
    () => expect.fail("the viewport vanished"),
  );
  expect(style["scrollbarColor"]).toBe(testTheme.colors.scrollbar);
  expect(style["scrollbarWidth"]).toBe(9);
});

it("paints the type scale, not just the style", async () => {
  const runtime = await openWindow();
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
  const h1 = boundsOf(runtime, "h1");
  const body = boundsOf(runtime, "body");
  expect(h1.height).toBe(testTheme.typography.h1.lineHeight);
  expect(body.height).toBe(testTheme.typography.body.lineHeight);
  expect(h1.height).toBeGreaterThan(body.height);
});

it("addresses a Text element by the testId the caller gave it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Text role="caption" testId="caption">
        Note
      </Text>
    </Surface>,
  );
  expect(Option.isSome(runtime.element("caption"))).toBe(true);
  expect(runtime.allText()).toContain("Note");
});

it("paints a Label's name and its description", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Label description="Required before saving">Project name</Label>
    </Surface>,
  );
  expect(runtime.allText()).toContain("Project name");
  expect(runtime.allText()).toContain("Required before saving");
});

it("moves a control's height with density and keeps its colour", async () => {
  const compact: Density = {
    name: "compact",
    controlHeight: { sm: 22, md: 26, lg: 30 },
    controlPaddingX: { sm: 6, md: 8, lg: 10 },
    rowHeight: 26,
  };
  const measure = async (
    density: Density,
  ): Promise<{ readonly height: number; readonly background: unknown }> => {
    const runtime = await openWindow();
    runtime.render(
      <Surface density={density}>
        <Stack direction="row">
          <Button testId="b">Save</Button>
        </Stack>
      </Surface>,
    );
    return {
      height: boundsOf(runtime, "b").height,
      background: Option.getOrUndefined(
        Option.flatMap(runtime.element("b"), (element) =>
          Option.fromNullishOr(element.style.backgroundColor),
        ),
      ),
    };
  };
  const comfortable = await measure(testTheme.density);
  const tight = await measure(compact);
  expect(comfortable.height).toBe(testTheme.density.controlHeight.md);
  expect(tight.height).toBe(compact.controlHeight.md);
  expect(tight.height).toBeLessThan(comfortable.height);
  // Density moves numbers, never colour.
  expect(tight.background).toBe(comfortable.background);
});
