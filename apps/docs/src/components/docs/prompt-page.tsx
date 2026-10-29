"use client";

import { useMemo, useState } from "react";
import {
  buildPrompt,
  promptBlocks,
  promptComponents,
  promptProseWords,
} from "../../lib/prompt-data";

/**
 * The build prompt, with one control that copies it.
 *
 * The prompt is generated at build time from the pages the site ships, so the
 * page prints the same string the button copies — there is no second source.
 * The lists are long by design; the prose above them is the part held short,
 * because it is the context an agent spends before it writes anything.
 */
/** The page-level copy action's skin, shared with the header's own button. */
const COPY_BUTTON =
  "not-prose inline-flex h-8 shrink-0 items-center rounded-md border border-fd-border bg-fd-secondary px-3 text-xs font-medium text-fd-secondary-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring";

export function PromptPage() {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const prompt = useMemo(() => buildPrompt(), []);

  const copy = (): void => {
    void navigator.clipboard
      .writeText(prompt)
      .then(() => {
        setCopied("copied");
        window.setTimeout(() => setCopied("idle"), 2000);
      })
      .catch(() => setCopied("failed"));
  };

  return (
    <div className="gx-prompt">
      <div className="gx-prompt-head">
        <p className="gx-prompt-meta">
          {`${promptProseWords()} words of instructions · ${promptComponents.length} components · ${promptBlocks.length} blocks`}
        </p>
        {/* The page-level control's own skin: `.gx-btn` sizes itself from the
            preview stage's tokens, and this page is prose rather than a
            preview, so the classes resolve to nothing. */}
        <button className={COPY_BUTTON} onClick={copy} type="button">
          {copied === "copied"
            ? "Copied"
            : copied === "failed"
              ? "Copy refused"
              : "Copy prompt"}
        </button>
      </div>
      <pre className="gx-prompt-body" data-testid="prompt-body">
        {prompt}
      </pre>
    </div>
  );
}
