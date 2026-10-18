/**
 * Accordion behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: single mode left two sections open; a non-collapsible
 * section closed everything when its own header was pressed; multiple mode lost
 * an open section when another was toggled; a disabled section opened anyway;
 * `aria-expanded` disagreed with the visible body; a controlled accordion
 * changed its own open set when the consumer said no; arrow movement landed on
 * a disabled header or opened the section it moved to; a caller `ref` on a
 * header was discarded; a held Enter toggled twice; Space toggled on key down.
 * A closed section used to unmount its body, so its state vanished; a clipped
 * body also stayed in the tab order (plan 372 §2). The body now tweens to its
 * measured height, and these tests guard that tween.
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import { createRef, useState } from "react";
import * as Option from "effect/Option";
import {
  clickCentreOf,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";

/** Whether a section body is hidden (and so out of the tab order). */
const isHidden = (root: ComponentTestRoot, testId: string): boolean =>
  root.renderer.findByTestId(testId)?.style.visibility === "hidden";

/** Advance the paused motion clock past a complete reveal. */
const settle = (root: ComponentTestRoot): void => {
  root.renderer.clockFastForward(200);
  root.renderer.dispatchNativeEvents();
};

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

/** Two sections whose bodies have a focus target, all closed. */
const Walkable = () => (
  <div testId="root">
    <Accordion type="single" collapsible>
      <AccordionItem value="one">
        <AccordionTrigger testId="trigger-one">One</AccordionTrigger>
        <AccordionContent testId="content-one">
          <input testId="draft-one" />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="two">
        <AccordionTrigger testId="trigger-two">Two</AccordionTrigger>
        <AccordionContent testId="content-two">
          <input testId="draft-two" />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    <div role="button" tabIndex={0} testId="after">
      after
    </div>
  </div>
);

