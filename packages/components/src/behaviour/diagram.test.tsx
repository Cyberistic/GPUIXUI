import { afterEach, describe, expect, it } from "vitest";
import { Diagram } from "../diagram.js";
import { a11yNodes } from "../internal/a11y.js";
import { renderComponent } from "../internal/test-root.js";

const SOURCE = `flowchart LR
  A[Author] --> B[Component]
  B --> C[Reader]`;

let mounted: { readonly unmount: () => void } | undefined;

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
});

describe("Diagram", () => {
  it("paints the drawing as one element", () => {
    const diagram = (mounted = renderComponent(
      <Diagram aria-label="The render path" source={SOURCE} testId="diagram" />,
    ));
    const drawing = diagram.renderer.findByTestId("diagram-drawing");
    expect(drawing).toBeDefined();

    expect(diagram.renderer.getAllText()).toEqual([]);
  });

  it("carries the drawing's markup as a data URL the runtime decodes", () => {
    const diagram = (mounted = renderComponent(
      <Diagram aria-label="The render path" source={SOURCE} testId="diagram" />,
    ));
    const drawing = diagram.renderer.findByTestId("diagram-drawing");
    const src = drawing?.customProps?.src;
    expect(typeof src).toBe("string");
    expect(String(src).startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("bakes the theme's colours into the drawing", () => {
    const diagram = (mounted = renderComponent(
      <Diagram aria-label="The render path" source={SOURCE} testId="diagram" />,
    ));
    const drawing = diagram.renderer.findByTestId("diagram-drawing");
    const src = String(drawing?.customProps?.src ?? "");
    const payload = src.slice("data:image/svg+xml;base64,".length);
    const markup = Buffer.from(payload, "base64").toString("utf8");

    expect(markup).not.toContain("var(--pele-");
  });

  it("names the drawing for a reader", () => {
    const diagram = (mounted = renderComponent(
      <Diagram aria-label="The render path" source={SOURCE} testId="diagram" />,
    ));
    const named = a11yNodes(diagram.renderer).some(
      (node) => node.name === "The render path",
    );
    expect(named).toBe(true);
  });

  it("paints the parser's sentence when the source does not parse", () => {
    const diagram = (mounted = renderComponent(
      <Diagram
        aria-label="A broken diagram"
        source="this is not a diagram"
        testId="broken"
      />,
    ));

    expect(diagram.renderer.findByTestId("broken-error")).toBeDefined();
    expect(diagram.renderer.findByTestId("broken-drawing")).toBeUndefined();
    expect(diagram.renderer.getAllText().join(" ").length).toBeGreaterThan(0);
  });

  it("paints a caption under the drawing", () => {
    const diagram = (mounted = renderComponent(
      <Diagram
        aria-label="The render path"
        source={SOURCE}
        caption="How a component becomes a picture"
        testId="captioned"
      />,
    ));
    expect(diagram.renderer.getAllText()).toContain(
      "How a component becomes a picture",
    );
  });
});
