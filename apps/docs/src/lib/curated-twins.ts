import {
  componentDocsRoute,
  effectsDocsRoute,
  primitiveDocsRoute,
} from "./shared";

export interface CuratedTwin {
  readonly retired: string;

  readonly curated: string;
}

export const curatedPrimitiveTwins: ReadonlyArray<CuratedTwin> = [
  "button",
  "checkbox",
  "select",
  "switch",
  "tooltip",
].map((name) => ({
  retired: `${primitiveDocsRoute}/${name}`,
  curated: `${componentDocsRoute}/${name}`,
}));

export const movedEffects: ReadonlyArray<CuratedTwin> = [
  "bubbles",
  "fireworks",
  "gravity-stars",
  "hexagon",
  "liquid-button",
  "magnetic",
  "motion-grid",
  "particles",
  "ripple-button",
  "rolling-text",
  "rotating-text",
  "shine-button",
  "sliding-text",
  "splitting-text",
  "stars",
  "typing-text",
].map((name) => ({
  retired: `${componentDocsRoute}/${name}`,
  curated: `${effectsDocsRoute}/${name}`,
}));

export const movedBlocks: ReadonlyArray<CuratedTwin> = [
  { retired: "/blocks/settings", curated: "/blocks/profile-settings" },
];

export const curatedTwinOf = (url: string): string | undefined =>
  [...curatedPrimitiveTwins, ...movedEffects, ...movedBlocks].find(
    (twin) => twin.retired === url,
  )?.curated;

export const servedPages = <Page extends { readonly url: string }>(
  pages: ReadonlyArray<Page>,
): Page[] => pages.filter((page) => curatedTwinOf(page.url) === undefined);

export const servedUrls = (urls: ReadonlyArray<string>): string[] =>
  urls.filter((url) => curatedTwinOf(url) === undefined);

export const curatedRedirect = (
  url: string,
  searchStr: string,
): string | undefined => {
  const curated = curatedTwinOf(url);
  if (curated === undefined) return undefined;
  return `${curated}${searchStr.startsWith("?") ? searchStr : ""}`;
};
