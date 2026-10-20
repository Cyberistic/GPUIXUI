import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { installedNativeDeclarations } from "./native-declarations.testing";
import { source } from "./source";

/**
 * The bug guarded (plan 603): the site documented every failure mode only inside
 * the page that owned the feature, so a reader whose window was empty, whose
 * label was invisible, whose font did not load, whose host had no binding or
 * whose check exited `2` had no starting point, and ⌘K answered `troubleshooting`
 * and `debug` with nothing.
 *
 * These tests fail when the page leaves the sidebar, loses a section, states a
 * provider/font/platform/exit-code fact the repository contradicts, or links an
 * anchor no destination page renders. Each claim is read from the real source,
 * so a package change fails the page by name instead of letting the prose drift.
 *
 * `readFileSync` and `JSON.parse` are deliberate: `apps/docs` has no Effect
 * runtime and its bundle must not import `effect`; every docs content guard
 * reads repository files the same way (`typography-truth.test.ts`,
 * `provider-docs.test.ts`).
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const read = (fromApp: string): string =>
  readFileSync(`${appRoot}${fromApp}`, "utf8");
const readRepo = (fromRoot: string): string =>
  readFileSync(`${repoRoot}${fromRoot}`, "utf8");

const pagePath = "content/docs/troubleshooting.mdx";
const page = read(pagePath);
/** Prose wrapped at 80 columns: compare sentences, not line breaks. */
const prose = page.replace(/\s+/g, " ");

const section = (title: string): string => {
  const start = page.indexOf(`## ${title}\n`);
  if (start === -1) return "";
  const rest = page.slice(start + title.length + 4);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
};

const sections = [
  "Nothing appears in the window",
  "The colours are wrong, or a label is invisible",
  "A font is not applied",
  "The native binding is missing for this platform",
  "The live surface stays blank",
  "An overlay is clipped or paints underneath",
  "The platform switch only changes the type",
  "A check exits 2",
  "Where to ask",
] as const;

/** The body of a top-level exported function, by name. */
const functionBody = (text: string, name: string): string => {
  const start = text.indexOf(`export function ${name}(`);
  if (start === -1) return "";
  const open = text.indexOf("{", start);
  const end = text.indexOf("\n}", open);
  return open === -1 || end === -1 ? "" : text.slice(open, end);
};

/** Fumadocs' heading id for the simple anchors this page uses. */
const headingId = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

/** Every `##` heading id a destination page renders. */
const headingIds = (fromApp: string): ReadonlyArray<string> =>
  (read(fromApp).match(/^## .+$/gm) ?? []).map((line) =>
    headingId(line.slice(3)),
  );

/** Every internal docs link in the page, as `[url, fragment]`. */
const internalLinks = (): ReadonlyArray<readonly [string, string]> =>
  [...page.matchAll(/\]\((\/docs\/[^)\s]+)\)/g)].flatMap(
    (match): ReadonlyArray<readonly [string, string]> => {
      const href = match[1];
      if (href === undefined) return [];
      const hash = href.indexOf("#");
      return hash === -1
        ? [[href, ""]]
        : [[href.slice(0, hash), href.slice(hash + 1)]];
    },
  );

describe("troubleshooting page", () => {
  it("is served from the sidebar after the native suite", () => {
    const served = source
      .getPages()
      .find((entry) => entry.url === "/docs/troubleshooting");
    expect(served?.data.title).toBe("Troubleshooting");

    const meta = JSON.parse(read("content/docs/meta.json")) as {
      pages: ReadonlyArray<string>;
    };
    expect(meta.pages.indexOf("troubleshooting")).toBe(
      meta.pages.indexOf("native-testing") + 1,
    );
  });

  it("keeps every section the measured failures need", () => {
    const missing = sections.filter((title) => section(title).length === 0);
    expect(missing).toEqual([]);
  });

  it("agrees with the two provider contexts", () => {
    const primitives = readRepo(
      "packages/primitives/src/components/ThemeProvider.tsx",
    );
    const tokens = readRepo("packages/tokens/src/react.ts");

    expect(primitives).toContain("class MissingThemeProviderError");
    expect(tokens).toContain("createContext<Theme>(lightTheme)");
    expect(prose).toContain("MissingThemeProviderError");
    expect(prose).toContain("does not fail when the provider is missing");
    expect(prose).toContain("paints light");
  });

  it("does not promise a bundled font the runtime cannot register", () => {
    const exposesRegisterFont = installedNativeDeclarations().some((text) =>
      /\bregisterFont\b/.test(text),
    );

    expect(exposesRegisterFont).toBe(false);
    expect(prose).toContain("exposes no `registerFont`");
    expect(prose).toContain("unsupported on the pinned release");
    expect(page).not.toContain("fonts can be registered");
  });

  it("states the platform style's real scope", () => {
    const body = functionBody(
      readRepo("packages/tokens/src/theme.ts"),
      "platformTheme",
    );
    expect(body).not.toBe("");

    const changesPalette = /\b(colors|spacing|radii|density)\b/.test(body);
    const claimsTypeOnly = prose.includes(
      "Colours, spacing, radius and density stay the base theme's.",
    );

    expect(claimsTypeOnly).toBe(!changesPalette);
    expect(body).toContain("typography");
  });

  it("names the live surface's own status attributes", () => {
    const preview = read("preview/main.tsx");

    expect(preview).toContain('data-gpuix="ready"');
    expect(preview).toContain('data-gpuix="failed"');
    expect(preview).toContain("data-reason");
    expect(prose).toContain('data-gpuix="ready"');
    expect(prose).toContain('data-gpuix="failed"');
    expect(prose).toContain("`data-reason`");
  });

  it("states the real exit codes and never calls 2 a pass", () => {
    const nativeCli = readRepo("apps/playground/src/smoke/run.ts");
    const docsSetupError = read("scripts/setup-error.ts");

    expect(nativeCli).toContain("unverified: 2");
    expect(docsSetupError).toContain("class SetupError");
    expect(prose).toContain("a scenario failed and a report exists");
    expect(prose).toContain("no binding loaded, so no scenario ran");
    expect(prose).toContain("the build, server or Chrome was missing");
    expect(prose).toContain("never that it passed");
  });

  it("links pages and anchors that exist", () => {
    const links = internalLinks();
    expect(links.length).toBeGreaterThanOrEqual(10);

    const pages = new Set(source.getPages().map((entry) => entry.url));
    const broken = links.filter(([url]) => !pages.has(url)).map(([url]) => url);
    expect(broken).toEqual([]);

    const anchors = links.filter(([, fragment]) => fragment.length > 0);
    expect(anchors.length).toBeGreaterThanOrEqual(10);

    const badAnchors = anchors
      .map(([url, fragment]) => {
        const target = source.getPages().find((entry) => entry.url === url);
        if (target === undefined) return `${url}#${fragment}`;
        const ids = headingIds(`content/docs/${target.slugs.join("/")}.mdx`);
        return ids.includes(fragment) ? "" : `${url}#${fragment}`;
      })
      .filter(Boolean);
    expect(badAnchors).toEqual([]);
  });
});
