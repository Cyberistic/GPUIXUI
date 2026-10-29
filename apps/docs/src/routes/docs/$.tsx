import { createFileRoute } from "@tanstack/react-router";
import { legacyDocsRedirect } from "@/lib/legacy-docs";

/**
 * The docs' old prefix. Every published `/docs/<path>` keeps working: the
 * request 301s to the page's address at the site root, query included.
 */
export const Route = createFileRoute("/docs/$")({
  beforeLoad: ({ location, params }) => {
    throw legacyDocsRedirect(params._splat ?? "", location.searchStr);
  },
});
