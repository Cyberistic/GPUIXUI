import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the API reference page (plan 441). The regression it exists for is the
 * page turning back into a demo: a hand-picked `<auto-type-table>` of some type
 * that happens to live in the docs app, with the real index gone. The page must
 * render the generated `<ApiIndex />` and explain the generator from the files
 * the build actually runs.
 *
 * `node:fs`/`node:url` are deliberate here, as in `content-references.test.ts`:
 * a vitest boundary reading real files, and `apps/docs` has no Effect runtime
 * (plan 411 §5).
 */
const page = readFileSync(
  fileURLToPath(new URL("../content/docs/api-reference.mdx", import.meta.url)),
  "utf8",
);

describe("API reference page", () => {
  it("renders the generated index", () => {
    expect(page).toContain("<ApiIndex />");
  });

  it("does not demonstrate itself with one hand-picked type", () => {
    expect(page).not.toContain("<auto-type-table");
  });

  it("explains the generator from the real files", () => {
    expect(page).toContain("## How the tables are generated");
    expect(page).toContain("src/lib/type-table-generator.ts");
    expect(page).toContain("source.config.ts");
  });
});
