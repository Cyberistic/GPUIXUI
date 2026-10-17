import {
  createFileSystemGeneratorCache,
  createGenerator,
} from "fumadocs-typescript";

/**
 * The one `fumadocs-typescript` generator the docs use (plan 415): the page
 * pipeline wires it into `source.config.ts` and `src/lib/type-table.test.ts`
 * exercises the same instance, so a test cannot pass against a configuration
 * the site does not run.
 *
 * It lives here rather than in `source.config.ts` because that file may only
 * export collections (`fumadocs-mdx` rejects any other named export).
 */
export const generator = createGenerator({
  cache: createFileSystemGeneratorCache(".cache/fumadocs-typescript"),
});
