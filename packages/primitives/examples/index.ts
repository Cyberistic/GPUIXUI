/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * `apps/playground` mounts these in real GPUix, and
 * `runtime/examples.runtime.test.tsx` mounts the same components to prove they
 * paint. The browser docs site must not render them as live previews: they are
 * GPUix host elements, not DOM.
 */

import type { ComponentType } from "react";
import { FeedbackExample } from "./feedback.example.js";
import { FormExample } from "./form.example.js";
import { IconsExample } from "./icons.example.js";
import { LayoutExample } from "./layout.example.js";
import { SelectionExample } from "./selection.example.js";
import { TypographyExample } from "./typography.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  feedback: FeedbackExample,
  form: FormExample,
  icons: IconsExample,
  layout: LayoutExample,
  selection: SelectionExample,
  typography: TypographyExample,
};
