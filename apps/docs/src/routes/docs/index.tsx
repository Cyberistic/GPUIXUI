import { createFileRoute } from "@tanstack/react-router";
import { legacyDocsRedirect } from "@/lib/legacy-docs";

/** The docs' old root. A published `/docs` link lands on the landing page. */
export const Route = createFileRoute("/docs/")({
  beforeLoad: ({ location }) => {
    throw legacyDocsRedirect("", location.searchStr);
  },
});
