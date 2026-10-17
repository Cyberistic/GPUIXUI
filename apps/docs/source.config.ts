import { defineConfig } from "fumadocs-mdx/config";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable,
} from "fumadocs-typescript";

// Prop tables come from the real component source, so the API reference cannot
// drift from the implementation (plan 411).
const generator = createGenerator({
  cache: createFileSystemGeneratorCache(".cache/fumadocs-typescript"),
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkAutoTypeTable, { generator }]],
  },
});
