/**
 * Collapsible behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a closed section that lost the state inside its body
 * (it used to unmount); a clipped body that stayed in the tab order (measured
 * `trigger → draft → after`, plan 372 §2); `aria-expanded` that disagreed with
 * the visible body; a trigger that only answered the mouse, not Enter/Space; a
 * controlled section that opened itself when the consumer kept `open={false}`;
 * Space toggling on key down instead of on release; and a body that snapped
 * instead of tweening to its measured height.
 */

import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible.js";

/** Whether a part is hidden while its section is closed. */
const isHidden = (root: ComponentTestRoot, testId: string): boolean =>
  root.renderer.findByTestId(testId)?.style.visibility === "hidden";

/** Advance the paused motion clock past a complete reveal. */
const settle = (root: ComponentTestRoot): void => {
  root.renderer.clockFastForward(200);
  root.renderer.dispatchNativeEvents();
};

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

/** A body with a real focus target inside it and a sibling after it. */
const Walkable = ({
  defaultOpen = false,
}: {
  readonly defaultOpen?: boolean;
}) => (
  <div testId="root">
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger testId="trigger">Advanced options</CollapsibleTrigger>
      <CollapsibleContent testId="content">
        <input testId="draft" />
      </CollapsibleContent>
    </Collapsible>
    <div role="button" tabIndex={0} testId="after">
      after
    </div>
  </div>
);

/** A body whose local state is what has to survive the close. */
const Stateful = () => {
  const [count, setCount] = useState(0);
  return (
    <Collapsible>
      <CollapsibleTrigger testId="trigger">Advanced options</CollapsibleTrigger>
      <CollapsibleContent testId="content">
        <div
          role="button"
          tabIndex={0}
          testId="bump"
          onClick={() => setCount((current) => current + 1)}
        >
          bump
        </div>
        <text testId="count">{String(count)}</text>
      </CollapsibleContent>
    </Collapsible>
  );
};

/** A body with a fixed natural height and a measurable sibling after it. */
const Measured = ({ animate = true }: { readonly animate?: boolean }) => (
  <div testId="root">
    <Collapsible>
      <CollapsibleTrigger testId="trigger">Advanced options</CollapsibleTrigger>
      <CollapsibleContent testId="content" animate={animate}>
        <div style={{ height: 60 }} />
      </CollapsibleContent>
    </Collapsible>
    <div testId="after" style={{ height: 20 }} />
  </div>
);

