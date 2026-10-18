import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { valueExports } from "@/lib/api-values.generated";
import { getMDXComponents } from "./mdx";
import { ValueIndex } from "./value-index";

/**
 * Guards the rendered Values API index (plan 490). The failure worth catching
 * is a generated index that renders fewer rows than it holds — a dropped
 * package, a row keyed twice, or a component that never reached the MDX map,
 * which is the failure `part-index.test.tsx` measured on 2026-10-18.
 */
const html = renderToStaticMarkup(<ValueIndex />);
const keys = valueExports.map((value) => `${value.package}#${value.name}`);

describe("value index", () => {
  it("is registered for MDX, not only for its own test", () => {
    expect(getMDXComponents().ValueIndex).toBe(ValueIndex);
  });

  it("renders every generated export exactly once", () => {
    const rendered = (html.match(/data-value="/g) ?? []).length;
    expect(rendered).toBe(valueExports.length);
    keys.forEach((key) => {
      expect(html).toContain(`data-value="${key}"`);
    });
    expect(new Set(keys).size).toBe(valueExports.length);
  });

  it("names every package that contributes a row", () => {
    new Set(valueExports.map((value) => value.package)).forEach(
      (packageName) => {
        expect(html).toContain(`data-package="${packageName}"`);
      },
    );
  });

  it("shows a helper and a record with their real summaries", () => {
    expect(html).toContain("checkboxState");
    expect(html).toContain("The state a checkbox is in, from its props.");
    expect(html).toContain("tabsMeta");
    expect(html).toContain("Inventory record");
  });

  it("marks the internal export and only the internal export", () => {
    const internal = valueExports.filter(
      (value) => value.visibility === "internal",
    );
    expect(internal.length).toBeGreaterThan(0);
    internal.forEach((value) => {
      const row = html.slice(
        html.indexOf(`data-value="${value.package}#${value.name}"`),
      );
      expect(row.slice(0, row.indexOf("</li>"))).toContain(">internal</span>");
    });
    const publicRow = html.slice(
      html.indexOf('data-value="@gpuixui/icons#iconPixels"'),
    );
    expect(publicRow.slice(0, publicRow.indexOf("</li>"))).not.toContain(
      ">internal</span>",
    );
  });
});