/** A counter that lives inside the first section's body. */
const Stateful = () => {
  const [count, setCount] = useState(0);
  return (
    <Accordion type="single" collapsible defaultValue="one">
      <AccordionItem value="one">
        <AccordionTrigger testId="trigger-one">One</AccordionTrigger>
        <AccordionContent testId="content-one">
          <div
            role="button"
            tabIndex={0}
            testId="bump"
            onClick={() => setCount((current) => current + 1)}
          >
            bump
          </div>
          <text testId="count">{String(count)}</text>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="two">
        <AccordionTrigger testId="trigger-two">Two</AccordionTrigger>
        <AccordionContent testId="content-two">
          <text>Body two</text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

/** A body with a fixed natural height and a measurable sibling after it. */
const Measured = ({ animate = true }: { readonly animate?: boolean }) => (
  <div testId="root">
    <Accordion type="multiple">
      <AccordionItem value="one">
        <AccordionTrigger testId="trigger-one">One</AccordionTrigger>
        <AccordionContent testId="content-one" animate={animate}>
          <div style={{ height: 60 }} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    <div testId="after" style={{ height: 20 }} />
  </div>
);

describe("Accordion", () => {
  it("opens the clicked section and closes the previous one", () => {
    const faq = renderComponent(<Faq />);

    expect(faq.renderer.findByType("svg")).toHaveLength(3);
    expect(faq.renderer.getAllText()).not.toContain("⌄");
    expect(isHidden(faq, "content-one")).toBe(false);
    expect(isHidden(faq, "content-two")).toBe(true);

    clickCentreOf(faq, "trigger-two");
    settle(faq);

    expect(isHidden(faq, "content-one")).toBe(true);
    expect(isHidden(faq, "content-two")).toBe(false);
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

    expect(isHidden(faq, "content-one")).toBe(false);
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
    settle(faq);

    expect(isHidden(faq, "content-one")).toBe(true);
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

    expect(isHidden(faq, "content-one")).toBe(false);
    expect(isHidden(faq, "content-two")).toBe(false);

    clickCentreOf(faq, "trigger-one");
    settle(faq);

    expect(isHidden(faq, "content-one")).toBe(true);
    expect(isHidden(faq, "content-two")).toBe(false);

    faq.unmount();
  });

  it("does not open a disabled section", () => {
    const faq = renderComponent(<Faq />);

    clickCentreOf(faq, "trigger-three");

    expect(isHidden(faq, "content-three")).toBe(true);
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
    settle(faq);

    expect(isHidden(faq, "content-two")).toBe(false);
    expect(isHidden(faq, "content-one")).toBe(true);

    faq.unmount();
  });

  it("ignores a held Enter instead of toggling twice", () => {
    const faq = renderComponent(<Faq collapsible />);
    const first = faq.renderer.findByTestId("trigger-two");
    expect(first).toBeDefined();
    if (first === undefined) return;

    faq.renderer.nativeSimulateKeyDown(first.id, "enter");
    expect(isHidden(faq, "content-two")).toBe(false);

    const second = faq.renderer.findByTestId("trigger-two");
    expect(second).toBeDefined();
    if (second === undefined) return;
    faq.renderer.nativeSimulateKeyDown(second.id, "enter", true);

    expect(isHidden(faq, "content-two")).toBe(false);

    faq.unmount();
  });

  it("toggles Space on release, not on press", () => {
    const faq = renderComponent(<Faq />);
    const trigger = faq.renderer.findByTestId("trigger-two");
    expect(trigger).toBeDefined();
    if (trigger === undefined) return;

    faq.renderer.nativeSimulateKeyDown(trigger.id, "space");
    expect(isHidden(faq, "content-two")).toBe(true);

    faq.renderer.nativeSimulateKeyUp(trigger.id, "space");
    expect(isHidden(faq, "content-two")).toBe(false);

    faq.unmount();
  });

  it("reports a controlled change without opening the section", () => {
    const onValueChange = vi.fn();
    const faq = renderComponent(
      <Faq value="one" onValueChange={onValueChange} />,
    );

    clickCentreOf(faq, "trigger-two");

    expect(onValueChange).toHaveBeenCalledWith("two");
    expect(isHidden(faq, "content-one")).toBe(false);
    expect(isHidden(faq, "content-two")).toBe(true);

    faq.unmount();
  });

  it("reports null when a controlled collapsible closes", () => {
    const onValueChange = vi.fn();
    const faq = renderComponent(
      <Faq collapsible value="one" onValueChange={onValueChange} />,
    );

    clickCentreOf(faq, "trigger-one");

    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(isHidden(faq, "content-one")).toBe(false);

    faq.unmount();
  });

  it("moves focus between headers with the arrow keys, without opening them", () => {
    const faq = renderComponent(<Faq />);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-one")?.id ?? -1,
    );

    faq.renderer.simulateKeystrokes("down");

    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));
    expect(isHidden(faq, "content-one")).toBe(false);
    expect(isHidden(faq, "content-two")).toBe(true);

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
    settle(faq);

    expect(isHidden(faq, "content-two")).toBe(false);
    expect(isHidden(faq, "content-one")).toBe(true);

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

  it("keeps closed sections out of the tab order and the open one in it", () => {
    const faq = renderComponent(<Walkable />);
    faq.renderer.clockPause();
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-one")?.id ?? -1,
    );

    faq.renderer.focusNextWithin(faq.renderer.findByTestId("root")?.id ?? -1);
    expect(focusedTestId(faq)).toEqual(Option.some("trigger-two"));

    clickCentreOf(faq, "trigger-one");
    settle(faq);
    faq.renderer.focusElement(
      faq.renderer.findByTestId("trigger-one")?.id ?? -1,
    );
    faq.renderer.focusNextWithin(faq.renderer.findByTestId("root")?.id ?? -1);

    expect(focusedTestId(faq)).toEqual(Option.some("draft-one"));

    faq.renderer.clockResume();
    faq.unmount();
  });

  it("keeps a closed section's state across a switch to another section", () => {
    const faq = renderComponent(<Stateful />);
    faq.renderer.clockPause();
    settle(faq);

    clickCentreOf(faq, "bump");
    expect(faq.renderer.getAllText()).toContain("1");

    clickCentreOf(faq, "trigger-two");
    settle(faq);
    expect(isHidden(faq, "content-one")).toBe(true);
    expect(faq.renderer.getAllText()).toContain("1");

    clickCentreOf(faq, "trigger-one");
    settle(faq);
    expect(isHidden(faq, "content-one")).toBe(false);
    expect(faq.renderer.getAllText()).toContain("1");

    faq.renderer.clockResume();
    faq.unmount();
  });

  it("tweens a section to the measured content height", () => {
    const faq = renderComponent(<Measured />);
    faq.renderer.clockPause();
    const closed = requireBounds(faq, "after").y;

    clickCentreOf(faq, "trigger-one");
    faq.renderer.clockFastForward(80);
    faq.renderer.dispatchNativeEvents();

    const natural = requireBounds(faq, "content-one").height;
    const mid = requireBounds(faq, "after").y - closed;
    expect(natural).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(0);
    expect(Math.abs(mid - natural * 0.4)).toBeLessThanOrEqual(4);

    settle(faq);
    expect(
      Math.abs(requireBounds(faq, "after").y - closed - natural),
    ).toBeLessThanOrEqual(1);

    faq.renderer.clockResume();
    faq.unmount();
  });

  it("snaps instead of tweening when animate is false", () => {
    const faq = renderComponent(<Measured animate={false} />);
    faq.renderer.clockPause();
    const closed = requireBounds(faq, "after").y;

    clickCentreOf(faq, "trigger-one");
    faq.renderer.clockFastForward(1);
    faq.renderer.dispatchNativeEvents();

    const natural = requireBounds(faq, "content-one").height;
    expect(
      Math.abs(requireBounds(faq, "after").y - closed - natural),
    ).toBeLessThanOrEqual(1);

    faq.renderer.clockResume();
    faq.unmount();
  });

  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the ring and `AccordionTriggerState.focused` must still be true
    // (plan 388).
    const states: Array<boolean> = [];
    const faq = renderComponent(
      <Accordion type="single" collapsible>
        <AccordionItem value="one">
          <AccordionTrigger
            testId="trigger-one"
            autoFocus
            style={(state) => {
              states.push(state.focused);
              return {};
            }}
          >
            One
          </AccordionTrigger>
          <AccordionContent testId="content-one">body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(focusedTestId(faq)).toEqual(Option.some("trigger-one"));
    expect(states.at(-1)).toBe(true);
    expect(
      faq.renderer.findByTestId("trigger-one")?.style.boxShadow,
    ).toBeDefined();

    faq.unmount();
  });
});
