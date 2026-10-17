import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { PlatformToggle } from "@/platform/platform-toggle";

/** Shared nav options for every Fumadocs layout on the site. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "GPUIXUI",
      children: <PlatformToggle />,
    },
    links: [
      {
        text: "Components",
        url: "/docs/components",
      },
    ],
  };
}
