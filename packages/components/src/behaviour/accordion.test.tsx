/**
 * Accordion behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: single mode left two sections open; a non-collapsible
 * section closed everything when its own header was pressed; multiple mode lost
 * an open section when another was toggled; a disabled section opened anyway;
 * `aria-expanded` disagreed with the visible body; a controlled accordion
 * changed its own open set when the consumer said no; and arrow movement either
 * landed on a disabled header or opened the section it moved to. A caller `ref`
 * on a header was discarded in favour of the internal one. A held Enter flipped
 * a just-opened section shut again on each repeat of the key.
 */

import * as Option from "effect/Option";
import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import {
  clickCentreOf,
  requireBounds,
  settle,
  waitFor,
  focusedTestId,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";

const section = (value: string, label: string, disabled = false) => (
  <AccordionItem value={value} disabled={disabled} testId={`item-${value}`}>
    <AccordionTrigger testId={`trigger-${value}`}>{label}</AccordionTrigger>
    <AccordionContent testId={`content-${value}`}>
      <text>{`Body ${value}`}</text>
    </AccordionContent>
  </AccordionItem>
);

/** A three-question FAQ, with the third disabled. */
const Faq = ({
  collapsible = false,
  value,
  onValueChange,
}: {
  readonly collapsible?: boolean;
  readonly value?: string;
  readonly onValueChange?: (value: string | null) => void;
}) => (
  <Accordion
    type="single"
    collapsible={collapsible}
    defaultValue="one"
    value={value}
    onValueChange={onValueChange}
  >
    {section("one", "What is GPUix?")}
    {section("two", "Can I theme it?")}
    {section("three", "Is it free?", true)}
  </Accordion>
);

/**
 * The accordion the motion cases drive: two fixed bodies, so the panel's
 * painted heights and the shift of the section below are arithmetic.
 */
const MotionAccordion = ({
  reduced = false,
}: {
  readonly reduced?: boolean;
}) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <Accordion type="single" collapsible>
      <AccordionItem value="one" testId="item-one">
        <AccordionTrigger testId="trigger-one">One</AccordionTrigger>
        <AccordionContent testId="content-one">
          <div style={{ height: 80 }} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="two" testId="item-two">
        <AccordionTrigger testId="trigger-two">Two</AccordionTrigger>
        <AccordionContent testId="content-two">
          <div style={{ height: 40 }} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </MotionProvider>
);

/** The motion description the runtime is running for `testId`. */
const motionOf = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): unknown => page.renderer.findByTestId(testId)?.customProps?.motion;

/** The painted height of `testId`. */
const heightOf = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): number => requireBounds(page, testId).height;

/** The painted top edge of `testId`. */
const topOf = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): number => requireBounds(page, testId).y;

/** The painted heights of a panel at 20 ms steps, for the frames it is moving. */
const steps = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): ReadonlyArray<number> =>
  Array.from({ length: 9 }, () => {
    page.renderer.clockFastForward(20);
    settle(page);
    const element = page.renderer.findByTestId(testId);
    return element === undefined
      ? -1
      : (page.renderer.getElementBounds(element.id)?.height ?? -1);
  });

