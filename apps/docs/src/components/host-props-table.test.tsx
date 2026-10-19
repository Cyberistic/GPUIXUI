import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HostPropsTable } from "./host-props-table";
import { sharedHostProps } from "@/lib/host-props";

/**
 * Guards the shared-prop table (plan 587). The props rows are rendered React,
 * so the page index cannot see them; the failure worth catching is a row that
 * silently disappears from the table while the module still documents it, or a
 * page that loses the block that explains the inherited props. The page is also
 * where `testId` and `style` stop being unexplained rows in 66 component
 * tables. Every expectation derives from the module, so a row cannot be added
 * without appearing.
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const componentApi = readFileSync(
  join(appRoot, "content", "docs", "component-api.mdx"),
  "utf8",
);

const html = renderToStaticMarkup(<HostPropsTable />);

describe("shared host props table", () => {
  it("renders one row per documented prop", () => {
    expect([...html.matchAll(/data-prop="/g)]).toHaveLength(
      sharedHostProps.length,
    );
    expect(
      sharedHostProps.filter(
        (prop) => !html.includes(`data-prop="${prop.name}"`),
      ),
    ).toEqual([]);
  });

  it("renders each row's meaning and the automation locator", () => {
    expect(html).toContain("A stable locator for automation");
    expect(html).toContain("testId");
    expect(html).toContain("Shared host props every component part inherits");
  });

  it("is mounted on Component API under Shared host props", () => {
    const start = componentApi.indexOf("## Shared host props");
    expect(start).toBeGreaterThan(-1);
    expect(componentApi.slice(start)).toContain("<HostPropsTable />");
  });
});
