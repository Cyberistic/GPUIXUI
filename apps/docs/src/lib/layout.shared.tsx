import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

/** The docs chrome: brand, top-level links and the repository. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <img
            alt=""
            aria-hidden="true"
            className="gx-mark"
            height={18}
            src="/logo.svg"
            width={18}
          />
          <span>
            {appName}
            <span className="ml-1.5 font-normal text-fd-muted-foreground">
              Docs
            </span>
          </span>
        </span>
      ),
    },
    links: [
      { type: "main", text: "Components", url: "/docs/components" },
      { type: "main", text: "Landing", url: "/" },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
