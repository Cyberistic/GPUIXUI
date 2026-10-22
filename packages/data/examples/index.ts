/**
 * The data-package example registry: `id → example`, for the native playground.
 *
 * The browser docs site must not render these as live components — they are
 * GPUix host elements, not DOM — so the docs pages carry the same source as a
 * code block. `examples/examples.test.ts` holds this registry to the directory:
 * every `*.example.tsx` file is registered under its own name and exports the
 * symbol the entry imports, so a screens worth copying cannot be unplayable.
 */

import type { ComponentType } from "react";
import { TableExample } from "./table.example.js";

/** One mountable screen per data surface. */
export const examples: Readonly<Record<string, ComponentType>> = {
  table: TableExample,
};
