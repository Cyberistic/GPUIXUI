import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

const DOCS_DOMAIN = "gpuixui.sudokw.com";

// The docs site (Fumadocs) deployed as a Cloudflare Worker from apps/docs:
// this stack builds the app, uploads it and attaches the custom domain.
export class DocsSite extends Cloudflare.Website.Vite<DocsSite>()("DocsSite", {
  name: "gpuixui-docs",
  rootDir: "../../apps/docs",
  domain: DOCS_DOMAIN,
  workersDev: true,
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
