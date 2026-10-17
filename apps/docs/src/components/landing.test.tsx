import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { Landing, QUICK_START } from "./landing";

/**
 * Guards the landing page (plan 410 §"Showcase quality": a useful landing page
 * and quick-start). The failure it catches is drift: the quick start is the
 * second place a newcomer reads the install commands, so it must be exactly the
 * first shell block of `installation.mdx` — a page edited on its own would
 * otherwise send readers down a command sequence the install page no longer
 * documents.
 *
 * `node:fs` rather than the Effect `FileSystem` service, as in `content.test.ts`
 * and `registry.test.ts`: this package is a browser app whose tests read the
 * content tree directly, and the Effect runtime must not reach its bundle.
 */
const installation = readFileSync(
  new URL("../../content/docs/installation.mdx", import.meta.url),
  "utf8",
);

const installationCommands = (
  installation.match(/```sh\n([\s\S]*?)```/)?.[1] ?? ""
)
  .trim()
  .split("\n");

const html = renderToStaticMarkup(<Landing />);

describe("landing page", () => {
  it("shows the same quick start as the installation page", () => {
    expect([...QUICK_START]).toEqual(installationCommands);
    Arr.forEach(QUICK_START, (command) => {
      expect(html).toContain(command);
    });
  });

  it("names the example runner and the check that runs without a window", () => {
    // Plan 436: the quick start is `basic-app dev`, whose script runs Bun and
    // then needs a desktop session. Presenting it as runnable everywhere was
    // the same truth failure as the playground prose.
    expect(html).toContain("Bun");
    expect(html).toContain("check-types");
  });

  it("links to the docs it describes", () => {
    Arr.forEach(
      [
        "/docs",
        "/docs/components",
        "/docs/installation",
        "/docs/getting-started",
      ],
      (href) => {
        expect(html).toContain(`href="${href}"`);
      },
    );
  });

  it("reports the real component count rather than a hard-coded one", () => {
    expect(components.length).toBeGreaterThan(0);
    expect(html).toContain(`>${components.length}<`);
  });

  it("counts components with a page, not just the ones the inventory calls done", () => {
    const documented = components.filter(
      (component) => component.status !== "planned",
    );
    expect(documented.length).toBeGreaterThan(0);
    expect(documented.length).toBeLessThan(components.length);
    expect(html).toContain("Documented");
    expect(html).toContain(`>${documented.length}<`);
    expect(html).not.toContain("Implemented</dt>");
  });
});
