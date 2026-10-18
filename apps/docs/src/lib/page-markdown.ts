import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { docs } from "./source";

/** The processed Markdown for one page, used by the "Copy page" action. */
export const readPageMarkdown = createServerFn({ method: "GET" })
  .validator((path: string) => path)
  .handler(async ({ data: path }) => {
    const page = docs.getPage(path);
    if (!page) throw notFound();
    return page.getText("processed");
  });
