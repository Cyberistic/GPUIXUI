import type { ReactNode } from "react";
import { githubUrl } from "@/lib/page-source";
import { gitConfig } from "@/lib/shared";
import { blocks } from "./blocks";
import { PreviewSurface } from "./preview-surface";
import { RecipeSource } from "./recipe-source";

export function BlockScreen({
  name,
  render,
  source,
  file,
}: {
  readonly name: string;
  readonly render: () => ReactNode;
  readonly source: string;

  readonly file: string;
}) {
  return (
    <div className="gx-block-screen not-prose">
      <PreviewSurface className="gx-block-stage">{render()}</PreviewSurface>
      <p className="gx-block-source">
        <a
          className="gx-block-source-link"
          href={githubUrl(gitConfig, file)}
          rel="noreferrer noopener"
          target="_blank"
        >
          Block source on GitHub
        </a>
        <code>{file}</code>
      </p>
      <RecipeSource label={name} source={source} />
    </div>
  );
}

export function BlockPreview({ name }: { name: string }) {
  const block = blocks[name];
  if (block === undefined) {
    throw new Error(`BlockPreview: no block named "${name}"`);
  }

  return (
    <BlockScreen
      file={block.file}
      name={block.name}
      render={block.render}
      source={block.source}
    />
  );
}
