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
    expect(render("Grid")).toBe("");
  });

  it("reads the row the inventory holds today", () => {
    const row = inventory.rows.find(
      (candidate) => candidate.name === "Buttons",
    );

    expect(row).toBeDefined();
    expect(render("Button")).toContain(row?.status ?? "");
  });
});
