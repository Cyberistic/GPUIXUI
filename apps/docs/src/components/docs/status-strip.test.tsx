import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { inventory } from "../../lib/inventory-data";
import { inventoryUrl } from "../../lib/inventory-status";
import { StatusStrip } from "./status-strip";

/**
 * The strip is the only place a package page states the inventory's verdict, so
 * it has to print the row's own values — not a generic "documented" label — and
 * it has to stay silent on a page the inventory has no row for.
 */

const render = (title: string): string =>
  renderToStaticMarkup(<StatusStrip title={title} />);

describe("the status strip", () => {
  it("prints the row's status, its GPUix verdict and the inventory link", () => {
    const markup = render("Buttons");

    expect(markup).toContain("Status");
    expect(markup).toContain("done");
    expect(markup).toContain("GPUix support");
    expect(markup).toContain("partial");
    expect(markup).toContain(inventoryUrl);
  });

  it("prints a plain yes for a fully supported component", () => {
    const markup = render("Accordion");

    // Accordions is `done` with `yes`: the strip must not print a generic
    // verdict, or a partial component would look whole.
    expect(markup).toContain("Accordions");
    expect(markup).toMatch(/GPUix support <code[^>]*>yes<\/code>/);
    expect(markup).not.toContain("partial");
  });

  it("renders nothing on a page the inventory has no row for", () => {
    // `ThemeProvider` is the argued exemption: a provider is not a component.
    // `Grid` was the other until its Tier 1 row landed, so it must render now.
    expect(render("ThemeProvider")).toBe("");
    expect(render("Grid")).not.toBe("");
  });

  it("reads the row the inventory holds today", () => {
    const row = inventory.rows.find(
      (candidate) => candidate.name === "Buttons",
    );

    expect(row).toBeDefined();
    expect(render("Button")).toContain(row?.status ?? "");
  });

  it("prints the row a page publishes beyond its own words", () => {
    // Eight package pages opened with no strip at all: their titles name a
    // composition rather than the row's words (`Table sorting`, `Virtualization`,
    // `DropZone`), and the join knew one page per row. A page that publishes
    // several rows reports the first one declared, so a reader sees the row the
    // page is about rather than whichever the inventory lists first.
    expect(render("Table sorting")).toContain(
      'data-component="Sortable tables"',
    );
    expect(render("Table selection")).toContain(
      'data-component="Row selection"',
    );
    expect(render("Virtualization")).toContain(
      'data-component="Virtualized lists"',
    );
    expect(render("Docking layouts")).toContain(
      'data-component="Docking layouts"',
    );
    expect(render("Code editor")).toContain(
      'data-component="Code editor integration"',
    );
    expect(render("DropZone")).toContain(
      'data-component="File / folder selection"',
    );
  });
});
