import { useState } from "react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import { platformLabel } from "../../lib/platform";
import { blocks, type Block } from "./blocks";
import { usePlatform } from "./platform-toggle";
import { PreviewSurface } from "./preview-surface";

const copyLabel = {
  idle: "Copy recipe",
  copied: "Copied",
  error: "Copy failed",
} as const;

type CopyState = keyof typeof copyLabel;

/**
 * One block page's Preview / Code surface, as shadcn/ui presents a block: the
 * browser rendering and the recipe source, plus a copy affordance and the note
 * that a block is a recipe composed from the library — not a new component.
 */
export function BlockPreview({ name }: { name: string }) {
  const block = blocks[name];
  if (block === undefined) {
    throw new Error(`BlockPreview: no block named "${name}"`);
  }

  const { platform } = usePlatform();

  return (
    <div className="gx-component not-prose">
      <Tabs defaultValue="preview" className="gx-component-tabs">
        <div className="gx-component-bar">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          <CopyRecipe block={block} />
        </div>
        <TabsContent className="gx-component-panel" value="preview">
          <PreviewSurface className="gx-block-demo">
            {block.render()}
          </PreviewSurface>
        </TabsContent>
        <TabsContent
          className="gx-component-panel gx-component-code"
          value="code"
        >
          <DynamicCodeBlock lang="tsx" code={block.source} />
        </TabsContent>
      </Tabs>
      <p className="gx-component-note">
        A recipe composed from {block.packages.join(" and ")}, not a new
        component. Browser preview: the geometry, palette and states of the
        native parts, drawn in the {platformLabel(platform)} type style; the
        shipped block renders through GPUix, not the DOM.
      </p>
    </div>
  );
}

function CopyRecipe({ block }: { block: Block }) {
  const [state, setState] = useState<CopyState>("idle");

  const copy = () => {
    navigator.clipboard
      .writeText(block.source)
      .then(() => setState("copied"))
      .catch(() => setState("error"));
  };

  return (
    <>
      <button
        aria-label={`Copy the ${block.title} recipe`}
        className="gx-copy-button"
        onClick={copy}
        type="button"
      >
        {copyLabel[state]}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "Recipe copied to the clipboard." : ""}
      </span>
    </>
  );
}
