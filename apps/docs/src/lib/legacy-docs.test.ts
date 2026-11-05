import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { legacyDocsRedirect } from "./legacy-docs";

/**
 * Bug guarded: the docs moved from `/docs/<path>` to the site root, and a
 * published link must keep working. A retired page answers **301** to its root
 * twin, `/docs` answers **301** to the landing, and the query a reader followed
 * travels with them — a `?scene=` link keeps the view it was shared with.
 */

const legacyRoutes = new URL("../routes/docs/", import.meta.url);

describe("the docs' old prefix", () => {
  it("moves a page to the same path at the root", () => {
    const response = legacyDocsRedirect("components/accordion", "");

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/components/accordion");
  });

  it("moves the docs root to the landing", () => {
    const response = legacyDocsRedirect("", "?scene=parity");

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/?scene=parity");
  });

  it("is the redirect both legacy routes throw", () => {
    const routes = ["index.tsx", "$.tsx"].map((name) =>
      readFileSync(new URL(name, legacyRoutes), "utf8"),
    );

    expect(
      routes.filter(
        (source) =>
          !source.includes("legacyDocsRedirect(") ||
          !source.includes("throw legacyDocsRedirect("),
      ),
    ).toEqual([]);
  });
});
