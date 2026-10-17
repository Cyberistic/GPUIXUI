/**
 * Popover behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a panel that opens somewhere other than below its
 * trigger; a side other than the default being ignored; Escape not closing or not
 * returning focus; an outside press closing the panel and then the same click
 * re-opening it; a press inside the panel closing it; Tab trapping focus in a
 * non-modal surface; and a controlled popover that opens itself.
 */

import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../internal/button.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
} from "../internal/interaction.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";

/** A filter popover in a page with another control to press outside on. */
const Filters = ({
  open,
  onOpenChange,
  side,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly side?: "top" | "right" | "bottom" | "left";
}) => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
  >
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
      <PopoverContent testId="panel" side={side}>
        <text testId="panel-text">Visible columns</text>
      </PopoverContent>
    </Popover>
    <Button testId="elsewhere">Elsewhere</Button>
  </div>
);

/** A controlled popover that remembers what the caller was told. */
const Controlled = ({
  onOpenChange,
}: {
  readonly onOpenChange: () => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: 40 }}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange();
        }}
      >
        <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
        <PopoverContent testId="panel">
          <text>Visible columns</text>
        </PopoverContent>
      </Popover>
    </div>
  );
};

describe("Popover", () => {
  it("opens below its trigger when the trigger is clicked", () => {
    const popover = renderComponent(<Filters />);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    clickCentreOf(popover, "trigger");

    const trigger = boundsOf(popover, "trigger");
    const panel = boundsOf(popover, "panel");
    if (Option.isNone(trigger) || Option.isNone(panel)) {
      expect.fail("the trigger or the panel was not measured");
    }

    expect(panel.value.y).toBeGreaterThanOrEqual(
      trigger.value.y + trigger.value.height,
    );
    expect(panel.value.x).toBe(trigger.value.x);

    popover.unmount();
  });

  it("honours the side it is given", () => {
    const popover = renderComponent(<Filters side="right" />);
    clickCentreOf(popover, "trigger");

    const trigger = boundsOf(popover, "trigger");
    const panel = boundsOf(popover, "panel");
    if (Option.isNone(trigger) || Option.isNone(panel)) {
      expect.fail("the trigger or the panel was not measured");
    }

    expect(panel.value.x).toBeGreaterThanOrEqual(
      trigger.value.x + trigger.value.width,
    );

    popover.unmount();
  });

  it("closes on Escape and gives focus back to the trigger", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");

    popover.renderer.simulateKeystrokes("escape");

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(popover)).toEqual(Option.some("trigger"));

    popover.unmount();
  });

  it("closes on an outside press without re-opening on the following click", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");

    clickCentreOf(popover, "elsewhere");

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    // The next click on the trigger opens it again: the dismiss flag is spent.
    clickCentreOf(popover, "trigger");

    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("stays open on a press inside the panel", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");

    clickCentreOf(popover, "panel-text");

    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("closes on Tab so focus can leave a non-modal surface", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");

    expect(focusedTestId(popover)).toEqual(Option.some("panel"));

    popover.renderer.simulateKeystrokes("tab");

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    popover.unmount();
  });

  it("reports the change a controlled popover asks for and stays as told", () => {
    const onOpenChange = vi.fn();
    const popover = renderComponent(<Controlled onOpenChange={onOpenChange} />);

    clickCentreOf(popover, "trigger");

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("reads the popover role from whichever theme is active", () => {
    const assertTheme = (theme: TestTheme, popover: string): void => {
      const rendered = renderComponent(<Filters />, theme);
      clickCentreOf(rendered, "trigger");

      expect(
        rendered.renderer.findByTestId("panel")?.style.backgroundColor,
      ).toBe(popover);

      rendered.unmount();
    };

    assertTheme("dark", darkTheme.colors.popover);
    assertTheme("light", lightTheme.colors.popover);
  });

  it("keeps a closed controlled popover closed with an inline consumer", () => {
    const onOpenChange = vi.fn();
    const popover = renderComponent(
      <Filters open={false} onOpenChange={onOpenChange} />,
    );

    clickCentreOf(popover, "trigger");

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    popover.unmount();
  });
});
