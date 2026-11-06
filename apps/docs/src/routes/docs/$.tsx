import { createFileRoute } from "@tanstack/react-router";
import { legacyDocsRedirect } from "@/lib/legacy-docs";

export const Route = createFileRoute("/docs/$")({
  beforeLoad: ({ location, params }) => {
    throw legacyDocsRedirect(params._splat ?? "", location.searchStr);
  },
});
