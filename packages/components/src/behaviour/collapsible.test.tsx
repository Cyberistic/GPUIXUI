/**
 * Collapsible behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a closed section that left its content mounted (and so
 * kept running); `aria-expanded` that disagreed with the visible body; a trigger
 * that only answered the mouse, not Enter/Space; and a controlled section that
 * opened itself when the consumer kept `open={false}`.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible.js";

/** Advanced options, closed by default. */
const Advanced = ({
  open,
  onOpenChange,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}) => (
  <Collapsible open={open} defaultOpen={false} onOpenChange={onOpenChange}>
    <CollapsibleTrigger testId="trigger">Advanced options</CollapsibleTrigger>
    <CollapsibleContent testId="content">
      <text>Retry budget</text>
    </CollapsibleContent>
  </Collapsible>
);

describe("Collapsible", () => {
  it("opens and closes on a click, unmounting the body", () => {
    const section = renderComponent(<Advanced />);

    expect(section.renderer.findByTestId("content")).toBeUndefined();
    expect(section.renderer.findByTestId("trigger")?.customProps).toMatchObject(
      {
        "aria-expanded": false,
      },
    );

    clickCentreOf(section, "trigger");

    expect(section.renderer.findByTestId("content")).toBeDefined();
    expect(section.renderer.getAllText()).toContain("Retry budget");
    expect(section.renderer.findByTestId("trigger")?.customProps).toMatchObject(
      {
        "aria-expanded": true,
      },
    );

    clickCentreOf(section, "trigger");

    expect(section.renderer.findByTestId("content")).toBeUndefined();
    expect(section.renderer.getAllText()).not.toContain("Retry budget");

    section.unmount();
  });

  it("toggles from Enter and Space on the focused trigger", () => {
    const section = renderComponent(<Advanced />);

    section.renderer.focusElement(
      section.renderer.findByTestId("trigger")?.id ?? -1,
    );
    expect(focusedTestId(section)).toEqual(Option.some("trigger"));

    section.renderer.simulateKeystrokes("enter");
    expect(section.renderer.findByTestId("content")).toBeDefined();

    section.renderer.simulateKeystrokes("space");
    expect(section.renderer.findByTestId("content")).toBeUndefined();

    section.unmount();
  });

  it("stays closed in controlled mode until the consumer opens it", () => {
    const onOpenChange = vi.fn();
    const section = renderComponent(
      <Advanced open={false} onOpenChange={onOpenChange} />,
    );

    clickCentreOf(section, "trigger");

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(section.renderer.findByTestId("content")).toBeUndefined();
    expect(section.renderer.findByTestId("trigger")?.customProps).toMatchObject(
      {
        "aria-expanded": false,
      },
    );

    section.unmount();
  });

  it("opens from the controlled prop when the consumer agrees", () => {
    const onOpenChange = vi.fn();
    const section = renderComponent(
      <Advanced open={false} onOpenChange={onOpenChange} />,
    );

    clickCentreOf(section, "trigger");
    section.rerender(<Advanced open onOpenChange={onOpenChange} />);

    expect(section.renderer.findByTestId("content")).toBeDefined();

    section.unmount();
  });
});
