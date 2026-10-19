import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
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
  const url = `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${file}`;

  return (
    <div className="gx-source not-prose">
      <Accordions collapsible type="single">
        <Accordion title={`Component source — ${file}`}>
          <p className="gx-install-note">
            The shipping implementation in the workspace. Read it on{" "}
            <a href={url} rel="noreferrer" target="_blank">
              GitHub
            </a>
            .
          </p>
          <DynamicCodeBlock lang="tsx" code={componentSources[name]} />
        </Accordion>
      </Accordions>
    </div>
  );
}
