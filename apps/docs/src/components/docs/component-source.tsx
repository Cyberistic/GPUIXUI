import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import desktopStyles from "../../../../../examples/blocks/src/desktop/styles.css?raw";
import { HighlightedCode } from "@/components/highlighted-code";
import { githubUrl } from "@/lib/page-source";
import { gitConfig } from "@/lib/shared";
import { componentSources, type ComponentSourceName } from "./sources";

export function ComponentSource({
  name,
  file,
}: {
  name: ComponentSourceName;

  file: string;
}) {
  return <SourceAccordion code={componentSources[name]} file={file} />;
}

export function SourceAccordion({
  file,
  code,
  label = "Component source",
  lang = "tsx",
}: {
  readonly file: string;
  readonly code: string;

  readonly label?: string;

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
