import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { colorRoles, platformTypes } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { components, groups } from "@/component-meta/registry";
import { themeColors } from "@/lib/docs-theme";
import { deniesLiveSurface } from "@/lib/live-surface-truth";
import { Landing, PALETTE_ROLES, PREVIEW_TIERS, QUICK_START } from "./landing";

/**
 * Guards the landing page (plan 410 §"Showcase quality": a useful landing page
 * and quick-start). The failure it catches is drift: every number and colour on
 * `/` is read from the component registry or `@gpuixui/tokens`, so a page that
 * hard-codes one would keep building after the library changed underneath it
 * (plan 440).
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

const tagWith = (attributes: string): string => {
  const match = html.match(new RegExp(`<[a-z]+[^>]*${attributes}[^>]*>`));
  expect(match, `no element carries ${attributes}`).not.toBeNull();
  return match?.[0] ?? "";
};

const textOf = (attributes: string): string => {
  const match = html.match(
    new RegExp(`<([a-z]+)[^>]*${attributes}[^>]*>([\\s\\S]*?)</\\1>`),
  );
  expect(match, `no element carries ${attributes}`).not.toBeNull();
  return match?.[2] ?? "";
};

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

  it("does not open a second main landmark", () => {
    // Bug guarded (plan 439): `Landing` rendered its own <main> inside
    // HomeLayout's <main id="nd-home-layout">, so `/` shipped two landmarks.
    // The build smoke failed on it; the layout owns the page landmark.
    expect(html).not.toContain("<main");
  });

  it("links to the docs it describes", () => {
    Arr.forEach(
      [
        "/docs",
        "/docs/components",
        "/docs/installation",
        "/docs/getting-started",
        "/docs/theming",
        "/docs/architecture",
      ],
      (href) => {
        expect(html).toContain(`href="${href}"`);
      },
    );
  });

  it("reports the real inventory rather than a hard-coded count", () => {
    const documented = components.filter(
      (component) => component.status !== "planned",
    );
    expect(documented.length).toBeGreaterThan(0);
    // Every Tier 1–2 record is delivered after plan 461; the count must still
    // be read from the registry, so a hard-coded number fails here.
    expect(documented.length).toBe(components.length);
    expect(html).toContain(`${documented.length} documented components`);
    expect(html).not.toContain("Implemented</dt>");
  });

  it("derives every tier's documented and tracked count from the registry", () => {
    Arr.forEach(groups, (group) => {
      const done = group.items.filter(
        (component) => component.status !== "planned",
      ).length;
      expect(html).toContain(
        `data-group="${group.group}" data-documented="${done}" data-tracked="${group.items.length}"`,
      );
    });
  });

  it("paints every palette swatch with the package's value", () => {
    Arr.forEach(PALETTE_ROLES, (role) => {
      expect(colorRoles).toContain(role);
      Arr.forEach(["light", "dark"] as const, (mode) => {
        const swatch = tagWith(`data-role="${role}" data-mode="${mode}"`);
        expect(swatch).toContain(`background-color:${themeColors[mode][role]}`);
      });
    });
  });

  it("names the platform families from the token package", () => {
    Arr.forEach(["darwin", "linux", "win32"] as const, (platform) => {
      expect(textOf(`data-mono="${platform}"`)).toContain(
        platformTypes[platform].mono,
      );
      expect(html).toContain(platformTypes[platform].label);
    });
  });

  it("lists the six preview tiers, live surface first, and points at the rule", () => {
    expect(PREVIEW_TIERS).toHaveLength(6);
    expect(PREVIEW_TIERS[0]?.detail).toContain("WebAssembly");
    Arr.forEach(PREVIEW_TIERS, (tier) => {
      expect(html).toContain(tier.label);
      expect(html).toContain(tier.detail);
    });
    expect(deniesLiveSurface(html)).toBe(false);
    expect(textOf('href="/docs/architecture"')).toContain("Architecture");
  });
});
