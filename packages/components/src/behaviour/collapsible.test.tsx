/**
 * Collapsible behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a closed section that left its content mounted for good
 * (and so kept running); a body that vanished on close instead of running its
 * collapse; `aria-expanded` that disagreed with the visible body; a trigger that
 * only answered the mouse, not Enter/Space; and a controlled section that opened
 * itself when the consumer kept `open={false}`.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { decorativeFloor, contrastRatio, platformTheme } from "@gpuixui/tokens";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  pressKey,
  waitFor,
} from "../internal/interaction.js";
import { lightTheme, pressWash } from "../internal/theme.js";
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
  disabled,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly disabled?: boolean;
}) => (
  <Collapsible open={open} defaultOpen={false} onOpenChange={onOpenChange}>
    <CollapsibleTrigger testId="trigger" disabled={disabled}>
      Advanced options
    </CollapsibleTrigger>
    <CollapsibleContent testId="content">
      <text>Retry budget</text>
    </CollapsibleContent>
  </Collapsible>
);

describe("Collapsible", () => {
  it("opens on a click, and unmounts the body after its collapse", async () => {
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

    // The body is still painted for its collapse tween, then leaves.
    expect(section.renderer.findByTestId("content")).toBeDefined();
    await waitFor(() =>
      expect(section.renderer.findByTestId("content")).toBeUndefined(),
    );
    expect(section.renderer.getAllText()).not.toContain("Retry budget");

    section.unmount();
  });

  it("toggles from Enter and Space on the focused trigger", async () => {
    const section = renderComponent(<Advanced />);

    section.renderer.focusElement(
      section.renderer.findByTestId("trigger")?.id ?? -1,
    );
    expect(focusedTestId(section)).toEqual(Option.some("trigger"));

    section.renderer.simulateKeystrokes("enter");
    expect(section.renderer.findByTestId("content")).toBeDefined();

    pressKey(section, "space");
    await waitFor(() =>
      expect(section.renderer.findByTestId("content")).toBeUndefined(),
    );

    section.unmount();
  });

  it("keeps a disabled trigger out of the tab order and closed", () => {
    const section = renderComponent(<Advanced disabled />);
    const trigger = section.renderer.findByTestId("trigger");

    expect(trigger?.customProps?.tabIndex).toBe(-1);

    clickCentreOf(section, "trigger");
    section.renderer.focusElement(trigger?.id ?? -1);
    section.renderer.simulateKeystrokes("enter");
    pressKey(section, "space");

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

  it("paints a trigger press the hover it replaces can show", () => {
    // The bug: the press repainted the raw `active` role, 1.037:1 from the
    // `hover` wash the trigger is already wearing in Light · macOS — under the
    // 1.05:1 floor — so pressing a section header looked like hovering it.
    const macOSLight = platformTheme(lightTheme, "darwin");
    const section = renderComponent(<Advanced />, macOSLight);

    hoverCentreOf(section, "trigger");

    const style = section.renderer.findByTestId("trigger")?.style;

    section.unmount();

    expect(style?.hover).toMatchObject({
      backgroundColor: macOSLight.colors.hover,
    });
    expect(style?.active).toMatchObject({
      backgroundColor: pressWash(macOSLight, "hover"),
    });
    expect(style?.active).not.toMatchObject({
      backgroundColor: macOSLight.colors.active,
    });
    expect(
      contrastRatio(pressWash(macOSLight, "hover"), macOSLight.colors.hover) ??
        0,
    ).toBeGreaterThanOrEqual(decorativeFloor);
    expect(
      contrastRatio(macOSLight.colors.active, macOSLight.colors.hover) ?? 0,
    ).toBeLessThan(decorativeFloor);
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
