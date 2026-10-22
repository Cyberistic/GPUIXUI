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
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
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

describe("Accordion", () => {
  it("opens the clicked section and closes the previous one", () => {
    const faq = renderComponent(<Faq />);

    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    expect(faq.renderer.findByTestId("content-two")).toBeUndefined();

    clickCentreOf(faq, "trigger-two");

    expect(faq.renderer.findByTestId("content-one")).toBeUndefined();
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

  it("closes the open section when collapsible", () => {
    const faq = renderComponent(<Faq collapsible />);

    clickCentreOf(faq, "trigger-one");

    expect(faq.renderer.findByTestId("content-one")).toBeUndefined();
    expect(faq.renderer.findByTestId("trigger-one")?.customProps).toMatchObject(
      {
        "aria-expanded": false,
      },
    );

    faq.unmount();
  });

  it("keeps several sections open in multiple mode", () => {
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

    expect(faq.renderer.findByTestId("content-one")).toBeUndefined();
    expect(faq.renderer.findByTestId("content-two")).toBeDefined();

    faq.unmount();
  });

  it("does not open a disabled section", () => {
    const faq = renderComponent(<Faq />);

    clickCentreOf(faq, "trigger-three");

    expect(faq.renderer.findByTestId("content-three")).toBeUndefined();
    expect(
      faq.renderer.findByTestId("trigger-three")?.customProps,
    ).toMatchObject({
      "aria-expanded": false,
      tabIndex: -1,
    });

    faq.unmount();
  });

  it("opens from Enter on the focused trigger", () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-two")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("enter");

    expect(faq.renderer.findByTestId("content-two")).toBeDefined();
    expect(faq.renderer.findByTestId("content-one")).toBeUndefined();

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

  it("reports a controlled change without opening the section", () => {
    const onValueChange = vi.fn();
    const faq = renderComponent(
      <Faq value="one" onValueChange={onValueChange} />,
    );

    clickCentreOf(faq, "trigger-two");

    expect(onValueChange).toHaveBeenCalledWith("two");
    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    expect(faq.renderer.findByTestId("content-two")).toBeUndefined();

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

  it("moves focus between headers with the arrow keys, without opening them", () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-one")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("down");

    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));
    expect(faq.renderer.findByTestId("content-one")).toBeDefined();
    expect(faq.renderer.findByTestId("content-two")).toBeUndefined();

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

  it("still opens the focused header with Enter after moving", () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-one")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("down");
    faq.renderer.simulateKeystrokes("enter");

    expect(faq.renderer.findByTestId("content-two")).toBeDefined();
    expect(faq.renderer.findByTestId("content-one")).toBeUndefined();

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
      contrastRatio(
        lightTheme.colors.foreground,
        lightTheme.colors.hover,
      ) ?? 0,
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

    expect(faq.renderer.findByTestId("trigger-two")?.style.hover).toMatchObject({
      backgroundColor: darkTheme.colors.hover,
    });

    faq.unmount();
  });

  it("feeds both the internal and the caller's header ref", () => {    const ref = createRef<PublicInstance>();
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
});
