import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotFound } from "../components/not-found";

/**
 * A missing address must not throw the reader out of the docs.
 *
 * The router's default 404 is outside the docs chrome — no brand, no
 * navigation, no search — so a stale link left the reader to edit the URL. The
 * page rendered here is the whole recovery path: it names the missing state and
 * links the pages that find things. The wiring is checked too, because a good
 * page that no route mounts is invisible.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markup = renderToStaticMarkup(<NotFound />);

describe("the not-found page", () => {
  it("says the page is missing and offers the pages that find things", () => {
    expect(markup).toContain("Page not found");
    expect(markup).toContain("404");

    const destinations = [
      "/docs",
      "/docs/installation",
      "/docs/getting-started",
      "/docs/components",
      "/docs/patterns",
      "/docs/reference",
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
