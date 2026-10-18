/** The docs domain declared by the deploy resource (`packages/deploy`). */
const DEFAULT_SITE_URL = "https://docs.gpuixui.dev";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

/**
 * The site's public origin, without a trailing slash. `VITE_SITE_URL` overrides
 * the default for previews and self-hosting (plan 418).
 *
 * The optional chain keeps the module readable by a Node tool (the built-site
 * smoke compares the served manifest with `renderManifest()`); outside a Vite
 * host there is no `import.meta.env`, and the default is the same answer.
 */
export const SITE_URL = trimTrailingSlash(
  import.meta.env?.VITE_SITE_URL ?? DEFAULT_SITE_URL,
);

/** An absolute URL for a site path: canonical links, OpenGraph and sitemaps. */
export const absoluteUrl = (path: string): string =>
  new URL(path, `${SITE_URL}/`).toString();
