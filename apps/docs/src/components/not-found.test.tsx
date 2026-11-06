import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotFound } from "../components/not-found";

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = renderToStaticMarkup(<NotFound />);

describe("the not-found page", () => {
  it("says the page is missing and offers the pages that find things", () => {
    expect(markup).toContain("Page not found");
    expect(markup).toContain("404");

    const destinations = [
      "/introduction",
      "/getting-started",
      "/components",
      "/blocks",
      "/reference",
    ];

    expect(
      destinations.filter((href) => !markup.includes(`href="${href}"`)),
    ).toEqual([]);
  });

  it("is the page the root route renders for a missing address", () => {
    const route = read("apps/docs/src/routes/__root.tsx");

    expect(route).toContain(
      'import { NotFound } from "@/components/not-found"',
    );
    expect(route).toContain("notFoundComponent: NotFound");
  });
});
