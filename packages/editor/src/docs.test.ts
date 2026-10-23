/**
 * The `MarkdownEditor` page's Evidence line prints the cases its two suites
 * declare. A count is the one claim a passing suite cannot see: the suite can
 * grow a case while the page still teaches the number before it.
 *
 * The bug guarded is a page that prints a stale count — measured by lowering
 * the printed number, which fails this case by name.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** One case in a suite: the package convention is two spaces and `it(`. */
const cases = (relative: string): number =>
  (read(relative).match(/^ {2}it\(/gm) ?? []).length;

describe("the MarkdownEditor page", () => {
  it("prints the case counts its suites declare", () => {
    const page = read("../docs/markdown-editor.mdx");
    const behaviour = cases("./behaviour/markdown-editor.test.tsx");
    const logic = cases("./markdown/logic.test.ts");

    // A floor so an empty suite cannot satisfy a page that prints zero.
    expect(behaviour).toBeGreaterThan(10);
    expect(logic).toBeGreaterThan(10);
    expect(page).toContain(`(${behaviour} native behaviour tests)`);
    expect(page).toContain(`(${logic} cases)`);
  });
});
