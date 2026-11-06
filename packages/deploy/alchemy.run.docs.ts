import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

const DOCS_DOMAIN = "gpuixui.sudokw.com";

/**
 * Cache the hashed client assets for a year.
 *
 * Vite writes every `dist/client/assets/*` file under a content hash, so a
 * change produces a new name. The wasm browser build is the file that pays for
 * this: it is ~20 MiB, and the asset layer's default `max-age=0` made every
 * `/live` revalidate it. The rest of the page's JS, CSS and native frames are
 * under the same rule and are equally safe to keep.
 */
const docsAssetHeaders = [
  "/assets/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
].join("\n");

// The docs site (Fumadocs) deployed as a Cloudflare Worker from apps/docs:
// this stack builds the app, uploads it and attaches the custom domain.
export class DocsSite extends Cloudflare.Website.Vite<DocsSite>()("DocsSite", {
  name: "gpuixui-docs",
  rootDir: "../../apps/docs",
  domain: DOCS_DOMAIN,
  workersDev: true,
  // Every page is prerendered to `dist/client/<path>/index.html`
  // (`src/lib/prerender-pages.ts`), so the asset layer answers a page request
  // before the Worker is invoked. `drop-trailing-slash` serves `/x` from
  // `x/index.html` with a 200 and redirects `/x/` to the canonical
  // no-slash URL; the default (`auto-trailing-slash`) would do the opposite and
  // put a slash on every canonical URL the site publishes.
  assets: { htmlHandling: "drop-trailing-slash", headers: docsAssetHeaders },
}) {}

export default Alchemy.Stack(
  "gpuixui-docs",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const site = yield* DocsSite;
    return { url: site.url };
  }),
);
