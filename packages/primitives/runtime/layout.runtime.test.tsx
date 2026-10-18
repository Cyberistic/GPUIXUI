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

import { createRef } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import {
  ScrollArea,
  type ScrollAreaHandle,
} from "../src/components/ScrollArea.js";
import { Separator, Spacer } from "../src/components/Separator.js";
import { Grid, Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import type { Density } from "../src/core/theme.js";
import {
  a11yNode,
  a11yNodes,
  type Bounds,
  type Runtime,
} from "../src/testing/index.js";
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

it("forwards a ScrollArea's scroll deltas to the caller", async () => {
  const runtime = await openWindow();
  const deltas: number[] = [];
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        testId="s"
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

/** A labelled scroll region with 600 px of content in a 120 px viewport. */
const scrollScene = (props: {
  readonly axis?: "vertical" | "horizontal" | "both";
  readonly label?: string;
}) => (
  <Surface>
    <ScrollArea
      axis={props.axis ?? "vertical"}
      label={props.label}
      style={{ height: 120, width: 300 }}
      testId="s"
    >
      <Box tone="card" style={{ width: 600, height: 600 }} testId="tall" />
    </ScrollArea>
  </Surface>
);

const offsetOf = (runtime: Runtime) =>
  Option.getOrElse(runtime.scrollOffset("s"), () =>
    expect.fail("the ScrollArea painted no scrollable box"),
  );

it("scrolls a labelled ScrollArea with the keyboard", async () => {
  // The bug guarded: the runtime never scrolled a container from the keyboard
  // and focus does not bubble from a child, so a wheel was the only way to move
  // one (plan 072 §1). The label is what makes the region a scroll stop.
  const runtime = await openWindow();
  runtime.render(scrollScene({ label: "Properties" }));
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("s");
  // The region's name reaches assistive technology, not just the prop.
  expect(Option.isSome(a11yNode(runtime.a11y(), { role: "Region" }))).toBe(
    true,
  );
  const ring = Option.flatMap(runtime.element("s"), (element) =>
    Option.fromNullishOr(element.style.boxShadow),
  );
  expect(Option.isSome(ring)).toBe(true);
  runtime.keyDown("s", "pagedown");
  const page = offsetOf(runtime);
  expect(page.y).toBeLessThan(0);
  runtime.keyDown("s", "home");
  expect(offsetOf(runtime).y).toBe(0);
  // The runtime clamps End to the content's end: 600 px of content minus the
  // 120 px viewport.
  runtime.keyDown("s", "end");
  expect(offsetOf(runtime).y).toBe(-480);
});

it("moves one line per arrow key, and only on the scrolled axis", async () => {
  const runtime = await openWindow();
  runtime.render(scrollScene({ label: "Properties" }));
  runtime.keyDown("s", "down");
  const line = 3 * testTheme.typography.body.lineHeight;
  expect(offsetOf(runtime).y).toBe(-line);
  runtime.keyDown("s", "right");
  expect(offsetOf(runtime).x).toBe(0);
});

it("scrolls a horizontal area with Left/Right only", async () => {
  const runtime = await openWindow();
  runtime.render(scrollScene({ axis: "horizontal", label: "Columns" }));
  runtime.keyDown("s", "right");
  const line = 3 * testTheme.typography.body.lineHeight;
  expect(offsetOf(runtime).x).toBe(-line);
  runtime.keyDown("s", "down");
  expect(offsetOf(runtime)).toStrictEqual({ x: -line, y: 0 });
});

it("does not make an unlabelled ScrollArea a tab stop", async () => {
  const runtime = await openWindow();
  runtime.render(scrollScene({}));
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBeUndefined();
  runtime.keyDown("s", "pagedown");
  expect(offsetOf(runtime).y).toBe(0);
});

it("reports an absolute position after a wheel scroll", async () => {
  const runtime = await openWindow();
  const positions: Array<{ readonly x: number; readonly y: number }> = [];
  const deltas: number[] = [];
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        testId="s"
        onScroll={(event) => deltas.push(event.deltaY ?? 0)}
        onScrollPositionChange={(position) => positions.push(position)}
      >
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  runtime.wheel("s", 0, -100);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  // The raw delta still reaches onScroll; the position is the runtime's own.
  expect(deltas).toContain(-100);
  expect(positions).toStrictEqual([{ x: 0, y: -100 }]);
});

it("reports the clamped position after a keyboard scroll", async () => {
  // The bug guarded (plan 337): a scroll this component performs itself
  // dispatches no `onScroll` at all, so a consumer accumulating deltas never
  // hears about a keyboard move — and `End` would report a computed target,
  // not the offset the runtime actually clamped to.
  const runtime = await openWindow();
  const positions: Array<{ readonly x: number; readonly y: number }> = [];
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        label="Properties"
        style={{ height: 120, width: 300 }}
        testId="s"
        onScrollPositionChange={(position) => positions.push(position)}
      >
        <Box tone="card" style={{ width: 600, height: 600 }} testId="tall" />
      </ScrollArea>
    </Surface>,
  );
  runtime.focusNext();
  runtime.keyDown("s", "pagedown");
  const page = offsetOf(runtime);
  expect(page.y).toBeLessThan(0);
  runtime.keyDown("s", "home");
  runtime.keyDown("s", "end");
  expect(positions).toStrictEqual([page, { x: 0, y: 0 }, { x: 0, y: -480 }]);
});

it("does not report a position that did not change", async () => {
  const runtime = await openWindow();
  const positions: Array<{ readonly x: number; readonly y: number }> = [];
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        label="Properties"
        style={{ height: 120, width: 300 }}
        testId="s"
        onScrollPositionChange={(position) => positions.push(position)}
      >
        <Box tone="card" style={{ width: 600, height: 600 }} testId="tall" />
      </ScrollArea>
    </Surface>,
  );
  runtime.focusNext();
  // Already at the top: a positive delta and Home cannot move it.
  runtime.wheel("s", 0, 100);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  runtime.keyDown("s", "home");
  expect(positions).toStrictEqual([]);
});

it("reports a position for an unlabelled area", async () => {
  const runtime = await openWindow();
  const positions: Array<{ readonly x: number; readonly y: number }> = [];
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        testId="s"
        onScrollPositionChange={(position) => positions.push(position)}
      >
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  runtime.wheel("s", 0, -100);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  expect(positions).toStrictEqual([{ x: 0, y: -100 }]);
});

it("moves a ScrollArea through its handle and reports where it landed", async () => {
  const runtime = await openWindow();
  const positions: Array<{ readonly x: number; readonly y: number }> = [];
  const area = createRef<ScrollAreaHandle>();
  runtime.render(
    <Surface>
      <ScrollArea
        axis="both"
        label="Properties"
        style={{ height: 120, width: 300 }}
        testId="s"
        ref={area}
        onScrollPositionChange={(position) => positions.push(position)}
      >
        <Box tone="card" style={{ width: 600, height: 600 }} testId="tall" />
      </ScrollArea>
    </Surface>,
  );
  const handle = Option.getOrElse(Option.fromNullishOr(area.current), () =>
    expect.fail("the ScrollArea exposed no handle"),
  );
  expect(handle.element?.id).toBe(
    Option.getOrUndefined(runtime.element("s"))?.id,
  );
  handle.scrollTo({ y: -100 });
  expect(offsetOf(runtime)).toStrictEqual({ x: 0, y: -100 });
  // An omitted axis keeps its current offset; the runtime clamps the rest.
  handle.scrollTo({ x: -20 });
  expect(offsetOf(runtime)).toStrictEqual({ x: -20, y: -100 });
  handle.scrollTo({ y: -100000 });
  expect(offsetOf(runtime)).toStrictEqual({ x: -20, y: -480 });
  expect(positions).toStrictEqual([
    { x: 0, y: -100 },
    { x: -20, y: -100 },
    { x: -20, y: -480 },
  ]);
});

it("keeps an Input's arrow keys when the field is inside the region", async () => {
  // The handler compares the runtime's focused id with the region's own, so a
  // focused field keeps its arrows instead of scrolling its container (plan 072).
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        label="Properties"
        style={{ height: 120, width: 300 }}
        testId="s"
      >
        <Input testId="field" label="Name" autoFocus />
        {card("tall", 300, 600)}
      </ScrollArea>
    </Surface>,
  );
  runtime.type("a b c");
  runtime.keyDown("field", "down");
  expect(Option.getOrUndefined(runtime.focused())).toBe("field");
  expect(offsetOf(runtime).y).toBe(0);
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

it("exposes heading and code semantics from the type role", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Text role="h1">Page title</Text>
      <Text role="h2">Section</Text>
      <Text role="code">inline()</Text>
      <Text role="body">Plain copy</Text>
    </Surface>,
  );
  const node = (role: string, value: string) =>
    Option.getOrElse(
      Arr.findFirst(
        a11yNodes(runtime.a11y()),
        (candidate) =>
          candidate.aria?.role === role && candidate.aria?.value === value,
      ),
      () => expect.fail(`no ${role} node with the value ${value}`),
    ).aria;
  expect(node("Heading", "Page title")?.level).toBe(1);
  expect(node("Heading", "Section")?.level).toBe(2);
  expect(node("Code", "inline()")?.role).toBe("Code");
  expect(node("Label", "Plain copy")?.role).toBe("Label");
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

it("paints a two-stop gradient passed through a Box's style", async () => {
  // The bug guarded (plan 342): box.mdx said `StyleDesc` "supports solid roles
  // only", but 0.10.0 accepts a two-stop `background` gradient. The renderer
  // reports the authored object back, so a component that dropped `background`
  // from the caller's style would fail here.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="none"
        padding="lg"
        testId="gradient"
        style={{
          background: {
            type: "linear-gradient",
            angle: 90,
            stops: [
              { color: testTheme.colors.primary, position: 0 },
              { color: testTheme.colors.accent, position: 1 },
            ],
          },
        }}
      />
    </Surface>,
  );
  const background = Option.getOrUndefined(
    Option.flatMap(runtime.element("gradient"), (element) =>
      Option.fromNullishOr(element.style.background),
    ),
  );
  expect(background).toMatchObject({
    type: "linear-gradient",
    angle: 90,
    stops: [
      { color: testTheme.colors.primary, position: 0 },
      { color: testTheme.colors.accent, position: 1 },
    ],
  });
});
