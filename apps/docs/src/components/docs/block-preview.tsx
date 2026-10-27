import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { useState } from "react";
import { HighlightedCode } from "@/components/highlighted-code";
import { writeClipboard } from "../../lib/clipboard";
import { blocks, type Block } from "./blocks";
import { PreviewSurface } from "./preview-surface";

const copyLabel = {
  idle: "Copy recipe",
  copied: "Copied",
  error: "Copy failed",
} as const;

type CopyState = keyof typeof copyLabel;

/**
 * One block page: the recipe's screen, then the source that draws it.
 *
 * A block is a page, not a specimen, so it is not mounted in the component
 * pages' fixed-height Preview/Code panel — that box cropped a dashboard and
 * squeezed an inbox into 520px. The screen takes the page column's own width
 * and paints at its natural size; the recipe follows in a disclosure beneath.
 *
 * The scene is still `PreviewSurface`, so the palette, `data-platform` and
 * platform font keep following the switch.
 */
export function BlockPreview({ name }: { name: string }) {
  const block = blocks[name];
  if (block === undefined) {
    throw new Error(`BlockPreview: no block named "${name}"`);
  }

  return (
    <div className="gx-block-screen not-prose">
      <PreviewSurface className="gx-block-stage">
        {block.render()}
      </PreviewSurface>
      <div className="gx-source">
        <Accordions collapsible type="single">
          <Accordion title={`Recipe — ${block.name}`}>
            <CopyRecipe block={block} />
            <HighlightedCode lang="tsx" code={block.source} />
          </Accordion>
        </Accordions>
      </div>
    </div>
  );
}

function CopyRecipe({ block }: { block: Block }) {
  const [state, setState] = useState<CopyState>("idle");

  const copy = () => {
    void writeClipboard(block.source).then((copied) =>
      setState(copied ? "copied" : "error"),
    );
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
