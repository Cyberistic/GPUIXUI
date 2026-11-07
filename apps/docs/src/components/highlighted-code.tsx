import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import type { ComponentProps } from "react";
import { codeOptions } from "@/lib/code-theme";

export function HighlightedCode(
  props: Omit<ComponentProps<typeof DynamicCodeBlock>, "options">,
) {
  return <DynamicCodeBlock {...props} options={codeOptions} />;
}
