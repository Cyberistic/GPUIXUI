import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../internal/button.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
  pressKey,
  requireBounds,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";

const Filters = ({
  open,
  onOpenChange,
  side,
  align,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly side?: "top" | "right" | "bottom" | "left";
  readonly align?: "start" | "center" | "end";
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 300,
      padding: 40,
    }}
  >
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
      <PopoverContent testId="panel" side={side} align={align}>
        <text testId="panel-text">Visible columns</text>
      </PopoverContent>
    </Popover>
    <Button testId="elsewhere">Elsewhere</Button>
  </div>
);

const SidePopover = ({
  side,
}: {
  readonly side: "top" | "right" | "bottom" | "left";
}) => (
  <div style={{ paddingLeft: 400, paddingTop: 300 }}>
    <div style={{ display: "flex", flexDirection: "row" }}>
      <Popover>
        <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
        <PopoverContent testId="panel" side={side} style={{ width: 240 }}>
          <text>Visible columns</text>
        </PopoverContent>
      </Popover>
    </div>
  </div>
);

const EdgePopover = () => (
  <div style={{ display: "flex", justifyContent: "flex-end" }}>
    <Popover>
      <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
      <PopoverContent testId="panel" style={{ width: 240 }}>
        <text>Visible columns</text>
      </PopoverContent>
    </Popover>
  </div>
);

const AlignedPopover = ({
  align,
}: {
  readonly align?: "start" | "center" | "end";
}) => (
  <div style={{ paddingLeft: 540, paddingTop: 100 }}>
    <div style={{ display: "flex", flexDirection: "row" }}>
      <Popover>
        <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
        <PopoverContent testId="panel" align={align}>
          <text>Visible columns</text>
        </PopoverContent>
      </Popover>
    </div>
  </div>
);

