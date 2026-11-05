import { Effect } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMermaid } from "../docs/mermaid";
import { DiagramView, renderOptionsOf } from "./DiagramView";
import { DiagramPlayground } from "./DiagramPlayground";
import { diagramTemplates } from "./templates";
import {
  builtinThemes,
  isDiagramTheme,
  mermaidThemes,
  peleVariables,
  themeSwatch,
  themeVariables,
} from "./theme";
import {
  clampScale,
  fitView,
  initialView,
  panBy,
  percentOf,
  wheelFactor,
  zoomTo,
} from "./zoom";

/**
 * diagram on Pele.
 *
 * The bugs these cases guard: a theme name that resolves to no palette would
 * paint every diagram in the page's roles while the picker says "ocean"; a
 * variable mapped to the wrong role would put a node's fill on the page
 * background; a zoom that scales around the origin instead of the pointer
 * would slide the diagram away under the cursor; and a template that Pele's
 * parser refuses would ship as a broken starting point.
 */

const render = (
  source: string,
  options?: Parameters<typeof renderMermaid>[1],
) =>
  Effect.runSync(
    Effect.match(renderMermaid(source, options), {
      onFailure: (error) => ({ ok: false as const, message: error.message }),
      onSuccess: (svg) => ({ ok: true as const, svg }),
    }),
  );

describe("the Mermaid renderer", () => {
  const markup = renderToStaticMarkup(
    <DiagramView
      chart={"flowchart LR\n  A[Ingest] --> B[Frame]"}
      config={{ theme: "ocean" }}
    />,
  );

  it("puts the parsed diagram in the markup with its labels", () => {
    expect(markup).toContain("<svg");
    expect(markup).toContain("Ingest");
    expect(markup).toContain("Frame");
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Diagram"');
  });

  it("paints the selected palette as Pele custom properties", () => {
    expect(markup).toContain('data-theme="ocean"');
    expect(markup).toContain("--pele-surface:");
    expect(markup).toContain("--pele-bg:");
    expect(markup).toContain("#eff6ff");
  });

  it("renders the parser's sentence instead of an empty frame", () => {
    const broken = renderToStaticMarkup(
      <DiagramView chart="this is not a diagram" />,
    );
    expect(broken).toContain("Syntax error");
    expect(broken).toContain("gx-diagram-message");
    expect(broken).not.toContain("<svg");
  });

  it("asks for a source when the chart is blank", () => {
    const empty = renderToStaticMarkup(<DiagramView chart="  " />);
    expect(empty).toContain("Enter a Mermaid diagram");
  });

  it("passes the supported render options and no invented ones", () => {
    expect(
      renderOptionsOf({
        theme: "dark",
        fontFamily: "Mono",
        fontSize: 16,
        maxWidth: 720,
        responsive: false,
      }),
    ).toEqual({
      fontFamily: "Mono",
      fontSize: 16,
      maxWidth: 720,
      responsive: false,
    });
    const sized = render("flowchart LR\n  A --> B", { fontSize: 20 });
    if (!sized.ok)
      throw new Error(`Pele refused the sized source: ${sized.message}`);
    expect(sized.svg).toContain("<svg");
  });
});

describe("the theme table", () => {
  it("resolves every built-in name", () => {
    const table = builtinThemes.map((name) => ({
      name,
      known: isDiagramTheme(name),
      variables: themeVariables(name),
      swatch: themeSwatch(name),
    }));
    expect(table.every((entry) => entry.known)).toBe(true);
    expect(table.every((entry) => entry.swatch.length > 0)).toBe(true);
    expect(
      table
        .filter((entry) => entry.name === "default")
        .every((entry) => entry.variables === undefined),
    ).toBe(true);
    expect(
      table
        .filter((entry) => entry.name !== "default")
        .every((entry) => entry.variables !== undefined),
    ).toBe(true);
  });

  it("resolves every named palette the picker offers", () => {
    const names = Object.keys(mermaidThemes);
    expect(names.length).toBeGreaterThan(10);
    expect(names.every(isDiagramTheme)).toBe(true);
    expect(
      names.every(
        (name) => isDiagramTheme(name) && themeVariables(name) !== undefined,
      ),
    ).toBe(true);
  });

  it("maps Mermaid's variables to Pele's roles", () => {
    expect(
      peleVariables({
        primaryColor: "#123456",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#654321",
        background: "#abcdef",
        textColor: "#111111",
        lineColor: "#222222",
        secondaryColor: "#333333",
        tertiaryColor: "#444444",
      }),
    ).toEqual({
      "--pele-surface": "#123456",
      "--pele-fg": "#ffffff",
      "--pele-border": "#654321",
      "--pele-bg": "#abcdef",
      "--pele-line": "#222222",
      "--pele-surface-alt": "#333333",
    });
  });

  it("ignores a Mermaid-only variable instead of painting nothing reads", () => {
    expect(peleVariables({ fontFamily: "Inter" })).toEqual({});
  });
});

describe("the zoom arithmetic", () => {
  it("keeps the point under the cursor still while the scale changes", () => {
    const before = { scale: 1, x: 0, y: 0 };
    const after = zoomTo(before, 2, { x: 100, y: 50 });
    expect(after.scale).toBe(2);
    // The content point at (100, 50) is still painted at (100, 50).
    expect(after.x + 100 * after.scale).toBeCloseTo(100, 6);
    expect(after.y + 50 * after.scale).toBeCloseTo(50, 6);
  });

  it("clamps a scale to the canvas bounds", () => {
    expect(clampScale(9)).toBe(5);
    expect(clampScale(0)).toBe(0.1);
    expect(clampScale(2, 0.5, 3)).toBe(2);
  });

  it("fits and centres content in a larger canvas", () => {
    const view = fitView(
      { width: 800, height: 400 },
      { width: 400, height: 400 },
      40,
    );
    expect(view.scale).toBeCloseTo(0.45, 6);
    expect(view.x).toBeCloseTo((400 - 800 * 0.45) / 2, 6);
  });

  it("answers a zero-sized drawing with the initial view, not NaN", () => {
    expect(
      fitView({ width: 0, height: 0 }, { width: 400, height: 400 }),
    ).toEqual({ scale: 1, x: 200, y: 200 });
  });

  it("pans by the pointer travel and reports the percentage", () => {
    expect(panBy(initialView(1), 12, -4)).toEqual({ scale: 1, x: 12, y: -4 });
    expect(percentOf(1.25)).toBe(125);
    expect(wheelFactor(0)).toBe(1);
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
  });
});

describe("the templates", () => {
  it("are all diagrams Pele can parse", () => {
    const results = diagramTemplates.map((template) => ({
      id: template.id,
      ok: render(template.chart).ok,
    }));
    expect(results.filter((result) => !result.ok)).toEqual([]);
  });

  it("are a copyable first line, not a second syntax", () => {
    expect(diagramTemplates.length).toBeGreaterThan(5);
    expect(
      diagramTemplates.every((template) => template.chart.trim().length > 0),
    ).toBe(true);
    expect(
      diagramTemplates.every(
        (template) => (template.chart.trim().split("\n")[0] ?? "").length > 0,
      ),
    ).toBe(true);
  });
});

describe("the playground", () => {
  const markup = renderToStaticMarkup(<DiagramPlayground />);

  it("mounts the source, the preview and the toolbar", () => {
    expect(markup).toContain("gx-diagram-toolbar");
    expect(markup).toContain("gx-diagram-input");
    expect(markup).toContain("Mermaid source");
    expect(markup).toContain("API request");
    expect(markup).toContain("gx-diagram-preview-bar");
    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).toContain("Copy SVG");
  });
});
