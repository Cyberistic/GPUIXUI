import { collectionByOrigin } from "./collection-routes";
import type { PageOrigin } from "./collection-routes";
import { gitConfig } from "./shared";

const siteDir = "apps/docs/content/docs";

const markdownFile = (path: string): string =>
  `${path.replace(/^\/+/, "").replace(/\.mdx$/i, "")}.mdx`;

export const pageMarkdownPath = (origin: PageOrigin, path: string): string => {
  const file = markdownFile(path);
  return origin === "site"
    ? `${siteDir}/${file}`
    : `${collectionByOrigin[origin].dir}/${file}`;
};

export const pageEditUrl = (
  origin: PageOrigin,
  path: string,
  repo: {
    readonly user: string;
    readonly repo: string;
    readonly branch: string;
  } = gitConfig,
): string =>
  `https://github.com/${repo.user}/${repo.repo}/edit/${repo.branch}/${pageMarkdownPath(origin, path)}`;