const LowPopover = () => (
  <div style={{ display: "flex", flexDirection: "column", height: 780 }}>
    <div style={{ flexGrow: 1 }} />
    <Popover>
      <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
      <PopoverContent testId="panel">
        <text>Visible columns</text>
      </PopoverContent>
    </Popover>
  </div>
);

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
  it("opens centred below its trigger when the trigger is clicked", () => {
    const popover = renderComponent(<AlignedPopover />);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    clickCentreOf(popover, "trigger");
    settleMotion(popover);

    const trigger = boundsOf(popover, "trigger");
    const panel = boundsOf(popover, "panel");
    if (Option.isNone(trigger) || Option.isNone(panel)) {
      expect.fail("the trigger or the panel was not measured");
    }

    expect(panel.value.y).toBeGreaterThanOrEqual(
      trigger.value.y + trigger.value.height,
    );

    expect(
      Math.abs(
        panel.value.x +
          panel.value.width / 2 -
          (trigger.value.x + trigger.value.width / 2),
      ),
    ).toBeLessThanOrEqual(1);

    popover.unmount();
  });

  it("runs the trigger's action once on Enter and opens, with the alias standing in", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    const popover = renderComponent(
      <div style={{ padding: 40 }}>
        <Popover>
          <PopoverTrigger
            testId="trigger"
            onActivate={onActivate}
            onClick={onClick}
          >
            Filters
          </PopoverTrigger>
          <PopoverContent testId="panel">
            <text>Visible columns</text>
          </PopoverContent>
        </Popover>
      </div>,
    );
    popover.renderer.focusElement(
      popover.renderer.findByTestId("trigger")?.id ?? -1,
    );

    pressKey(popover, "enter");

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("keeps the deprecated onClick as the trigger's action alias", () => {
    const onClick = vi.fn();
    const popover = renderComponent(
      <div style={{ padding: 40 }}>
        <Popover>
          <PopoverTrigger testId="trigger" onClick={onClick}>
            Filters
          </PopoverTrigger>
          <PopoverContent testId="panel">
            <text>Visible columns</text>
          </PopoverContent>
        </Popover>
      </div>,
    );
    popover.renderer.focusElement(
      popover.renderer.findByTestId("trigger")?.id ?? -1,
    );

    pressKey(popover, "enter");

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("honours the side it is given", () => {
    const popover = renderComponent(<Filters side="right" />);
    clickCentreOf(popover, "trigger");
    settleMotion(popover);

    const trigger = requireBounds(popover, "trigger");
    const panel = requireBounds(popover, "panel");

    expect(panel.x).toBe(trigger.x + trigger.width + 6);

    popover.unmount();
  });

  it("opens on each of the four sides it is asked for", () => {
    const sides = [
      [
        "top",
        (
          trigger: ReturnType<typeof requireBounds>,
          panel: ReturnType<typeof requireBounds>,
        ) => expect(panel.y + panel.height).toBe(trigger.y - 6),
      ],
      [
        "bottom",
        (
          trigger: ReturnType<typeof requireBounds>,
          panel: ReturnType<typeof requireBounds>,
        ) => expect(panel.y).toBe(trigger.y + trigger.height + 6),
      ],
      [
        "right",
        (
          trigger: ReturnType<typeof requireBounds>,
          panel: ReturnType<typeof requireBounds>,
        ) => expect(panel.x).toBe(trigger.x + trigger.width + 6),
      ],
      [
        "left",
        (
          trigger: ReturnType<typeof requireBounds>,
          panel: ReturnType<typeof requireBounds>,
        ) => expect(panel.x + panel.width).toBe(trigger.x - 6),
      ],
    ] as const;

    for (const [side, expectGap] of sides) {
      const popover = renderComponent(<SidePopover side={side} />);
      try {
        clickCentreOf(popover, "trigger");
        settleMotion(popover);
        expectGap(
          requireBounds(popover, "trigger"),
          requireBounds(popover, "panel"),
        );
      } finally {
        popover.unmount();
      }
    }
  });

  it("pulls a side-facing panel back inside the window at the edge", () => {
    const popover = renderComponent(<EdgePopover />);
    try {
      clickCentreOf(popover, "trigger");
      settleMotion(popover);

      const window = popover.renderer.getWindowSize();
      const trigger = requireBounds(popover, "trigger");
      const panel = requireBounds(popover, "panel");

      expect(panel.y).toBe(trigger.y + trigger.height + 6);
      expect(panel.x + panel.width).toBe(window.width - 8);
      expect(panel.x).toBeLessThan(trigger.x);
    } finally {
      popover.unmount();
    }
  });

  it("opens a panel on each alignment it is asked for", () => {
    const alignments = [
      [
        "start",
        (
          trigger: ReturnType<typeof requireBounds>,
          panel: ReturnType<typeof requireBounds>,
        ) => expect(panel.x).toBe(trigger.x),
      ],
      [
        "center",
        (
          trigger: ReturnType<typeof requireBounds>,
          panel: ReturnType<typeof requireBounds>,
        ) =>
          expect(
            Math.abs(
              panel.x + panel.width / 2 - (trigger.x + trigger.width / 2),
            ),
          ).toBeLessThanOrEqual(1),
      ],
      [
        "end",
        (
          trigger: ReturnType<typeof requireBounds>,
          panel: ReturnType<typeof requireBounds>,
        ) => expect(panel.x + panel.width).toBe(trigger.x + trigger.width),
      ],
    ] as const;

    for (const [align, expectRelation] of alignments) {
      const popover = renderComponent(<AlignedPopover align={align} />);
      try {
        clickCentreOf(popover, "trigger");
        settleMotion(popover);

        const window = popover.renderer.getWindowSize();
        const trigger = requireBounds(popover, "trigger");
        const panel = requireBounds(popover, "panel");

        expectRelation(trigger, panel);
        expect(panel.x).toBeGreaterThanOrEqual(0);
        expect(panel.x + panel.width).toBeLessThanOrEqual(window.width);
      } finally {
        popover.unmount();
      }
    }
  });

  it("opens above a trigger near the window bottom instead of covering it", () => {
    const popover = renderComponent(<LowPopover />);
    clickCentreOf(popover, "trigger");
    settleMotion(popover);

    const trigger = requireBounds(popover, "trigger");
    const panel = requireBounds(popover, "panel");

    expect(panel.y + panel.height).toBeLessThanOrEqual(trigger.y);

    popover.unmount();
  });

  it("closes on Escape and gives focus back to the trigger", async () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");

    popover.renderer.simulateKeystrokes("escape");

    expect(focusedTestId(popover)).toEqual(Option.some("trigger"));
    await waitFor(() =>
      expect(popover.renderer.findByTestId("panel")).toBeUndefined(),
    );

    popover.unmount();
  });

  it("closes on an outside press without re-opening on the following click", async () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");

    clickCentreOf(popover, "elsewhere");

    await waitFor(() =>
      expect(popover.renderer.findByTestId("panel")).toBeUndefined(),
    );

    await Promise.resolve();

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

  it("closes on Tab so focus can leave a non-modal surface", async () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");

    expect(focusedTestId(popover)).toEqual(Option.some("panel"));

    popover.renderer.simulateKeystrokes("tab");

    await waitFor(() =>
      expect(popover.renderer.findByTestId("panel")).toBeUndefined(),
    );

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

  it("feeds both the internal and the caller's trigger ref", () => {
    const ref = createRef<PublicInstance>();
    const popover = renderComponent(
      <Popover>
        <PopoverTrigger ref={ref} testId="trigger">
          Filters
        </PopoverTrigger>
        <PopoverContent testId="panel">
          <text>Visible columns</text>
        </PopoverContent>
      </Popover>,
    );

    expect(ref.current?.id).toBe(popover.renderer.findByTestId("trigger")?.id);

    clickCentreOf(popover, "trigger");
    popover.renderer.simulateKeystrokes("escape");
    expect(focusedTestId(popover)).toEqual(Option.some("trigger"));

    popover.unmount();
  });
});
