import type { ReactNode } from "react";

/**
 * The mandated label for a browser approximation (plan 412). It is a value, not
 * prose, so a page cannot render an approximation without it and the preview
 * test can assert the exact wording.
 */
export const APPROXIMATION_NOTICE =
  "Illustrative approximation — not GPUix. Run it in the playground for real behaviour.";

export function ApproximationBanner() {
  return (
    <p
      role="note"
      data-preview-tier="approximation"
      className="not-prose rounded-md border border-fd-border bg-fd-muted px-3 py-2 text-sm text-fd-muted-foreground"
    >
      {APPROXIMATION_NOTICE}
    </p>
  );
}

/**
 * Wraps a browser approximation. The banner is unconditional on purpose: the
 * only way to render an approximation is through this component.
 */
export function IllustrativeApproximation({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="not-prose my-4 flex flex-col gap-2">
      <ApproximationBanner />
      {children}
    </div>
  );
}
