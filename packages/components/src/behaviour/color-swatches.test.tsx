/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ColorSwatches } from "../color-swatches.js";
import { clickCentreOf, settle } from "../internal/interaction.js";
import { renderComponent, type ComponentTestRoot } from "../internal/test-root.js";

let page: ComponentTestRoot | undefined;

afterEach(() => {
  page?.unmount();
  page = undefined;
});

const COLORS = ["#111111", "#222222", "#333333"];

describe("ColorSwatches", () => {
  it("chooses the colour that is pressed", () => {
    let chosen = "";
    const Host = () => {
      const [value, setValue] = useState(COLORS[0]);
      return (
        <ColorSwatches
          testId="swatches"
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
    clickCentreOf(page, "swatches-#333333");
    settle(page);
    expect(chosen).toBe("#333333");
  });
});
