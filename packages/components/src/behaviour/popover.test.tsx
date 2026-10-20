/**
 * Popover behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a panel that opens somewhere other than below its
 * trigger; a side other than the default being ignored; Escape not closing or not
 * returning focus; an outside press closing the panel and then the same click
 * re-opening it; a press inside the panel closing it; a controlled popover that
 * opens itself; Tab closing a multi-control panel on the first press, so its
 * second control was unreachable; and Tab closing the panel while leaving focus
 * on the unmounted surface (`null`), stranding a keyboard user. A caller `ref` on
 * the trigger was also discarded in favour of the internal one, so the picker that
 * composes this trigger lost focus after a selection. A held trigger press closed
 * on the press and re-opened on the release, because the one-gesture mark was
 * cleared before the click (plan 583). Inside a dialog, one `Tab` moved focus
 * twice — the walk then the modal's trap — so a control was skipped and the
 * backward exit stranded focus (plan 719). A popover mounted open together with
 * its dialog pushed its layer before the dialog's, so one Escape closed both
 * (plan 732).
 */

import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../internal/button.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  boundsOf,
  clickCentreOf,
  finishMotion,
  focusedTestId,
  isShown,
  nextTask,
  requireBounds,
} from "../internal/interaction.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";

/** A filter popover in a page with another control to press outside on. */
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
    style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
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

/** A control-dense popover: the column chooser a keyboard user has to walk. */
const Columns = ({
  open,
  onOpenChange,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}) => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
  >
    <Button testId="before">Before</Button>
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger testId="trigger">Columns</PopoverTrigger>
      <PopoverContent testId="panel">
        <Button testId="first">First</Button>
        <Button testId="second">Second</Button>
        <Button testId="third">Third</Button>
      </PopoverContent>
    </Popover>
    <Button testId="elsewhere">Elsewhere</Button>
  </div>
);

/** The same panel inside a dialog, with app controls on both sides of it. */
const ColumnsInDialog = ({
  onKeyDown,
}: {
  readonly onKeyDown?: () => void;
}) => {
  const [dialogOpen, setDialogOpen] = useState(true);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent label="Settings" testId="dialog" onKeyDown={onKeyDown}>
        <DialogTitle>Settings</DialogTitle>
        <Button testId="before">Before</Button>
        <Popover>
          <PopoverTrigger testId="trigger">Columns</PopoverTrigger>
          <PopoverContent testId="panel">
            <Button testId="first">First</Button>
            <Button testId="second">Second</Button>
            <Button testId="third">Third</Button>
          </PopoverContent>
        </Popover>
        <Button testId="after">After</Button>
      </DialogContent>
    </Dialog>
  );
};

/** A popover restored open inside a dialog that is open at the same commit. */
const OpenInOpenDialog = () => {
  const [dialogOpen, setDialogOpen] = useState(true);
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent label="Settings" testId="dialog">
        <DialogTitle>Settings</DialogTitle>
        <Button testId="before">Before</Button>
        <Popover defaultOpen>
          <PopoverTrigger testId="trigger">Columns</PopoverTrigger>
          <PopoverContent testId="panel">
            <Button testId="first">First</Button>
          </PopoverContent>
        </Popover>
      </DialogContent>
    </Dialog>
  );
};

/** A panel whose first tab stop can disappear while it is open. */
const Removable = () => {
  const [showFirst, setShowFirst] = useState(true);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
    >
      <Popover>
        <PopoverTrigger testId="trigger">Open</PopoverTrigger>
        <PopoverContent testId="panel">
          {showFirst ? <Button testId="first">First</Button> : null}
          <Button testId="remove" onClick={() => setShowFirst(false)}>
            Remove
          </Button>
        </PopoverContent>
      </Popover>
      <Button testId="elsewhere">Elsewhere</Button>
    </div>
  );
};

/** A trigger near the window centre, where a centred panel has room to sit. */
const CentredPopover = () => (
  <div style={{ paddingLeft: 540, paddingTop: 100 }}>
    <Popover>
      <PopoverTrigger testId="trigger">Filters</PopoverTrigger>
      <PopoverContent testId="panel" align="center">
        <text>Visible columns</text>
      </PopoverContent>
    </Popover>
  </div>
);

