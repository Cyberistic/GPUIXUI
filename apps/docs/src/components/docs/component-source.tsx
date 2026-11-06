import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import desktopStyles from "../../../../../examples/blocks/src/desktop/styles.css?raw";
import { HighlightedCode } from "@/components/highlighted-code";
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
  label = "Component source",
  lang = "tsx",
}: {
  /** Repository-relative path, used for the label and the GitHub link. */
  readonly file: string;
  readonly code: string;
  /** What the accordion calls the block: source, styles, recipe. */
  readonly label?: string;
  /** The highlighter's grammar. */
  readonly lang?: "tsx" | "css";
}) {
  return (
    <div className="gx-source not-prose">
      <Accordions collapsible type="single">
        <Accordion title={`${label} — ${file}`}>
          <p className="gx-install-note">
            The shipping implementation is{" "}
            <a
              href={githubUrl(gitConfig, file)}
              rel="noreferrer"
              target="_blank"
            >
              {file}
            </a>{" "}
            on GitHub.
          </p>
          <HighlightedCode lang={lang} code={code} />
        </Accordion>
      </Accordions>
    </div>
  );
}

/**
 * The desktop block's chrome, as the stylesheet a consumer copies.
 *
 * The block is native; this file is the browser equivalent of the same
 * geometry and colour for both looks, so the page links the CSS that paints
 * what the captures show.
 */
export function DesktopStyles() {
  return (
    <SourceAccordion
      code={desktopStyles}
      file="examples/blocks/src/desktop/styles.css"
      label="Desktop styles"
      lang="css"
    />
  );
}
