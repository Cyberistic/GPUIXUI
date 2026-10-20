import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { inputCapabilityViolations } from "./lib/input-capabilities";
import { installedNativeDeclarations } from "./lib/native-declarations.testing";

/**
 * Guards the input section of `/docs/accessibility` (plan 621) against the
 * installed runtime. The page states the mouse and key handlers a part really
 * receives and the touch, pointer and stylus families it does not; this suite
 * reads `@gpuix/native`'s declarations so a dependency upgrade that adds,
 * removes or renames a handler fails by name instead of leaving the prose
 * behind. The pure rule and its fixtures are in `lib/input-capabilities.test.ts`.
 *
 * `node:fs` is test-only, as on the rest of the content pages.
 */

const page = readFileSync(
  fileURLToPath(new URL("../content/docs/accessibility.mdx", import.meta.url)),
  "utf8",
);

describe("the accessibility page's input surface", () => {
  it("matches the installed HostProps in both directions", () => {
    const declarations = installedNativeDeclarations().join("\n");
    expect(inputCapabilityViolations({ declarations, page })).toEqual([]);
  });

  it("states the consequence of the missing event families", () => {
    expect(page).toContain("the operating system synthesises mouse events");
    expect(page).toContain("multi-touch gestures, pressure or tilt");
  });
});