/** A trigger at the bottom of the window, where a downside panel cannot fit. */
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
    finishMotion(popover);

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
    finishMotion(popover);

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

  it("centres a requested panel on its trigger", () => {
    const popover = renderComponent(<CentredPopover />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    const trigger = requireBounds(popover, "trigger");
    const panel = requireBounds(popover, "panel");

    // GPUix 0.10.0 centres on the trigger's containing block, not the trigger;
    // the component maps `center` to `start` plus the measured half difference
    // (plan 323).
    expect(
      Math.abs(panel.x + panel.width / 2 - (trigger.x + trigger.width / 2)),
    ).toBeLessThanOrEqual(1);

    popover.unmount();
  });

  it("opens above a trigger near the window bottom instead of covering it", () => {
    const popover = renderComponent(<LowPopover />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    const trigger = requireBounds(popover, "trigger");
    const panel = requireBounds(popover, "panel");

    // `fit="snap"` would clamp the panel up over the trigger; the component
    // flips to the top side, which has room (plan 156 §8, plan 323).
    expect(panel.y + panel.height).toBeLessThanOrEqual(trigger.y);

    popover.unmount();
  });

  it("closes on Escape and gives focus back to the trigger", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("escape");
    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(popover)).toEqual(Option.some("trigger"));

    popover.unmount();
  });

  it("closes on an outside press without re-opening on the following click", async () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    clickCentreOf(popover, "elsewhere");
    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    // The real runtime delivers the press and the next click in separate tasks,
    // so the one-gesture dismiss mark has been cleared by now.
    await Promise.resolve();

    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("stays closed after a held trigger press, and a new press opens it", async () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    const { x, y, width, height } = requireBounds(popover, "trigger");
    popover.renderer.nativeSimulateMouseDown(x + width / 2, y + height / 2);
    // The runtime delivers the release in a later task; a one-gesture mark
    // cleared on a microtask was already gone, so the click re-opened the panel.
    await new Promise((resolve) => setTimeout(resolve, 10));
    popover.renderer.nativeSimulateMouseUp(x + width / 2, y + height / 2);
    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("stays open on a press inside the panel", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    clickCentreOf(popover, "panel-text");

    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("closes on Tab and gives focus to the next app control", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    expect(focusedTestId(popover)).toEqual(Option.some("panel"));

    popover.renderer.simulateKeystrokes("tab");
    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    // The surface is unmounted, so leaving focus on it would strand the user.
    expect(focusedTestId(popover)).toEqual(Option.some("elsewhere"));

    popover.unmount();
  });

  it("opens with focus on the panel's first tab stop", () => {
    const popover = renderComponent(<Columns />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    expect(focusedTestId(popover)).toEqual(Option.some("first"));

    popover.unmount();
  });

  it("moves to the next control on Tab and keeps the panel open", () => {
    const popover = renderComponent(<Columns />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("second"));

    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("third"));
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("closes past the last control and continues after the trigger", () => {
    const popover = renderComponent(<Columns />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("tab");
    popover.renderer.simulateKeystrokes("tab");
    popover.renderer.simulateKeystrokes("tab");
    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(popover)).toEqual(Option.some("elsewhere"));

    popover.unmount();
  });

  it("walks backwards on Shift+Tab and leaves before the first control", () => {
    const popover = renderComponent(<Columns />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("second"));

    popover.renderer.simulateKeystrokes("shift-tab");
    expect(focusedTestId(popover)).toEqual(Option.some("first"));
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.renderer.simulateKeystrokes("shift-tab");
    finishMotion(popover);
    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(popover)).toEqual(Option.some("before"));

    popover.unmount();
  });

  it("walks forward again after a step back", () => {
    const popover = renderComponent(<Columns />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("second"));

    popover.renderer.simulateKeystrokes("shift-tab");
    expect(focusedTestId(popover)).toEqual(Option.some("first"));

    // Turning round starts a new walk: `second` was reached on the way out, not
    // on this pass, so arriving there again is not a wrap (plan 718).
    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("second"));
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("third"));
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.renderer.simulateKeystrokes("tab");
    finishMotion(popover);
    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(popover)).toEqual(Option.some("elsewhere"));

    popover.unmount();
  });

  it("leaves before the first control after turning round", () => {
    const popover = renderComponent(<Columns />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("tab");
    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("third"));

    popover.renderer.simulateKeystrokes("shift-tab");
    popover.renderer.simulateKeystrokes("shift-tab");
    expect(focusedTestId(popover)).toEqual(Option.some("first"));
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.renderer.simulateKeystrokes("shift-tab");
    finishMotion(popover);
    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(popover)).toEqual(Option.some("before"));

    popover.unmount();
  });

  it("closes instead of trapping when the first tab stop is removed", () => {
    const popover = renderComponent(<Removable />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("remove"));

    popover.renderer.simulateKeystrokes("enter");
    expect(popover.renderer.findByTestId("first")).toBeUndefined();

    popover.renderer.simulateKeystrokes("tab");
    finishMotion(popover);
    expect(popover.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(popover)).toEqual(Option.some("elsewhere"));

    popover.unmount();
  });

  it("reports the change a controlled popover asks for and stays as told", () => {
    const onOpenChange = vi.fn();
    const popover = renderComponent(<Controlled onOpenChange={onOpenChange} />);

    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    popover.unmount();
  });

  it("reads the popover role from whichever theme is active", () => {
    const assertTheme = (theme: TestTheme, popover: string): void => {
      const rendered = renderComponent(<Filters />, theme);
      clickCentreOf(rendered, "trigger");
      finishMotion(rendered);

      const surface = rendered.renderer.findByTestId("panel");
      expect(surface?.style.backgroundColor).toBe(popover);

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
    finishMotion(popover);

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

    // The internal ref still works: Escape returns focus to the trigger.
    clickCentreOf(popover, "trigger");
    finishMotion(popover);
    popover.renderer.simulateKeystrokes("escape");
    expect(focusedTestId(popover)).toEqual(Option.some("trigger"));

    popover.unmount();
  });

  it("enters with the 100 ms fade and the side slide", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    const animated = popover.renderer
      .findByType("div")
      .filter((element) => element.customProps?.motion !== undefined);

    expect(animated).toHaveLength(1);
    expect(animated[0]?.customProps?.motion).toEqual(
      expect.objectContaining({
        initial: { opacity: 0, top: -8 },
        animate: { opacity: 1, top: 0 },
        transition: { duration: 0.1, ease: "easeOut" },
      }),
    );

    popover.unmount();
  });

  it("keeps the panel for its exit, then unmounts it", () => {
    const popover = renderComponent(<Filters />);
    clickCentreOf(popover, "trigger");
    finishMotion(popover);

    popover.renderer.simulateKeystrokes("escape");

    expect(focusedTestId(popover)).toEqual(Option.some("trigger"));
    expect(popover.renderer.findByTestId("panel")).toBeDefined();

    finishMotion(popover);

    expect(popover.renderer.findByTestId("panel")).toBeUndefined();

    popover.unmount();
  });

  it("does not take focus from a controlled close the caller refuses", () => {
    const onOpenChange = vi.fn();
    const popover = renderComponent(
      <Filters open={true} onOpenChange={onOpenChange} />,
    );
    finishMotion(popover);

    expect(focusedTestId(popover)).toEqual(Option.some("panel"));

    popover.renderer.simulateKeystrokes("escape");
    finishMotion(popover);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(popover.renderer.findByTestId("panel")).toBeDefined();
    expect(focusedTestId(popover)).toEqual(Option.some("panel"));

    popover.unmount();
  });

  it("keeps Tab inside a panel whose close the caller refuses", () => {
    const onOpenChange = vi.fn();
    const popover = renderComponent(
      <Columns open={true} onOpenChange={onOpenChange} />,
    );
    finishMotion(popover);

    expect(focusedTestId(popover)).toEqual(Option.some("first"));
    popover.renderer.simulateKeystrokes("tab");
    popover.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(popover)).toEqual(Option.some("third"));

    // The next Tab asks to leave; the caller refuses, so nothing may move.
    popover.renderer.simulateKeystrokes("tab");
    finishMotion(popover);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(popover.renderer.findByTestId("panel")).toBeDefined();
    expect(focusedTestId(popover)).toEqual(Option.some("third"));

    popover.unmount();
  });

  it("walks its own controls inside a dialog", () => {
    const onKeyDown = vi.fn();
    const scene = renderComponent(<ColumnsInDialog onKeyDown={onKeyDown} />);

    clickCentreOf(scene, "trigger");
    finishMotion(scene);
    expect(focusedTestId(scene)).toEqual(Option.some("first"));

    // The modal's Tab trap runs on the same event; only the walk may move
    // focus, so one press reaches one control (plan 719).
    scene.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(scene)).toEqual(Option.some("second"));

    scene.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(scene)).toEqual(Option.some("third"));
    expect(scene.renderer.findByTestId("panel")).toBeDefined();

    scene.renderer.simulateKeystrokes("tab");
    finishMotion(scene);
    expect(scene.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(scene)).toEqual(Option.some("after"));

    // A claimed key still reaches the dialog's own caller.
    expect(onKeyDown).toHaveBeenCalledTimes(3);

    scene.unmount();
  });

  it("walks backwards inside a dialog and leaves before the trigger", () => {
    const scene = renderComponent(<ColumnsInDialog />);

    clickCentreOf(scene, "trigger");
    finishMotion(scene);
    expect(focusedTestId(scene)).toEqual(Option.some("first"));

    scene.renderer.simulateKeystrokes("shift-tab");
    finishMotion(scene);

    expect(scene.renderer.findByTestId("panel")).toBeUndefined();
    expect(focusedTestId(scene)).toEqual(Option.some("before"));

    scene.unmount();
  });
  it("keeps a popover mounted with its dialog on top", async () => {
    const scene = renderComponent(<OpenInOpenDialog />);

    expect(isShown(scene, "panel")).toBe(true);

    await nextTask();
    scene.renderer.simulateKeystrokes("escape");
    finishMotion(scene);

    // The panel is painted inside the dialog, so it is the layer Escape reaches.
    expect(isShown(scene, "panel")).toBe(false);
    expect(isShown(scene, "before")).toBe(true);
    expect(focusedTestId(scene)).toEqual(Option.some("trigger"));

    scene.unmount();
  });
});
