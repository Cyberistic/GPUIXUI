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

const motionOf = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): unknown => page.renderer.findByTestId(testId)?.customProps?.motion;

const heightOf = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): number => requireBounds(page, testId).height;

const topOf = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): number => requireBounds(page, testId).y;

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

      expect(after - before).toBe(resting);

      clickCentreOf(page, "trigger-one");
      settle(page);
      const closing = steps(page, "content-one");

      expect(
        closing.filter((height) => height > 0 && height < resting).length,
      ).toBeGreaterThan(1);
      expect(closing.at(-1) ?? resting).toBeLessThan(resting);
      await waitFor(() =>
        expect(page.renderer.findByTestId("content-one")).toBeUndefined(),
      );

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

      expect(new Set(moving).size).toBeGreaterThan(2);
      expect(moving.every((y) => y >= before)).toBe(true);
    } finally {
      page.unmount();
    }
  });

  it("cross-fades its two chevrons instead of swapping the mark", () => {
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

      expect(
        page.renderer.findByTestId("trigger-one-chevron-down"),
      ).toBeDefined();
      expect(
        page.renderer.findByTestId("trigger-one-chevron-up"),
      ).toBeDefined();

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
    const faq = renderComponent(<Faq />, "light");
    const hover = faq.renderer.findByTestId("trigger-two")?.style.hover;

    expect(hover).toMatchObject({
      backgroundColor: lightTheme.colors.hover,
    });

    expect(hover).toMatchObject({ color: null });
    expect(
      contrastRatio(lightTheme.colors.foreground, lightTheme.colors.hover) ?? 0,
    ).toBeGreaterThanOrEqual(contrastFloors.body);

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

    faq.renderer.focusElement(ref.current?.id ?? -1);
    faq.renderer.simulateKeystrokes("down");
    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));

    faq.unmount();
  });

  it("opens a saved multiple accordion whose open set is not a list", async () => {
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
