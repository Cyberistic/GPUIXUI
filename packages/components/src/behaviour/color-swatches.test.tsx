/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ColorSwatches } from "../color-swatches.js";
import { requireBounds, settle } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

let page: ComponentTestRoot | undefined;

afterEach(() => {
  page?.unmount();
  page = undefined;
});

const COLORS = ["#111111", "#222222", "#333333"];

describe("ColorSwatches", () => {
  it("keeps every swatch its size inside a row", () => {
    page = renderComponent(
      <ColorSwatches
        testId="s"
        label="Accent"
        colors={COLORS}
        value={COLORS[0]}
      />,
    );
    settle(page);
    expect(requireBounds(page, "s-#333333").width).toBe(24);
  });

  it("chooses the colour Enter activates", () => {
    let chosen = "";
    const Host = () => {
      const [value, setValue] = useState(COLORS[0]);
      return (
        <ColorSwatches
          testId="s"
          label="Accent"
          colors={COLORS}
          value={value}
          onValueChange={(color) => {
            chosen = color;
            setValue(color);
          }}
        />
      );
    };
    page = renderComponent(<Host />);
    settle(page);
    page.renderer.focusElement(
      page.renderer.findByTestId("s-#333333")?.id ?? -1,
    );
    page.renderer.simulateKeystrokes("enter");
    settle(page);
    expect(chosen).toBe("#333333");
  });
});
