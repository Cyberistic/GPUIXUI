import { fumadocsMdx } from "fumadocs-mdx/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The fumadocs-mdx plugin compiles the `defineDocs` macro in `src/lib/source.ts`
// so the search test can build a real index from the real content.
export default defineConfig({
  plugins: [fumadocsMdx()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
