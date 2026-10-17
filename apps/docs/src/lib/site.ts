/** The docs domain declared by the deploy resource (`packages/deploy`). */
const DEFAULT_SITE_URL = "https://docs.gpuixui.dev";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

/**
 * The site's public origin, without a trailing slash. `VITE_SITE_URL` overrides
 * the default for previews and self-hosting (plan 418).
 */
export const SITE_URL = trimTrailingSlash(
  import.meta.env.VITE_SITE_URL ?? DEFAULT_SITE_URL,
);

/** An absolute URL for a site path: canonical links, OpenGraph and sitemaps. */
export const absoluteUrl = (path: string): string =>
  new URL(path, `${SITE_URL}/`).toString();
