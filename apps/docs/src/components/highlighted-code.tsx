import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import type { ComponentProps } from "react";
import { codeOptions } from "@/lib/code-theme";

/**
 * A code block highlighted when the page renders — the install command, a
 * preview's Code tab, an example's source.
 *
 * `DynamicCodeBlock` highlights with Fumadocs' bundled `github-light`/
 * `github-dark` themes unless it is handed options, so every render-time block
 * goes through here: the site's code reads in the same palette as its MDX
 * fences, which `code-theme.test.ts` holds to `@gpuixui/tokens`.
 */
export function HighlightedCode(
  props: Omit<ComponentProps<typeof DynamicCodeBlock>, "options">,
) {
  return <DynamicCodeBlock {...props} options={codeOptions} />;
}
