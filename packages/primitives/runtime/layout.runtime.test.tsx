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
import type { PublicInstance } from "@gpuix/react";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import {
  ScrollArea,
  ScrollAreaViewport,
  DEFAULT_SCROLL_NAME,
} from "../src/components/ScrollArea.js";
import { Separator, Spacer } from "../src/components/Separator.js";
import { Grid, Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import type { Density } from "../src/core/theme.js";
import { a11yNode, type Bounds, type Runtime } from "./harness.js";
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

it("pads each axis by the step it was given, and paints the edge it was given", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="card"
        padding="lg"
        paddingX="sm"
        paddingY="md"
        border
        borderStyle="dashed"
        aspectRatio={2}
        style={{ width: 200 }}
        testId="dashed"
      >
        <Box tone="none" style={{ height: 10 }} testId="inner" />
      </Box>
    </Surface>,
  );
  const outer = boundsOf(runtime, "dashed");
  const inner = boundsOf(runtime, "inner");
  // The frame's border sits outside the padding, so both offsets include it.
  const edge = testTheme.borderWidth.thin;
  expect(inner.x - outer.x).toBe(testTheme.spacing.sm + edge);
  expect(inner.y - outer.y).toBe(testTheme.spacing.md + edge);
  expect(outer.width - (inner.x - outer.x) - inner.width).toBe(
    testTheme.spacing.sm + edge,
  );
  // A ratio of 2 fills the axis without a definite size: 200 wide → 100 tall.
  expect(outer.width).toBe(200);
  expect(outer.height).toBe(100);
  const element = Option.getOrElse(runtime.element("dashed"), () =>
    expect.fail("the runtime painted no box for dashed"),
  );
  expect(element.style.borderStyle).toBe("dashed");
  expect(element.style.aspectRatio).toBe(2);
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
  // GPUI's deltaY is negative to scroll down (measured on 0.11.0).
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

it("scrolls a focused ScrollArea with the keyboard", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        viewportTestId="s"
        label="Rows"
      >
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  runtime.keyDown("s", "down");
  expect(runtime.focused()).toStrictEqual(Option.some("s"));
  const row = testTheme.density.rowHeight;
  expect(runtime.scrollOffset("s")).toStrictEqual(
    Option.some({ x: 0, y: -row }),
  );
  runtime.keyDown("s", "pagedown");
  expect(runtime.scrollOffset("s")).toStrictEqual(
    Option.some({ x: 0, y: -(row + 60) }),
  );
  runtime.keyDown("s", "home");
  expect(runtime.scrollOffset("s")).toStrictEqual(Option.some({ x: 0, y: 0 }));
  // End is an overshoot the runtime clamps to the content's end (400 - 60).
  runtime.keyDown("s", "end");
  expect(runtime.scrollOffset("s")).toStrictEqual(
    Option.some({ x: 0, y: -340 }),
  );
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "Group", label: "Rows" })),
  ).toBe(true);
});

it("declares the keyboard ring on the scroll region that takes the stop", async () => {
  // The bug guarded: the viewport is a tab stop with a keyboard contract
  // (arrows, PageUp/PageDown, Home/End) and was the one focusable primitive in
  // the package with no `focusVisible` declaration — so a keyboard reader who
  // Tabbed into a scroller had no cue that the focus had moved. The runtime
  // paints the outline only on an element that declares it.
  const runtime = await openWindow();
  const declaresRing = (): boolean =>
    Option.match(runtime.element("s"), {
      onNone: () => false,
      onSome: (element) => {
        const style = runtime.renderer.getElement(element.id)?.style;
        return style !== undefined && Object.hasOwn(style, "focusVisible");
      },
    });
  const area = (focusable: boolean) => (
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        viewportTestId="s"
        label="Rows"
        focusable={focusable}
      >
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>
  );

  runtime.render(area(true));
  expect(declaresRing()).toBe(true);
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("s"));

  // `focusable={false}` removes the stop, so it owes neither the ring nor the
  // cue — the same split every other focusable primitive uses.
  runtime.render(area(false));
  expect(declaresRing()).toBe(false);
});

it("leaves a field's own arrow keys alone inside a ScrollArea", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 120, width: 240 }}
        viewportTestId="s"
      >
        <Input label="Note" testId="field" />
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  runtime.keyDown("field", "down");
  expect(runtime.focused()).toStrictEqual(Option.some("field"));
  expect(runtime.scrollOffset("s")).toStrictEqual(Option.some({ x: 0, y: 0 }));
});

it("reports a ScrollArea's absolute offset, whatever moved it", async () => {
  const runtime = await openWindow();
  const offsets: number[] = [];
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        viewportTestId="s"
        onScrollChange={(event) => offsets.push(event.scrollY ?? 0)}
      >
        {card("tall", 200, 400)}
      </ScrollArea>
    </Surface>,
  );
  runtime.keyDown("s", "pagedown");
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  expect(offsets).toContain(-60);
});

