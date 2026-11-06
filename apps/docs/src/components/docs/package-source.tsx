import { use } from "react";
import { pageSources } from "@/lib/page-source-data";
import { SourceAccordion } from "./component-source";

export function PackageSource({ url }: { readonly url: string }) {
  const entry = pageSources.sources[url];
  return entry === undefined ? null : (
    <SourceText code={entry.load()} module={entry.module} />
  );
}

function SourceText({
  module,
  code,
}: {
  readonly module: string;
  readonly code: Promise<string>;
}) {
  return <SourceAccordion code={use(code)} file={module} />;
}
