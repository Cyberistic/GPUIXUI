import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { displayScaleViolations } from "./lib/display-scale";
import { installedNativeDeclarations } from "./lib/native-declarations.testing";

/**
 * The bug guarded: `/docs/window` said "sizes are logical pixels" and never
 * explained the display scale, so `hidpi`, `retina` and `dpr` returned nothing,
 * the density phrases reached Theming's high-contrast roles or a Separator
 * border sentence, and an application could not learn whether it may choose a
 * 2× asset. The page now states the absence, and this test reads the installed
 * declarations so the claim cannot outlive the API: a scale query or a density
 * descriptor added to the runtime fails by symbol, and a page that loses the
 * section fails by name.
 *
 * `readFileSync` is deliberate: `apps/docs` has no Effect runtime and its
 * bundle must not import the native declarations; every content guard here
 * reads repository files the same way (`motion-truth.test.ts`,
 * `typography-truth.test.ts`).
 */
const page = readFileSync(
  fileURLToPath(new URL("../content/docs/window.mdx", import.meta.url)),
  "utf8",
);

const iconSource = readFileSync(
  fileURLToPath(
    new URL("../../../packages/icons/src/Icon.tsx", import.meta.url),
  ),
  "utf8",
);

const declarations = installedNativeDeclarations().join("\n");

const hostDeclarations = readFileSync(
  createRequire(import.meta.url)
    .resolve("@gpuix/native/host")
    .replace(/\.js$/u, ".d.ts"),
  "utf8",
);

const section = ((): string => {
  const start = page.indexOf("## Display scale and pixel density");
  if (start === -1) return "";
  const end = page.indexOf("\n## ", start + 1);
  return end === -1 ? page.slice(start) : page.slice(start, end);
})();

const validFixture = {
  native: "export interface WindowOptions { width?: number }",
  host: [
    "export interface ImgProps { src?: string; objectFit?: string; alt?: string }",
    "export interface SvgProps { source?: string }",
  ].join("\n"),
  iconSource: "<svg source={icons[name]} style={{ width: pixels }} />",
};

const fails = (input: typeof validFixture, prefix: string): boolean =>
  displayScaleViolations(input).some((violation) =>
    violation.startsWith(prefix),
  );

describe("the display-scale claims match the installed runtime", () => {
  it("accepts a runtime with no scale query and vector icons", () => {
    expect(displayScaleViolations(validFixture)).toEqual([]);
  });

  it("fails when the declarations gain a scale factor", () => {
    expect(
      fails(
        { ...validFixture, native: "scaleFactor?: number; devicePixelRatio" },
        "display scale:",
      ),
    ).toBe(true);
  });

  it("fails when an image gains a density descriptor", () => {
    expect(
      fails(
        {
          ...validFixture,
          host: `export interface ImgProps { srcSet?: string }\nexport interface SvgProps {}`,
        },
        "image density:",
      ),
    ).toBe(true);
  });

  it("fails when the image or vector surface disappears", () => {
    expect(
      fails(
        { ...validFixture, host: "export interface WindowOptions {}" },
        "image density: ImgProps is not declared",
      ),
    ).toBe(true);
    expect(
      fails(
        { ...validFixture, host: "export interface ImgProps {}" },
        "vector icons: SvgProps is not declared",
      ),
    ).toBe(true);
  });

  it("fails when an icon stops painting vector markup at its scale", () => {
    expect(
      fails({ ...validFixture, iconSource: "<Icon />" }, "vector icons:"),
    ).toBe(true);
  });

  it("passes against the installed declarations", () => {
    expect(
      displayScaleViolations({
        native: declarations,
        host: hostDeclarations,
        iconSource,
      }),
    ).toEqual([]);
  });
});

describe("the window page owns the subject", () => {
  it("keeps the section", () => {
    expect(section).not.toBe("");
  });

  it("names the unit, the absent query and the two asset rules", () => {
    const claims = [
      "logical pixel",
      "getWindowSize",
      "devicePixelRatio",
      "srcSet",
      "objectFit",
      "SvgProps.source",
    ];
    expect(claims.filter((claim) => !section.includes(claim))).toEqual([]);
  });

  it("names the subject in the page summary", () => {
    expect(page).toContain("description: Open and configure the native window");
    expect(page).toContain("display scale");
  });
});
