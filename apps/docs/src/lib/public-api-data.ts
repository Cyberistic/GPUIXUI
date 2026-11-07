import { buildPublicApi, notPublished } from "./public-api";

const manifests = import.meta.glob("../../../../packages/*/package.json", {
  eager: true,
  import: "default",
});

export const publicApi = buildPublicApi(Object.values(manifests));

export { notPublished };
