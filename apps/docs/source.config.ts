import { defineConfig } from "fumadocs-mdx/config";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { generator } from "./src/lib/type-table-generator";

// Prop tables come from the real component source, so the API reference cannot
// drift from the implementation (plan 411). The generator itself lives in
// `src/lib/type-table-generator.ts`, shared with the contract test, because this
// file may only export collections.
export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkAutoTypeTable, { generator }]],
  },
});
