import { defineConfig } from "fumadocs-mdx/config";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { codeColorReplacements, codeThemeNames } from "./src/lib/code-palette";
import { generator } from "./src/lib/type-table-generator";

// Prop tables come from the real component source, so the API reference cannot
// drift from the implementation (plan 411). The generator itself lives in
// `src/lib/type-table-generator.ts`, shared with the contract test, because this
// file may only export collections.
//
// Both highlight pipelines take the same contrast-corrected palette (plan 498):
// `rehypeCodeOptions` for fences and source includes, and the prop tables'
// own `shiki` option for the generated inline types.
const syntax = {
  themes: codeThemeNames,
  colorReplacements: codeColorReplacements,
};

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkAutoTypeTable, { generator, shiki: syntax }]],
    rehypeCodeOptions: syntax,
  },
});