describe("Accordion motion", () => {
  /**
   * The bug this guards: the panel's target arrived through `onLayout` after its
   * first paint, so the opening frame was handed height 0 and the growth started
   * a frame late. The target is the height the panel settles on, known before
   * that frame paints.
   */
  it("hands the runtime the measured height on the frame it opens", () => {
    const page = renderComponent(<MotionAccordion />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "trigger-one");
      const opening = motionOf(page, "content-one");
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      const resting = heightOf(page, "content-one");

      expect(resting).toBeGreaterThan(0);
      expect(opening).toMatchObject({
        initial: { height: 0 },
        animate: { height: resting },
        transition: { duration: 0.2, ease: "easeOut" },
      });
    } finally {
      page.unmount();
    }
  });

  it("moves through intermediate heights while it opens and shrinks before it unmounts", async () => {
    const page = renderComponent(<MotionAccordion />);
    try {
      page.renderer.clockPause();
      const before = topOf(page, "item-two");
      clickCentreOf(page, "trigger-one");
      settle(page);
      const opening = steps(page, "content-one");
      page.renderer.clockFastForward(400);
      settle(page);
      const resting = heightOf(page, "content-one");
      const after = topOf(page, "item-two");

      expect(
        opening.filter((height) => height > 0 && height < resting).length,
      ).toBeGreaterThan(1);
      // The section below moves by exactly the panel it gained, so nothing jumps.
      expect(after - before).toBe(resting);

      clickCentreOf(page, "trigger-one");
      settle(page);
      const closing = steps(page, "content-one");

      // It shrinks through real frames rather than vanishing...
      expect(
        closing.filter((height) => height > 0 && height < resting).length,
      ).toBeGreaterThan(1);
      expect(closing.at(-1) ?? resting).toBeLessThan(resting);
      await waitFor(() =>
        expect(page.renderer.findByTestId("content-one")).toBeUndefined(),
      );
      // ...and the page below lands where it started.
      expect(topOf(page, "item-two")).toBe(before);
    } finally {
      page.unmount();
    }
  });

  it("keeps the section below moving through the open, not jumping to its place", () => {
    const page = renderComponent(<MotionAccordion />);
    try {
      page.renderer.clockPause();
      const before = topOf(page, "item-two");
      clickCentreOf(page, "trigger-one");
      settle(page);
      const moving = Array.from({ length: 9 }, () => {
        const y = topOf(page, "item-two");
        page.renderer.clockFastForward(20);
        settle(page);
        return y;
      });

      // A snap mounts the open body at its full height in one frame and leaves
      // the section below with two positions; a height tween moves it through
      // several.
      expect(new Set(moving).size).toBeGreaterThan(2);
      expect(moving.every((y) => y >= before)).toBe(true);
    } finally {
      page.unmount();
    }
  });

  it("cross-fades its two chevrons instead of swapping the mark", () => {
    // The runtime has no `transform`, so the indicator cannot rotate: both marks
    // stay mounted in the header and cross-fade, the incoming one rising 2px.
    const page = renderComponent(<MotionAccordion />);
    try {
      page.renderer.clockPause();
      const header = heightOf(page, "trigger-one");
      expect(motionOf(page, "trigger-one-chevron-down")).toMatchObject({
        animate: { opacity: 1, top: 0 },
        transition: { duration: 0.2, ease: "easeOut" },
      });
      expect(motionOf(page, "trigger-one-chevron-up")).toMatchObject({
        animate: { opacity: 0, top: 2 },
        transition: { duration: 0.2, ease: "easeIn" },
      });

      clickCentreOf(page, "trigger-one");
      settle(page);

      expect(motionOf(page, "trigger-one-chevron-down")).toMatchObject({
        animate: { opacity: 0, top: -2 },
      });
      expect(motionOf(page, "trigger-one-chevron-up")).toMatchObject({
        animate: { opacity: 1, top: 0 },
      });
      // Both marks stay painted, which is what makes it a cross-fade.
      expect(
        page.renderer.findByTestId("trigger-one-chevron-down"),
      ).toBeDefined();
      expect(
        page.renderer.findByTestId("trigger-one-chevron-up"),
      ).toBeDefined();
      // The two marks share one slot, so the header keeps its box.
      expect(heightOf(page, "trigger-one")).toBe(header);
    } finally {
      page.unmount();
    }
  });

  it("paints the measured height at once under the reduced preference", () => {
    const page = renderComponent(<MotionAccordion reduced />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "trigger-one");
      settle(page);
      const first = heightOf(page, "content-one");

      expect(first).toBeGreaterThan(0);
      expect(motionOf(page, "content-one")).toMatchObject({
        transition: { duration: 0 },
      });
      // The fade snaps with the box, so the delay it wears while animated goes.
      expect(motionOf(page, "content-one-measured")).toMatchObject({
        transition: { duration: 0 },
      });
      page.renderer.clockFastForward(400);
      settle(page);
      expect(heightOf(page, "content-one")).toBe(first);
    } finally {
      page.unmount();
    }
  });
});

