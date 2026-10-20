import type { GeneratedSearchEntry } from "./generated-search";
import { PAGE_ACTIONS } from "./page-markdown";
import { SITE_OUTPUT_ROUTES } from "./site-output";

/**
 * Contributing's `### Site output` names the routes the site serves and plan
 * 596's page control, but the control's labels live in a React button and an
 * anchor, not in authored prose, so the page index never sees them (plan 597).
 * Measured before: `page actions`, `copy page` and `page markdown` reached the
 * component-page guide, `view as markdown` the Preview card and `raw markdown`
 * a Text area limitation.
 *
 * Every promoted name is a whole multiword phrase or a distinctive file name,
 * so `page`, `copy`, `actions` and `markdown` keep the page that owns each word
 * (plan 569's rule).
 */
export const siteOutputSearchEntry: GeneratedSearchEntry = {
  names: [
    ...SITE_OUTPUT_ROUTES.flatMap(({ searchName }) =>
      searchName === undefined ? [] : [searchName],
    ),
    PAGE_ACTIONS.copy.toLowerCase(),
    PAGE_ACTIONS.view.toLowerCase(),
    "page markdown",
    "raw markdown",
    "page actions",
    "copy page",
    "site output",
  ],
  index: {
    title: "Contributing",
    description:
      "The docs site's own output: discovery routes and the per-page Markdown control.",
    content: [
      ...SITE_OUTPUT_ROUTES.map(({ route }) => route),
      "Every page can be copied or viewed as Markdown.",
    ].join("\n"),
    url: "/docs/contributing#site-output",
    breadcrumbs: ["Contributing"],
    keywords: [
      ...SITE_OUTPUT_ROUTES.map(({ route }) => route.replaceAll("/", " ")),
      PAGE_ACTIONS.copy,
      PAGE_ACTIONS.view,
      "page actions copy view download",
    ].join(" "),
  },
};
