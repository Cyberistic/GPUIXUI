/**
 * `IconButton` in the real GPUix runtime.
 *
 * The unit suite reads the element tree; this one proves the two claims only a
 * renderer can: the accessibility tree hears the label (and not the glyph), and
 * the painted box is a square at the density's control height. Activation is
 * `Button`'s contract and is re-measured here because an icon button is the
 * easiest control to ship as a decorative shape that does nothing.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { Button } from "../src/components/Button.js";
import { IconButton } from "../src/components/IconButton.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, a11yNodes, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const glyph = <Icon name="trash" color="#000000" />;

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const boundsOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

it("names the action by its label, with the glyph out of the tree", async () => {
  const runtime = await mount(
    <IconButton testId="ib" label="Delete layer" icon={glyph} />,
  );
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "Button", label: "Delete layer" }),
    ),
  ).toBe(true);
  // The bug: an unlabelled icon became an image node, so a screen reader heard
  // a picture instead of the action.
  expect(
    Arr.filter(
      a11yNodes(runtime.a11y()),
      (node) => node.aria?.role === "Image",
    ),
  ).toStrictEqual([]);
});

it("paints a square at the density's control height", async () => {
  const runtime = await mount(
    <IconButton testId="ib" label="Delete layer" icon={glyph} />,
  );
  const bounds = boundsOf(runtime, "ib");
  const side = testTheme.density.controlHeight.md;
  expect(bounds.width).toBe(side);
  expect(bounds.height).toBe(side);
});

it("activates once on a press and once on Enter down", async () => {
  let calls = 0;
  const runtime = await mount(
    <IconButton
      testId="ib"
      label="Delete layer"
      icon={glyph}
      onActivate={() => {
        calls += 1;
      }}
    />,
  );
  runtime.click("ib");
  expect(calls).toBe(1);
  runtime.keyDown("ib", "enter");
  runtime.keyUp("ib", "enter");
  expect(calls).toBe(2);
});

it("refuses a disabled action and keeps it out of the tab order", async () => {
  let calls = 0;
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before">Before</Button>
      <IconButton
        testId="ib"
        label="Delete layer"
        icon={glyph}
        disabled
        onActivate={() => {
          calls += 1;
        }}
      />
    </Stack>,
  );
  runtime.click("ib");
  runtime.keyDown("ib", "enter");
  expect(calls).toBe(0);
  runtime.click("before");
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("before"));
});

it("shows the busy state, stays focusable and refuses to run", async () => {
  let calls = 0;
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before">Before</Button>
      <IconButton
        testId="ib"
        label="Export layer"
        icon={glyph}
        loading
        onActivate={() => {
          calls += 1;
        }}
      />
    </Stack>,
  );
  runtime.click("ib");
  runtime.keyDown("ib", "enter");
  expect(calls).toBe(0);
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button", label: "Export layer" }),
    () => expect.fail("the busy action announced nothing"),
  );
  expect(node.aria?.description).toBe("Loading");
  runtime.click("before");
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("ib"));
});
