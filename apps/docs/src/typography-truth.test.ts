import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The bug guarded: the Typography page told readers custom fonts were blocked
 * by B1 — resolved on 2026-10-17 by the source-built `darwin-x64` binding
 * (ADR 0003, plan 140) — and that the library could only use the system UI and
 * platform monospace families, although `typography.sans`/`mono` are family
 * names `extendTheme` replaces. One claim named an obstacle that no longer
 * existed; the other denied a capability the package ships.
 *
 * `readFileSync` is deliberate: `apps/docs` has no Effect runtime and its
 * bundle must not import `effect`; every docs content guard reads repository
 * files the same way (`component-truth.test.ts`, `provider-docs.test.ts`).
 */
const page = readFileSync(
  fileURLToPath(new URL("../content/docs/typography.mdx", import.meta.url)),
  "utf8",
);

/** Whether a set of TypeScript declarations mentions the font registration API. */
export const exposesRegisterFont = (
  declarations: ReadonlyArray<string>,
): boolean => declarations.some((text) => /\bregisterFont\b/.test(text));

const declaresAbsent = /exposes no `registerFont` API/i;
const claimsSystemOnly = /can only use the system UI font/i;
const namesResolvedBlocker = /\bB1\b|binding-install blocker/i;
const importsExtendTheme =
  /import\s*\{[^}]*\bextendTheme\b[^}]*\}\s*from\s*"@gpuixui\/tokens"/;
const overridesFamily = /typography:\s*\{\s*sans:/;
const linksPlan = /052-register-font\.md/;

/**
 * Every way the page can disagree with the package. Pure so each rule has a
 * fixture test, and so the real-page test is one call with the installed
 * typings' verdict.
 */
export const typographyTruthViolations = (input: {
  readonly page: string;
  readonly exposesRegisterFont: boolean;
}): ReadonlyArray<string> => {
  const { page: text } = input;
  return [
    ...(input.exposesRegisterFont && declaresAbsent.test(text)
      ? ["the page denies a registerFont API the installed typings expose"]
      : []),
    ...(!input.exposesRegisterFont && !declaresAbsent.test(text)
      ? ["the page does not say the pinned runtime exposes no registerFont API"]
      : []),
    ...(claimsSystemOnly.test(text)
      ? [
          "the page claims only system UI and platform mono families are possible",
        ]
      : []),
    ...(namesResolvedBlocker.test(text)
      ? ["the page names the resolved B1 binding blocker"]
      : []),
    ...(!importsExtendTheme.test(text) || !overridesFamily.test(text)
      ? ["the page omits the installed-family extendTheme recipe"]
      : []),
    ...(!linksPlan.test(text)
      ? ["the page does not link the registerFont plan"]
      : []),
  ];
};

const resolve = createRequire(import.meta.url).resolve;
const nativeRoot = dirname(resolve("@gpuix/native"));

/** Every declaration file the installed native package ships. */
const declarations = (root: string): ReadonlyArray<string> =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const path = join(root, entry.name);
    if (entry.isDirectory()) return declarations(path);
    return entry.name.endsWith(".d.ts") ? [readFileSync(path, "utf8")] : [];
  });

describe("Typography tells the truth about custom fonts", () => {
  it("decides whether the API exists from declarations, in both directions", () => {
    expect(
      exposesRegisterFont([
        "export interface Renderer { registerFont(bytes: Uint8Array): void }",
      ]),
    ).toBe(true);
    expect(
      exposesRegisterFont([
        "export interface HostProps { readonly fontFamily?: string }",
      ]),
    ).toBe(false);
  });

  it("reports a page that still names the resolved blocker", () => {
    expect(
      typographyTruthViolations({
        page: `${page}\nIts proof is blocked by the binding-install blocker (B1).`,
        exposesRegisterFont: false,
      }),
    ).toContain("the page names the resolved B1 binding blocker");
  });

  it("reports a page that denies installed families", () => {
    expect(
      typographyTruthViolations({
        page: "The library can only use the system UI font and the platform monospace families.",
        exposesRegisterFont: false,
      }),
    ).toContain(
      "the page claims only system UI and platform mono families are possible",
    );
  });

  it("reports a page without the installed-family recipe", () => {
    expect(
      typographyTruthViolations({
        page: "The release exposes no `registerFont` API. See 052-register-font.md.",
        exposesRegisterFont: false,
      }),
    ).toContain("the page omits the installed-family extendTheme recipe");
  });

  it("reports a page that contradicts an API the installed typings expose", () => {
    expect(
      typographyTruthViolations({ page, exposesRegisterFont: true }),
    ).toContain(
      "the page denies a registerFont API the installed typings expose",
    );
  });

  it("passes the shipped page against the installed declarations", () => {
    expect(
      typographyTruthViolations({
        page,
        exposesRegisterFont: exposesRegisterFont(declarations(nativeRoot)),
      }),
    ).toEqual([]);
  });
});
