import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { PackageOrigin } from "./collection-routes";
import { docsByOrigin } from "./package-docs";
import { docs } from "./source";

/** Which collection a page's Markdown is read from. */
export type PageOrigin = "site" | PackageOrigin;

/** The processed Markdown for one page, used by the "Copy page" action. */
export const readPageMarkdown = createServerFn({ method: "GET" })
  .validator(
    (page: { readonly origin: PageOrigin; readonly path: string }) => page,
  )
  .handler(async ({ data }) => {
    const found =
      data.origin === "site"
        ? docs.getPage(data.path)
        : docsByOrigin[data.origin].getPage(data.path);
    if (!found) throw notFound();
    return found.getText("processed");
  });
