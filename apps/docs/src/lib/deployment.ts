/**
 * The deployment facts this site can prove (plan 609).
 *
 * The docs app builds a Cloudflare Worker; `packages/deploy` declares it and
 * `apps/docs/wrangler.jsonc` configures it. This module is the one place the
 * page, the deploy smoke and its test agree on those facts, so a rename in the
 * deploy stack fails a test instead of leaving the page stale. It is data only:
 * the docs bundle must not import `node:fs` or the Effect runtime
 * (`src/architecture.test.ts`).
 */

/** The Worker that `packages/deploy/alchemy.run.docs.ts` declares. */
export const docsWorker = {
  name: "gpuixui-docs",
  domain: "docs.gpuixui.dev",
  rootDir: "../../apps/docs",
} as const;

/**
 * Cloudflare's documented limits for one Worker version, from
 * <https://developers.cloudflare.com/workers/platform/limits/> (fetched
 * 2026-10-20): 25 MiB per static asset, 20,000 files on the Free plan (100,000
 * on Paid) and a 64 MiB uncompressed Worker script. The Free file count is the
 * one this repository claims, because it does not claim a paid plan.
 */
export const cloudflareLimits = {
  bytesPerAsset: 25 * 1024 * 1024,
  assetsPerVersion: 20_000,
  workerBytes: 64 * 1024 * 1024,
} as const;

/** The committed live surface's build output, repo-relative. */
export const liveSurfaceAssets = "apps/docs/dist/client/gpuix-preview/assets";

/**
 * The first string value of a JSONC key, for the two config files that carry
 * comments (`wrangler.jsonc` and the Alchemy stack). Not a JSON parser: it reads
 * only the fixed keys this page and its smoke assert, and returns `undefined`
 * rather than guessing when a key is absent.
 *
 * `undefined` is the boundary, not the domain: this module is read by the
 * browser bundle and the docs CLI, and `src/architecture.test.ts` forbids the
 * Effect runtime in that bundle, so `Option` cannot be imported here.
 */
export const jsoncString = (source: string, key: string): string | undefined =>
  new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`).exec(source)?.[1];

/** The quoted strings of a JSONC array value, or `[]` when the key is absent. */
export const jsoncStringArray = (
  source: string,
  key: string,
): ReadonlyArray<string> => {
  const body = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`).exec(source)?.[1];
  return body === undefined
    ? []
    : [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? "");
};
