import { platformTypes, typography } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { PlatformTypes, TypeScale } from "./type-scale";

/**
 * Guards the generated type tables (plan 416): every text role and every
 * platform must render with the package's real values. The failure it catches
 * is a page that documents a scale the library no longer ships — a role dropped
 * from the table, or a size retyped and left behind.
 */
const scale = renderToStaticMarkup(<TypeScale />);
const platforms = renderToStaticMarkup(<PlatformTypes />);

describe("type scale table", () => {
  it("renders every text role with its real size and leading", () => {
    Arr.forEach(
      [
        "display",
        "h1",
        "h2",
        "h3",
        "body",
        "bodyStrong",
        "label",
        "caption",
        "code",
        "codeBlock",
      ] as const,
      (role) => {
        expect(scale).toContain(`data-role="${role}"`);
        expect(scale).toContain(
          `${typography[role].fontSize}px / ${typography[role].lineHeight}px`,
        );
      },
    );
  });
});

describe("platform type table", () => {
  it("renders every platform's real families", () => {
    Arr.forEach(
      ["darwin", "linux", "win32", "default"] as const,
      (platform) => {
        expect(platforms).toContain(`data-platform="${platform}"`);
        expect(platforms).toContain(platformTypes[platform].mono);
      },
    );
  });
});
