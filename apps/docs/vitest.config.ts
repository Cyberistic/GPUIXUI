import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig } from "vitest/config";

const contentDirectory = fileURLToPath(
  new URL("./content/docs/", import.meta.url),
);

/** Every page path under `content/docs`, independent of the cache's module list. */
const pagePaths = (directory: string, prefix = ""): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? pagePaths(`${directory}${entry.name}/`, `${prefix}${entry.name}/`)
      : entry.name.endsWith(".mdx")
        ? [`${prefix}${entry.name}`]
        : [],
  );

/**
 * Vitest's filesystem module cache is keyed by a module's content, not by the
 * files its `import.meta.glob` matched. `src/lib/source.ts` is one glob, so a
 * page added without editing that module reused the cached list — measured: 15
 * of 94 pages, with every source-based guard still green. Keying the cache by
 * the page paths makes an add or a remove recompile the glob; an edit does not.
 */
const contentKey = createHash("sha256")
  .update(pagePaths(contentDirectory).join("\n"))
  .digest("hex")
  .slice(0, 12);

export default defineConfig({
  plugins: [fumadocsMdx()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    fsModuleCachePath: fileURLToPath(
      new URL(
        `../../node_modules/.vitest-cache/docs-${contentKey}`,
        import.meta.url,
      ),
    ),
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
