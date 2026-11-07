import { Option } from "effect";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  clickCentreOf,
  focusedTestId,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import {
  SegmentedControl,
  stepSegment,
  type SegmentedControlItem,
} from "../segmented-control.js";

const ITEMS: ReadonlyArray<SegmentedControlItem> = [
  { value: "list", label: "List" },
  { value: "board", label: "Board", disabled: true },
  { value: "calendar", label: "Calendar" },
];

let page: ComponentTestRoot | undefined;
afterEach(() => {
  page?.unmount();
  page = undefined;
  chosen = [];
});

let chosen: Array<string> = [];

const View = () => {
  const [view, setView] = useState("list");
  return (
    <div style={{ width: 300 }}>
      <SegmentedControl
        label="View"
        items={ITEMS}
        value={view}
        onValueChange={(next) => {
          chosen.push(next);
          setView(next);
        }}
      />
    </div>
  );
};

const viewOf = (): string | undefined => chosen.at(-1);

describe("SegmentedControl", () => {
  it("selects as the arrow moves, skipping a disabled segment", () => {
    page = renderComponent(<View />);
    page.renderer.focusElement(
      page.renderer.findByTestId("segment-list")?.id ?? -1,
    );
    page.renderer.simulateKeystrokes("right");
    settle(page);
    expect(viewOf()).toBe("calendar");
    expect(Option.getOrNull(focusedTestId(page))).toBe("segment-calendar");
  });

  it("selects the segment a reader presses", () => {
    page = renderComponent(<View />);
    clickCentreOf(page, "segment-calendar");
    settle(page);
    expect(viewOf()).toBe("calendar");
  });

  it("shares the track's width equally", () => {
    page = renderComponent(<View />);
    const list = requireBounds(page, "segment-list");
    const calendar = requireBounds(page, "segment-calendar");
    expect(Math.abs(list.width - calendar.width)).toBeLessThanOrEqual(1);
  });
});

describe("stepSegment", () => {
  it("stops at either end", () => {
    expect(Option.isNone(stepSegment(ITEMS, "calendar", 1))).toBe(true);
    expect(Option.isNone(stepSegment(ITEMS, "list", -1))).toBe(true);
    expect(Option.getOrNull(stepSegment(ITEMS, "calendar", -1))).toBe("list");
  });
});
