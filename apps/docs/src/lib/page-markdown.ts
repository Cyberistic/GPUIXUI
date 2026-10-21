import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { componentDocs } from "./component-docs";
import { docs } from "./source";

/** Which collection a page's Markdown is read from. */
export type PageOrigin = "site" | "package";

/** The processed Markdown for one page, used by the "Copy page" action. */
export const readPageMarkdown = createServerFn({ method: "GET" })
  .validator(
    (page: { readonly origin: PageOrigin; readonly path: string }) => page,
  )
  .handler(async ({ data }) => {
    const found =
      data.origin === "site"
        ? docs.getPage(data.path)
        : componentDocs.getPage(data.path);
    if (!found) throw notFound();
    return found.getText("processed");
  });