describe("Accordion", () => {
  it("opens the clicked section and closes the previous one", async () => {
    const faq = renderComponent(<Faq />);

    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-two")).toBeUndefined(),
    );

    clickCentreOf(faq, "trigger-two");

    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-one")).toBeUndefined(),
    );
    expect(faq.renderer.findByTestId("content-two")).toBeDefined();
    expect(faq.renderer.findByTestId("trigger-one")?.customProps).toMatchObject(
      {
        "aria-expanded": false,
      },
    );
    expect(faq.renderer.findByTestId("trigger-two")?.customProps).toMatchObject(
      {
        "aria-expanded": true,
      },
    );

    faq.unmount();
  });

  it("refuses to close the only open section when not collapsible", () => {
    const faq = renderComponent(<Faq />);

    clickCentreOf(faq, "trigger-one");

    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    expect(faq.renderer.findByTestId("trigger-one")?.customProps).toMatchObject(
      {
        "aria-expanded": true,
      },
    );

    faq.unmount();
  });

  it("closes the open section when collapsible", async () => {
    const faq = renderComponent(<Faq collapsible />);

    clickCentreOf(faq, "trigger-one");

    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-one")).toBeUndefined(),
    );
    expect(faq.renderer.findByTestId("trigger-one")?.customProps).toMatchObject(
      {
        "aria-expanded": false,
      },
    );

    faq.unmount();
  });

  it("keeps several sections open in multiple mode", async () => {
    const faq = renderComponent(
      <Accordion type="multiple" defaultValue={["one"]}>
        {section("one", "One")}
        {section("two", "Two")}
        {section("three", "Three")}
      </Accordion>,
    );

    clickCentreOf(faq, "trigger-two");

    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    expect(faq.renderer.findByTestId("content-two")).toBeDefined();

    clickCentreOf(faq, "trigger-one");

    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-one")).toBeUndefined(),
    );
    expect(faq.renderer.findByTestId("content-two")).toBeDefined();

    faq.unmount();
  });

  it("does not open a disabled section", async () => {
    const faq = renderComponent(<Faq />);

    clickCentreOf(faq, "trigger-three");

    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-three")).toBeUndefined(),
    );
    expect(
      faq.renderer.findByTestId("trigger-three")?.customProps,
    ).toMatchObject({
      "aria-expanded": false,
      tabIndex: -1,
    });

    faq.unmount();
  });

  it("opens from Enter on the focused trigger", async () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-two")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("enter");

    expect(faq.renderer.findByTestId("content-two")).toBeDefined();
    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-one")).toBeUndefined(),
    );

    faq.unmount();
  });

  it("does not close the section again on a repeat while Enter is held", () => {
    const faq = renderComponent(<Faq collapsible />);
    const trigger = faq.renderer.findByTestId("trigger-two");
    expect(trigger).toBeDefined();
    if (trigger === undefined) return;

    faq.renderer.nativeSimulateKeyDown(trigger.id, "enter");
    expect(faq.renderer.findByTestId("content-two")).toBeDefined();

    // The platform repeats the key-down while the key is held; a collapsible
    // section would flip shut again if a repeat counted as an activation.
    faq.renderer.nativeSimulateKeyDown(trigger.id, "enter", true);
    expect(faq.renderer.findByTestId("content-two")).toBeDefined();

    faq.unmount();
  });

  it("reports a controlled change without opening the section", async () => {
    const onValueChange = vi.fn();
    const faq = renderComponent(
      <Faq value="one" onValueChange={onValueChange} />,
    );

    clickCentreOf(faq, "trigger-two");

    expect(onValueChange).toHaveBeenCalledWith("two");
    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-two")).toBeUndefined(),
    );

    faq.unmount();
  });

  it("reports null when a controlled collapsible closes", () => {
    const onValueChange = vi.fn();
    const faq = renderComponent(
      <Faq collapsible value="one" onValueChange={onValueChange} />,
    );

    clickCentreOf(faq, "trigger-one");

    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(faq.renderer.findByTestId("content-one")).toBeDefined();

    faq.unmount();
  });

  it("moves focus between headers with the arrow keys, without opening them", async () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-one")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("down");

    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));
    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-two")).toBeUndefined(),
    );

    faq.renderer.simulateKeystrokes("up");

    expect(focusedTestId(faq)).toEqual(Option.some("trigger-one"));

    faq.unmount();
  });

  it("wraps past a disabled header at the end", () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-two")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("down");
    expect(focusedTestId(faq)).toEqual(Option.some("trigger-one"));

    faq.renderer.simulateKeystrokes("up");
    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));

    faq.unmount();
  });

  it("jumps to the first and last enabled header", () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-two")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("home");
    expect(focusedTestId(faq)).toEqual(Option.some("trigger-one"));

    faq.renderer.simulateKeystrokes("end");
    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));

    faq.unmount();
  });

  it("still opens the focused header with Enter after moving", async () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-one")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("down");
    faq.renderer.simulateKeystrokes("enter");

    expect(faq.renderer.findByTestId("content-two")).toBeDefined();
    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-one")).toBeUndefined(),
    );

    faq.unmount();
  });

  it("signals the hover with the measured state wash, not the brand fill", () => {
    // The bug: hover repainted the label in `colors.primary` — a fill role
    // designed to carry `primaryForeground` — so the header fell to 5.61:1 on
    // the base light page and 4.38:1 on Linux light's, under the body floor,
    // while every other trigger in the library tints the `hover` wash and
    // keeps the label role the contract measures on it.
    const faq = renderComponent(<Faq />, "light");
    const hover = faq.renderer.findByTestId("trigger-two")?.style.hover;

    expect(hover).toMatchObject({
      backgroundColor: lightTheme.colors.hover,
    });
    // The label keeps the role it has at rest, which the pair table holds to
    // the body floor on the wash.
    expect(hover).toMatchObject({ color: null });
    expect(
      contrastRatio(lightTheme.colors.foreground, lightTheme.colors.hover) ?? 0,
    ).toBeGreaterThanOrEqual(contrastFloors.body);
    // The premise: the role the header used to paint cannot meet that floor.
    expect(
      contrastRatio(lightTheme.colors.primary, lightTheme.colors.background) ??
        0,
    ).toBeLessThan(contrastFloors.body);

    faq.unmount();
  });

  it("signals the hover the same way in a dark theme", () => {
    const faq = renderComponent(<Faq />, "dark");

    expect(faq.renderer.findByTestId("trigger-two")?.style.hover).toMatchObject(
      {
        backgroundColor: darkTheme.colors.hover,
      },
    );

    faq.unmount();
  });

  it("feeds both the internal and the caller's header ref", () => {
    const ref = createRef<PublicInstance>();
    const faq = renderComponent(
      <Accordion type="multiple">
        <AccordionItem value="one">
          <AccordionTrigger ref={ref} testId="trigger-one">
            One
          </AccordionTrigger>
          <AccordionContent>
            <text>Body one</text>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="two">
          <AccordionTrigger testId="trigger-two">Two</AccordionTrigger>
          <AccordionContent>
            <text>Body two</text>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(ref.current?.id).toBe(faq.renderer.findByTestId("trigger-one")?.id);

    // The internal ref still carries header movement.
    faq.renderer.focusElement(ref.current?.id ?? -1);
    faq.renderer.simulateKeystrokes("down");
    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));

    faq.unmount();
  });

  it("opens a saved multiple accordion whose open set is not a list", async () => {
    // Which sections are open is saved with the workspace, and a store writes
    // `null` for a layout that carried none. The root read the membership of
    // that value on the first render, so the accordion threw before it painted.
    const onValueChange = vi.fn();
    const faq = renderComponent(
      // @ts-expect-error — the open set a store wrote where it carried none.
      <Accordion
        type="multiple"
        defaultValue={["one"]}
        value={null}
        onValueChange={onValueChange}
      >
        {section("one", "One")}
        {section("two", "Two")}
      </Accordion>,
    );

    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    expect(faq.renderer.findByTestId("content-two")).toBeUndefined();

    clickCentreOf(faq, "trigger-two");
    await waitFor(() =>
      expect(faq.renderer.findByTestId("content-two")).toBeDefined(),
    );
    expect(onValueChange).toHaveBeenLastCalledWith(["one", "two"]);

    faq.unmount();
  });

  it("keeps the open sections beside an entry a store wrote as a hole", () => {
    const onValueChange = vi.fn();
    // A hole in the saved set is a section the store never named.
    const saved = [null, "two"];
    const faq = renderComponent(
      // @ts-expect-error — a section a store saved as a hole in the set.
      <Accordion type="multiple" value={saved} onValueChange={onValueChange}>
        {section("one", "One")}
        {section("two", "Two")}
      </Accordion>,
    );

    expect(faq.renderer.findByTestId("content-one")).toBeUndefined();
    expect(faq.renderer.findByTestId("content-two")).toBeDefined();

    clickCentreOf(faq, "trigger-one");
    expect(onValueChange).toHaveBeenLastCalledWith(["two", "one"]);

    faq.unmount();
  });
});
