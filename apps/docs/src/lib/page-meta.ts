import { descriptionText } from "./page-description";
import { absoluteUrl } from "./site";
import { appName } from "./shared";

export interface DocsPageMeta {
  readonly title: string;

  readonly description?: string;

  readonly url: string;
}

const fallbackDescription = `Documentation for ${appName}, the native UI component library for GPUix and React.`;

export const pageTitle = (title: string): string => `${title} · ${appName}`;

export const socialImage = {
  url: absoluteUrl("/og.png"),
  type: "image/png",
  width: 1200,
  height: 630,
  alt: `${appName} — components drawn on the GPU by GPUix`,
} as const;

const socialMeta = [
  { property: "og:image", content: socialImage.url },
  { property: "og:image:type", content: socialImage.type },
  { property: "og:image:width", content: String(socialImage.width) },
  { property: "og:image:height", content: String(socialImage.height) },
  { property: "og:image:alt", content: socialImage.alt },
  { name: "twitter:image", content: socialImage.url },
  { name: "twitter:image:alt", content: socialImage.alt },
];

export const landingTitle =
  "GPUIxUI — native UI components for Mac, Windows and Linux";

export const landingDescription =
  "shadcn's API drawn on the GPU by GPUix: components you own, themed by semantic roles, running on Mac, Windows, Linux and the terminal.";

export const landingMeta = () => {
  const url = absoluteUrl("/");

  return {
    meta: [
      { title: landingTitle },
      { name: "description", content: landingDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: appName },
      { property: "og:title", content: landingTitle },
      { property: "og:description", content: landingDescription },
      { property: "og:url", content: url },
      ...socialMeta,
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: landingTitle },
      { name: "twitter:description", content: landingDescription },
    ],
    links: [{ rel: "canonical", href: url }],
  };
};

export const docsMetadata = ({
  title,
  description,
  url: path,
}: DocsPageMeta) => {
  const url = absoluteUrl(path);
  const summary =
    descriptionText(description ?? "").trim() || fallbackDescription;

  return {
    meta: [
      { title: pageTitle(title) },
      { name: "description", content: summary },
      { property: "og:type", content: "article" },
      { property: "og:site_name", content: appName },
      { property: "og:title", content: pageTitle(title) },
      { property: "og:description", content: summary },
      { property: "og:url", content: url },
      ...socialMeta,
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle(title) },
      { name: "twitter:description", content: summary },
    ],
    links: [{ rel: "canonical", href: url }],
  };
};
