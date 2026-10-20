/**
 * `ToggleGroup` in the real GPUix runtime.
 *
 * What only the renderer can show: a hit-tested press changes the announced
 * set, arrows reach the group **and** move native focus to the next item, the
 * single tab stop is the one `focusNext` lands on, and a disabled item is
 * skipped by both arrows and Tab. The state channel is `aria-valuetext`
 * because 0.10.0 has no `aria-pressed` (plan 056 §2).
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Stack } from "../src/components/Stack.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow } from "./fixture.js";

const align = [
  { value: "left", label: "Left" },
  { value: "centre", label: "Centre" },
  { value: "right", label: "Right" },
] as const;

const format = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline" },
] as const;

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

it("selects one item on a real click and unpresses the previous one", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={align}
        defaultValue="left"
      />
    </Surface>,
  );
  expect(announced(runtime, "Left")).toBe("pressed");
  runtime.click("tg-centre");
  expect(announced(runtime, "Centre")).toBe("pressed");
  expect(announced(runtime, "Left")).toBe("not pressed");
  expect(announced(runtime, "Right")).toBe("not pressed");
});

it("toggles independent items in multiple mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Formatting"
        options={format}
      />
    </Surface>,
  );
  runtime.click("tg-bold");
  runtime.click("tg-italic");
  expect(announced(runtime, "Bold")).toBe("pressed");
  expect(announced(runtime, "Italic")).toBe("pressed");
  runtime.click("tg-bold");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  expect(announced(runtime, "Italic")).toBe("pressed");
});

it("activates on Enter down and Space up in a group", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Formatting"
        options={format}
      />
    </Surface>,
  );
  runtime.keyDown("tg-bold", "enter");
  expect(announced(runtime, "Bold")).toBe("pressed");
  runtime.keyUp("tg-bold", "enter");
  expect(announced(runtime, "Bold")).toBe("pressed");
  runtime.keyDown("tg-italic", "space");
  expect(announced(runtime, "Italic")).toBe("not pressed");
  runtime.keyUp("tg-italic", "space");
  expect(announced(runtime, "Italic")).toBe("pressed");
});

it("moves focus and selection together with an arrow in single mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={align}
        defaultValue="left"
      />
    </Surface>,
  );
  runtime.keyDown("tg-left", "right");
  expect(focused(runtime)).toBe("tg-centre");
  expect(announced(runtime, "Centre")).toBe("pressed");
  expect(announced(runtime, "Left")).toBe("not pressed");
});

it("moves only focus with an arrow in multiple mode", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Formatting"
        options={format}
      />
    </Surface>,
  );
  runtime.keyDown("tg-bold", "right");
  expect(focused(runtime)).toBe("tg-italic");
  expect(announced(runtime, "Bold")).toBe("not pressed");
  expect(announced(runtime, "Italic")).toBe("not pressed");
});

it("skips a disabled item with arrows and refuses its press", async () => {
  const runtime = await openWindow();
  const trackedFocus: string[] = [];
  runtime.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={[
          { value: "left", label: "Left", disabled: true },
          { value: "centre", label: "Centre" },
          { value: "right", label: "Right" },
        ]}
        defaultValue="centre"
        itemStyle={(state) => {
          if (state.focused) trackedFocus.push(state.value);
          return {};
        }}
      />
    </Surface>,
  );
  runtime.click("tg-left");
  expect(announced(runtime, "Centre")).toBe("pressed");
  // The click moved native focus to the disabled item (the runtime does not
  // refuse focus), so the keyboard's next move starts there once the tracker
  // has sampled it: Right lands on the first enabled item after it (plan `601`).
  // A disabled item paints no ring, so the item state callback is the observable.
  await awaitFrame(
    () => trackedFocus.includes("left"),
    "the tracker reports the disabled item focused",
  );
  runtime.keyDown("tg-left", "right");
  expect(focused(runtime)).toBe("tg-centre");
  runtime.keyDown("tg-centre", "right");
  expect(focused(runtime)).toBe("tg-right");
  runtime.keyDown("tg-right", "right");
  expect(focused(runtime)).toBe("tg-centre");
  runtime.keyDown("tg-centre", "end");
  expect(focused(runtime)).toBe("tg-right");
  runtime.keyDown("tg-right", "home");
  expect(focused(runtime)).toBe("tg-centre");
});

it("takes one tab stop, on the selected item", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <ToggleGroup
          type="single"
          testId="tg"
          label="Alignment"
          options={align}
          defaultValue="centre"
        />
      </Stack>
    </Surface>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focused(runtime)).toBe("tg-centre");
  runtime.focusNext();
  expect(focused(runtime)).not.toBe("tg-right");
});

it("keeps the first enabled item as the tab stop when nothing is selected", async () => {
  // The bug guarded (plan 502): the roving index fell back to `""`, which is a
  // real option value, so an empty-valued item later in the group stole the
  // tab stop from the first enabled one.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <ToggleGroup
          type="single"
          testId="tge"
          label="Filter"
          options={[
            { value: "left", label: "Left" },
            { value: "", label: "None" },
          ]}
        />
      </Stack>
    </Surface>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focused(runtime)).toBe("tge-left");
});

it("leaves a disabled group out of the tab order and inert", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <ToggleGroup
          type="single"
          testId="tg"
          label="Alignment"
          options={align}
          defaultValue="left"
          disabled
        />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  runtime.click("tg-centre");
  expect(announced(runtime, "Left")).toBe("pressed");
  runtime.click("before");
  runtime.focusNext();
  expect(focused(runtime)).toBe("after");
});

/**
 * The bug guarded (plan `394`): the page listed `←` `↑` and `→` `↓` for both
 * orientations, but the group answers only its own axis. A horizontal group
 * ignored `Up` (focus and value stayed on Left) while `Right` moved; the
 * vertical case is the mirror. The page now says so, and this measures it.
 */
