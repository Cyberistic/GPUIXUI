import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { githubUrl } from "@/lib/page-source";
import { gitConfig } from "@/lib/shared";
import { componentSources, type ComponentSourceName } from "./sources";

/**
 * The implementation behind the component, collapsed under Installation.
 *
 * The page shows the demo's usage in the Code tab; this is the other half — the
 * actual package source a reader would own if they copied the component.
 */
export function ComponentSource({
  name,
  file,
}: {
  name: ComponentSourceName;
  /** Repository-relative path, used for the label and the GitHub link. */
  file: string;
}) {
  return <SourceAccordion code={componentSources[name]} file={file} />;
}

/**
 * The one source block both callers render.
 *
 * A curated page knows its file by hand (`sources.ts`); a package page's file
 * is resolved from the component it documents (`page-source-data.ts`). The
 * block is the same either way: the file's own text, collapsed, linked where it
 * lives in the repository.
 */
export function SourceAccordion({
  file,
  code,
}: {
  /** Repository-relative path, used for the label and the GitHub link. */
  readonly file: string;
  readonly code: string;
}) {
  return (
    <div className="gx-source not-prose">
      <Accordions collapsible type="single">
        <Accordion title={`Component source — ${file}`}>
          <p className="gx-install-note">
            The shipping implementation in the workspace. Read it on{" "}
            <a
              href={githubUrl(gitConfig, file)}
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            .
          </p>
          <DynamicCodeBlock lang="tsx" code={code} />
        </Accordion>
      </Accordions>
    </div>
  );
}
