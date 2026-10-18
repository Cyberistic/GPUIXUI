/**
 * Guards the recipe provenance.
 *
 * The bug this prevents is silent drift: someone "fixes" `h-9` to `h-8` in our
 * source, and the library quietly stops matching shadcn. The test reads the
 * read-only reference clone and fails when the copied string is no longer in
 * upstream (or when upstream moved to a different value).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  INPUT_BASE,
  INPUT_FOCUS,
  INPUT_INVALID,
} from "./recipes.js";

const ui = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../references/ui",
);
const present = existsSync(join(ui, "apps/v4/registry/new-york-v4/ui"));

const read = (...parts: ReadonlyArray<string>): string =>
  readFileSync(join(ui, ...parts), "utf8");

describe.skipIf(!present)("shadcn source provenance", () => {
  it("keeps the Input strings verbatim", () => {
    const source = read("apps/v4/registry/new-york-v4/ui/input.tsx");
    expect(source).toContain(INPUT_BASE);
    expect(source).toContain(INPUT_FOCUS);
    expect(source).toContain(INPUT_INVALID);
  });

  it("keeps the Button base and size table verbatim", () => {
    const source = read("apps/v4/registry/new-york-v4/ui/button.tsx");
    expect(source).toContain(BUTTON_BASE);
    expect(source).toContain(BUTTON_SIZES.default);
    expect(source).toContain(BUTTON_SIZES.sm);
    expect(source).toContain(BUTTON_SIZES.lg);
    expect(source).toContain(BUTTON_SIZES.icon);
    expect(source).toContain(BUTTON_VARIANTS.default);
    expect(source).toContain(BUTTON_VARIANTS.destructive);
  });

  it("keeps the dialog and popover animation tokens upstream", () => {
    const css = read("apps/v4/registry/styles/style-luma.css");
    for (const token of [
      "data-open:animate-in",
      "data-closed:animate-out",
      "data-open:fade-in-0",
      "data-open:zoom-in-95",
      "duration-100",
      "bg-popover",
      "text-popover-foreground",
      "rounded-4xl",
      "p-6",
      "shadow-xl",
      "ring-1",
    ]) {
      expect(css).toContain(token);
    }
    for (const token of [
      "flex",
      "flex-col",
      "gap-4",
      "rounded-3xl",
      "p-4",
      "shadow-lg",
      "ring-1",
    ]) {
      expect(css).toContain(token);
    }
  });
});
