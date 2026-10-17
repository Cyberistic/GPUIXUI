import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

const DOCS_DOMAIN = "docs.gpuixui.dev";

// The docs site (Fumadocs) deployed as a Cloudflare Worker. Nothing deploys
// yet: this declares the resources so the shape of the deployment is fixed
// before the app exists — see apps/docs/README.md for what Phase B must build
// at rootDir.
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