it("hands a caller the scroller it can restore", async () => {
  // The bug guarded: `onScrollChange` reports where a scroller is, and the page
  // told a caller to keep it "for a restored offset" — while the area handed
  // out no way to set one. Only the renderer moves a scroller, by element id,
  // and the element was private. `viewportRef` is that handle, and a
  // Back-to-top action proves it is the scroller rather than the frame.
  const runtime = await openWindow();
  const offsets: number[] = [];
  // A seat the ref writes into: a closure assignment does not narrow a local,
  // so the element is read from a property instead.
  const held: { current: PublicInstance | null } = { current: null };
  const backToTop = (): void => {
    const scroller = held.current;
    if (scroller !== null) runtime.renderer.scrollTo(scroller.id, 0, 0);
  };
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        viewportTestId="s"
        viewportRef={(instance) => {
          held.current = instance;
        }}
        onScrollChange={(event) => offsets.push(event.scrollY ?? 0)}
      >
        {card("tall", 200, 400)}
      </ScrollArea>
      <Button label="Back to top" testId="top" onActivate={backToTop} />
    </Surface>,
  );
  const instance = Option.getOrElse(Option.fromNullishOr(held.current), () =>
    expect.fail("the area handed no viewport to its viewportRef"),
  );
  // The id the caller holds is the scrollable element: the runtime reports an
  // offset for it, which the frame around it does not have.
  runtime.renderer.scrollTo(instance.id, 0, -120);
  runtime.renderer.flush();
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  expect(runtime.renderer.getScrollOffset(instance.id)).toStrictEqual([
    0, -120,
  ]);
  expect(offsets).toContain(-120);
  runtime.click("top");
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  expect(runtime.scrollOffset("s")).toStrictEqual(Option.some({ x: 0, y: 0 }));
  expect(offsets).toContain(0);
});

it("composes a caller's ref with the viewport's own keyboard handle", async () => {
  // The merge must not trade one for the other: a composed viewport that hands
  // its element to the caller still consumes the scroll keys.
  const runtime = await openWindow();
  const held: { current: PublicInstance | null } = { current: null };
  runtime.render(
    <Surface>
      <ScrollArea
        axis="vertical"
        style={{ height: 60, width: 200 }}
        label="Rows"
      >
        <ScrollAreaViewport
          testId="s"
          ref={(instance) => {
            held.current = instance;
          }}
        >
          {card("tall", 200, 400)}
        </ScrollAreaViewport>
      </ScrollArea>
    </Surface>,
  );
  const instance = Option.getOrElse(Option.fromNullishOr(held.current), () =>
    expect.fail("the composed viewport handed no element"),
  );
  const painted = Option.getOrElse(runtime.element("s"), () =>
    expect.fail("the composed viewport painted no element"),
  );
  expect(instance.id).toBe(painted.id);
  runtime.keyDown("s", "down");
  expect(runtime.scrollOffset("s")).toStrictEqual(
    Option.some({ x: 0, y: -testTheme.density.rowHeight }),
  );
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

it("announces the scroll region that takes the tab stop", async () => {
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
  // GPUix builds an accessibility node only for an element with a role, so an
  // unnamed viewport was a tab stop the tree could not hold: measured on
  // 0.11.0, the window had 12 tab stops and 11 nodes. The region is a named
  // group now; `label` replaces the default name.
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Group", label: DEFAULT_SCROLL_NAME }),
    () =>
      expect.fail("the unnamed scroll region reached no accessibility node"),
  );
  expect(node.aria?.on_action).toContain("Focus");
});

it("publishes a heading's level, and leaves body copy plain", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Text role="h1">Title</Text>
        <Text role="h3">Section</Text>
        <Text role="body">Body</Text>
      </Stack>
    </Surface>,
  );
  const dump = runtime.a11y();
  const h1 = Option.getOrElse(
    a11yNode(dump, { role: "Heading", label: "Title" }),
    () => expect.fail("the h1 was not announced as a heading"),
  );
  expect(h1.aria?.level).toBe(1);
  const h3 = Option.getOrElse(
    a11yNode(dump, { role: "Heading", label: "Section" }),
    () => expect.fail("the h3 was not announced as a heading"),
  );
  expect(h3.aria?.level).toBe(3);
  // Body copy is not a landmark, so it must not fabricate a role.
  expect(a11yNode(dump, { role: "Heading", label: "Body" })).toStrictEqual(
    Option.none(),
  );
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

it("clamps a Text after its own line count", async () => {
  const runtime = await openWindow();
  const line = testTheme.typography.body.lineHeight;
  const long =
    "A sentence long enough that a hundred and sixty pixels wrap it over several lines.";
  runtime.render(
    <Surface>
      <Box tone="none" style={{ width: 160 }} testId="one">
        <Text clamp={1}>{long}</Text>
      </Box>
      <Box tone="none" style={{ width: 160 }} testId="two">
        <Text clamp={2}>
          {
            "A second sentence, also long enough to wrap over several lines here."
          }
        </Text>
      </Box>
    </Surface>,
  );
  expect(boundsOf(runtime, "one").height).toBe(line);
  expect(boundsOf(runtime, "two").height).toBe(2 * line);
});

it("clamps each node to its own line count, even sharing one string layout", async () => {
  // **The clamp is the node's box, not the string's layout.** GPUI lays a
  // string out once per window and reuses that layout for identical copy, which
  // used to decide the clamp too: a two-line node and a one-line node with the
  // same copy both painted two lines. The clamp is a definite height with a
  // hidden overflow, so the box — and therefore the lines painted — belongs to
  // each node while the shared layout only decides where the string wraps.
  const runtime = await openWindow();
  const line = testTheme.typography.body.lineHeight;
  const same =
    "The quick brown fox jumps over the lazy dog and keeps running past the fence.";
  runtime.render(
    <Surface>
      <Box tone="none" style={{ width: 160 }} testId="first">
        <Text clamp={2}>{same}</Text>
      </Box>
      <Box tone="none" style={{ width: 160 }} testId="duplicate">
        <Text clamp={1}>{same}</Text>
      </Box>
    </Surface>,
  );
  expect(boundsOf(runtime, "first").height).toBe(2 * line);
  expect(boundsOf(runtime, "duplicate").height).toBe(line);
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
