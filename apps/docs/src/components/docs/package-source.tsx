import { use } from "react";
import { pageSources } from "@/lib/page-source-data";
import { SourceAccordion } from "./component-source";

/**
 * The implementation a package page documents.
 *
 * The package pages are Markdown, so they cannot embed their own component.
 * The site resolves the module the page is about at build time and prints that
 * file's text here, collapsed: the page still opens with the component's
 * behaviour, and the source is one click away rather than a second hand-kept
 * copy. A curated page writes `<ComponentSource>` instead; this never renders
 * on one, because the curated page shadows the package page's URL.
 */
export function PackageSource({ url }: { readonly url: string }) {
  const entry = pageSources.sources[url];
  return entry === undefined ? null : (
    <SourceText code={entry.load()} module={entry.module} />
  );
}

/** The block, once the module's text has loaded. */
function SourceText({
  module,
  code,
}: {
  readonly module: string;
  readonly code: Promise<string>;
}) {
  return <SourceAccordion code={use(code)} file={module} />;
}
