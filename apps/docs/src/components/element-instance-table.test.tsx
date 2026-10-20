import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { instanceRows } from "@/lib/element-instance";
import { getMDXComponents } from "./mdx";
import { ElementInstanceTable } from "./element-instance-table";

/**
 * Guards the instance table (plan 624). The rows are rendered React, so the page
 * index cannot see them, and the failure worth catching is a member that
 * silently disappears from the table while the module still documents it — or a
 * page that keeps the prose but loses the table that makes it checkable. Every
 * expectation derives from `instanceRows`, which `instanceViolations` pins to
 * the installed declarations.
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const componentApi = readFileSync(
  join(appRoot, "content", "docs", "component-api.mdx"),
  "utf8",
);

const html = renderToStaticMarkup(<ElementInstanceTable />);

describe("element instance table", () => {
  it("renders one row per documented member, in order", () => {
    expect(
      [...html.matchAll(/data-member="([^"]+)"/g)].map((m) => m[1]),
    ).toEqual(instanceRows.map((member) => member.name));
  });

  it("marks an optional member and prints its type", () => {
    expect(html).toContain("scrollIntoView?");
    expect(html).toContain("() =&gt; void");
    expect(html).toContain("ElementType");
  });

  it("renders each member's meaning", () => {
    const text = html
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
    expect(
      instanceRows.filter((member) => !text.includes(member.summary)),
    ).toEqual([]);
  });

  it("is registered in the MDX component map", () => {
    expect(getMDXComponents().ElementInstanceTable).toBe(ElementInstanceTable);
  });

  it("is mounted on Component API under Refs and element handles", () => {
    const start = componentApi.indexOf("## Refs and element handles");
    expect(start).toBeGreaterThan(-1);
    expect(componentApi.slice(start)).toContain("<ElementInstanceTable />");
  });
});
