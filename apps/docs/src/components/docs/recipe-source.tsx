import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { useState } from "react";
import { HighlightedCode } from "@/components/highlighted-code";
import { writeClipboard } from "../../lib/clipboard";

const copyLabel = {
  idle: "Copy recipe",
  copied: "Copied",
  error: "Copy failed",
} as const;

type CopyState = keyof typeof copyLabel;

/**
 * A page's copyable source, in the disclosure a block page ends with.
 *
 * The block pages and the sidebar page share it: both show a rendering first,
 * then the `@gpuixui/*` recipe a reader copies.
 */
export function RecipeSource({
  label,
  source,
}: {
  readonly label: string;
  readonly source: string;
}) {
  return (
    <div className="gx-source">
      <Accordions collapsible type="single">
        <Accordion title={`Recipe — ${label}`}>
          <CopyRecipe label={label} source={source} />
          <HighlightedCode lang="tsx" code={source} />
        </Accordion>
      </Accordions>
    </div>
  );
}

function CopyRecipe({
  label,
  source,
}: {
  readonly label: string;
  readonly source: string;
}) {
  const [state, setState] = useState<CopyState>("idle");

  const copy = () => {
    void writeClipboard(source).then((copied) =>
      setState(copied ? "copied" : "error"),
    );
  };

  return (
    <>
      <button
        aria-label={`Copy the ${label} recipe`}
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
