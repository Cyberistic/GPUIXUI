import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/** Shared nav options for every Fumadocs layout on the site. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "GPUIXUI",
    },
    links: [
      {
        text: "Components",
        url: "/docs/components",
      },
    ],
  };
}
