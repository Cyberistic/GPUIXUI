/**
 * Holds the icon page to the package it documents.
 *
 * The bug this guards: the description said "Forty-seven monochrome icons"
 * while the registry shipped 48, because the count is prose and the set is data.
 * The size table is the second stale value of the same kind — it prints a pixel
 * number per step, and the scale lives in `@gpuixui/tokens`.
 *
 * The page is read from disk, as `packages/primitives/src/docs.test.ts` and the
 * tokens catalogue guards do: this checks a document, not a runtime.
 * `node:fs` is deliberate — `@gpuixui/icons` has no Effect platform dependency
 * and the read happens once, when the suite loads, so there is no event loop to
 * block and nothing to provide a `FileSystem` layer for.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { ICON_NAMES } from "./names.js";
import { ICON_SIZES } from "./sizes.js";

const page = readFileSync(new URL("../docs/icon.mdx", import.meta.url), "utf8");

/** A frontmatter field's value, or nothing when the field is absent. */
const frontmatter = (field: string): Option.Option<string> =>
  Option.fromNullishOr(new RegExp(`^${field}: (.+)$`, "m").exec(page)?.[1]);

describe("the icon page", () => {
  it("prints the size of the set it documents", () => {
    const description = Option.getOrElse(frontmatter("description"), () =>
      expect.fail("the page has no description"),
    );
    expect(description).toContain(`${ICON_NAMES.length} monochrome icons`);
  });

  it("prints each size step at the scale's pixel value", () => {
    Arr.forEach(R.toEntries(ICON_SIZES), ([step, pixels]) => {
      // The default step's row names its default after the name: `md` (default).
      const row = new RegExp(
        `\\|\\s*\`${step}\`[^|]*\\|\\s*(\\d+)\\s*\\|`,
      ).exec(page);
      expect(row?.[1]).toBe(String(pixels));
    });
  });
});
