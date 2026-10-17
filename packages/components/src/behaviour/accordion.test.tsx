/**
 * Accordion behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: single mode left two sections open; a non-collapsible
 * section closed everything when its own header was pressed; multiple mode lost
 * an open section when another was toggled; a disabled section opened anyway;
 * `aria-expanded` disagreed with the visible body; and a controlled accordion
 * changed its own open set when the consumer said no.
 */

import { describe, expect, it, vi } from "vitest";
import { clickCentreOf } from "../internal/interaction.js";
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
});
