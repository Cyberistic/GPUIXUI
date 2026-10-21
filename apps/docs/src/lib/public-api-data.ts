import { buildPublicApi, notPublished } from "./public-api";

/**
 * Every package manifest, resolved at build time.
 *
 * `import.meta.glob` keeps the list derived: a package added to the workspace
 * appears here without a docs change, and the reference page cannot fall behind
 * the `exports` maps. Only manifests are imported — never the packages.
 */
const manifests = import.meta.glob("../../../../packages/*/package.json", {
  eager: true,
  import: "default",
});

export const publicApi = buildPublicApi(Object.values(manifests));

export { notPublished };