it("answers only its orientation's arrow axis", async () => {
  const horizontal = await openWindow();
  horizontal.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={align}
        defaultValue="left"
      />
    </Surface>,
  );
  horizontal.click("tg-left");
  expect(focused(horizontal)).toBe("tg-left");
  horizontal.keyDown("tg-left", "up");
  horizontal.keyUp("tg-left", "up");
  expect(focused(horizontal)).toBe("tg-left");
  expect(announced(horizontal, "Left")).toBe("pressed");
  horizontal.keyDown("tg-left", "right");
  expect(focused(horizontal)).toBe("tg-centre");
  expect(announced(horizontal, "Centre")).toBe("pressed");

  const vertical = await openWindow();
  vertical.render(
    <Surface>
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        options={align}
        defaultValue="left"
        orientation="vertical"
      />
    </Surface>,
  );
  vertical.click("tg-left");
  expect(focused(vertical)).toBe("tg-left");
  vertical.keyDown("tg-left", "right");
  vertical.keyUp("tg-left", "right");
  expect(focused(vertical)).toBe("tg-left");
  expect(announced(vertical, "Left")).toBe("pressed");
  vertical.keyDown("tg-left", "down");
  expect(focused(vertical)).toBe("tg-centre");
  expect(announced(vertical, "Centre")).toBe("pressed");
});

/**
 * The bug guarded (plan `600`): the multiple-mode tab stop is documented as the
 * item that last held focus. A click moves native focus, but the pinned release
 * runtime dispatches no `onFocus` (plan `583`), so the group never heard it and
 * kept the first enabled item. A keyboard user who clicked an item and later
 * Tabbed back entered at the wrong one.
 */
it("moves the multiple tab stop to an item that was clicked", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <ToggleGroup
          type="multiple"
          testId="tg"
          label="Formatting"
          options={format}
        />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>,
  );
  runtime.click("tg-underline");
  expect(focused(runtime)).toBe("tg-underline");
  expect(announced(runtime, "Underline")).toBe("pressed");

  runtime.click("before");
  // The tab stop is the group's own last-clicked value (plan `600`), not the
  // tracker's sample, so no wait stands between the click and Tab.
  runtime.focusNext();
  expect(focused(runtime)).toBe("tg-underline");
  // One stop, not three: the next Tab leaves the group.
  runtime.focusNext();
  expect(focused(runtime)).toBe("after");
});

/**
 * The other half of plan `600`: a disabled option never becomes the stop, even
 * when a click lands on it. It has `tabIndex={undefined}`, so making it the
 * stop would leave the whole group without a tab stop (plan `056`).
 */
it("keeps a disabled item out of the multiple tab stop", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <ToggleGroup
          type="multiple"
          testId="tg"
          label="Formatting"
          options={[
            { value: "bold", label: "Bold" },
            { value: "italic", label: "Italic", disabled: true },
            { value: "underline", label: "Underline" },
          ]}
        />
      </Stack>
    </Surface>,
  );
  runtime.click("tg-italic");
  expect(announced(runtime, "Italic")).toBe("not pressed");

  runtime.click("before");
  runtime.focusNext();
  expect(focused(runtime)).toBe("tg-bold");
});