describe("Collapsible", () => {
  it("opens and closes on a click, keeping the body mounted", () => {
    const section = renderComponent(<Advanced />);

    expect(section.renderer.findByTestId("content")).toBeDefined();
    expect(isHidden(section, "content")).toBe(true);
    expect(section.renderer.findByTestId("trigger")?.customProps).toMatchObject(
      {
        "aria-expanded": false,
      },
    );

    clickCentreOf(section, "trigger");

    expect(isHidden(section, "content")).toBe(false);
    expect(section.renderer.getAllText()).toContain("Retry budget");
    expect(section.renderer.findByTestId("trigger")?.customProps).toMatchObject(
      {
        "aria-expanded": true,
      },
    );

    clickCentreOf(section, "trigger");
    settle(section);

    expect(isHidden(section, "content")).toBe(true);
    expect(section.renderer.findByTestId("trigger")?.customProps).toMatchObject(
      {
        "aria-expanded": false,
      },
    );

    section.unmount();
  });

  it("toggles from Enter and Space on the focused trigger", () => {
    const section = renderComponent(<Advanced />);

    section.renderer.focusElement(
      section.renderer.findByTestId("trigger")?.id ?? -1,
    );
    expect(focusedTestId(section)).toEqual(Option.some("trigger"));

    section.renderer.simulateKeystrokes("enter");
    expect(isHidden(section, "content")).toBe(false);

    const trigger = section.renderer.findByTestId("trigger");
    expect(trigger).toBeDefined();
    if (trigger === undefined) return;
    section.renderer.nativeSimulateKeyDown(trigger.id, "space");
    section.renderer.nativeSimulateKeyUp(trigger.id, "space");
    settle(section);
    expect(isHidden(section, "content")).toBe(true);

    section.unmount();
  });

  it("toggles Space on release, not on press", () => {
    const section = renderComponent(<Advanced />);
    const trigger = section.renderer.findByTestId("trigger");
    expect(trigger).toBeDefined();
    if (trigger === undefined) return;

    section.renderer.nativeSimulateKeyDown(trigger.id, "space");
    expect(isHidden(section, "content")).toBe(true);

    section.renderer.nativeSimulateKeyUp(trigger.id, "space");
    expect(isHidden(section, "content")).toBe(false);

    section.unmount();
  });

  it("stays closed in controlled mode until the consumer opens it", () => {
    const onOpenChange = vi.fn();
    const section = renderComponent(
      <Advanced open={false} onOpenChange={onOpenChange} />,
    );

    clickCentreOf(section, "trigger");

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(isHidden(section, "content")).toBe(true);
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

    expect(isHidden(section, "content")).toBe(false);

    section.unmount();
  });

  it("keeps a closed body out of the tab order", () => {
    const section = renderComponent(<Walkable />);
    section.renderer.focusElement(
      section.renderer.findByTestId("trigger")?.id ?? -1,
    );

    section.renderer.focusNextWithin(
      section.renderer.findByTestId("root")?.id ?? -1,
    );

    expect(focusedTestId(section)).toEqual(Option.some("after"));

    section.unmount();
  });

  it("puts the open body back in the tab order", () => {
    const section = renderComponent(<Walkable defaultOpen />);
    section.renderer.focusElement(
      section.renderer.findByTestId("trigger")?.id ?? -1,
    );

    section.renderer.focusNextWithin(
      section.renderer.findByTestId("root")?.id ?? -1,
    );

    expect(focusedTestId(section)).toEqual(Option.some("draft"));

    section.unmount();
  });

  it("keeps the state inside the body across a close and a re-open", () => {
    const section = renderComponent(<Stateful />);
    section.renderer.clockPause();

    clickCentreOf(section, "trigger");
    settle(section);
    clickCentreOf(section, "bump");
    expect(section.renderer.getAllText()).toContain("1");

    clickCentreOf(section, "trigger");
    settle(section);
    expect(isHidden(section, "content")).toBe(true);
    expect(section.renderer.getAllText()).toContain("1");

    clickCentreOf(section, "trigger");
    settle(section);
    expect(isHidden(section, "content")).toBe(false);
    expect(section.renderer.getAllText()).toContain("1");

    section.renderer.clockResume();
    section.unmount();
  });

  it("tweens the body to the measured content height", () => {
    const section = renderComponent(<Measured />);
    section.renderer.clockPause();
    const closed = requireBounds(section, "after").y;

    clickCentreOf(section, "trigger");
    section.renderer.clockFastForward(80);
    section.renderer.dispatchNativeEvents();

    const natural = requireBounds(section, "content").height;
    const mid = requireBounds(section, "after").y - closed;
    expect(natural).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(0);
    expect(Math.abs(mid - natural * 0.4)).toBeLessThanOrEqual(4);

    settle(section);
    expect(
      Math.abs(requireBounds(section, "after").y - closed - natural),
    ).toBeLessThanOrEqual(1);

    section.renderer.clockResume();
    section.unmount();
  });

  it("snaps instead of tweening when animate is false", () => {
    const section = renderComponent(<Measured animate={false} />);
    section.renderer.clockPause();
    const closed = requireBounds(section, "after").y;

    clickCentreOf(section, "trigger");
    section.renderer.clockFastForward(1);
    section.renderer.dispatchNativeEvents();

    const natural = requireBounds(section, "content").height;
    expect(
      Math.abs(requireBounds(section, "after").y - closed - natural),
    ).toBeLessThanOrEqual(1);

    section.renderer.clockResume();
    section.unmount();
  });
});
