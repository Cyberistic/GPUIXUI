import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { requireBounds, settle } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { Knob } from "../knob.js";

let page: ComponentTestRoot | undefined;
afterEach(() => {
  page?.unmount();
  page = undefined;
});

let seen: Array<number> = [];
const View = ({ disabled }: { readonly disabled?: boolean }) => {
  const [value, setValue] = useState(50);
  return (
    <div style={{ padding: 200 }}>
      <Knob
        label="Volume"
        testId="knob"
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          seen.push(next);
          setValue(next);
        }}
      />
    </div>
  );
};
const open = (disabled?: boolean) => {
  seen = [];
  page = renderComponent(<View disabled={disabled} />);
  settle(page);
  return page;
};
const drag = (root: ComponentTestRoot, rise: number) => {
  const box = requireBounds(root, "knob");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  root.renderer.nativeSimulateMouseMove(x, y);
  root.renderer.nativeSimulateMouseDown(x, y, 0);
  root.renderer.nativeSimulateMouseMove(x, y - rise, 0);
  root.renderer.flush();
  root.renderer.nativeSimulateMouseUp(x, y - rise, 0);
  settle(root);
};

describe("Knob", () => {
  it("turns up as the pointer drags upward, past the knob's own edge", () => {
    drag(open(), 80);
    expect(seen.at(-1)).toBe(100);
  });

  it("stops following after the button is released", () => {
    const root = open();
    drag(root, 16);
    const count = seen.length;
    const box = requireBounds(root, "knob");
    root.renderer.nativeSimulateMouseMove(box.x + 4, box.y + 4);
    settle(root);
    expect(seen.length).toBe(count);
  });

  it("steps with the arrow keys once focused", () => {
    const root = open();
    root.renderer.focusElement?.(root.renderer.findByTestId("knob")?.id ?? -1);
    root.renderer.simulateKeystrokes("up");
    settle(root);
    expect(seen).toEqual([51]);
  });

  it("moves the indicator with the value", () => {
    const root = open();
    const before = requireBounds(root, "knob-indicator");
    drag(root, 80);
    const after = requireBounds(root, "knob-indicator");
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeGreaterThan(before.y);
  });

  it("ignores a disabled knob", () => {
    drag(open(true), 80);
    expect(seen).toEqual([]);
  });
});
