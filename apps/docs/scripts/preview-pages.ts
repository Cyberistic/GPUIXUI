/**
 * Which component pages render a labelled preview (plan 495).
 *
 * The browser smoke needs the set of pages whose hydrated preview surfaces it
 * must read. The registry is a React module, and this script runs on Node,
 * which strips types but does not transform JSX, so the list comes from the MDX
 * tree: `component-preview.test.tsx` already proves the pages and the preview
 * registry agree in both directions, so deriving here cannot drift.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PREVIEW_BLOCK = /<ComponentPreview slug="([^"]+)"/g;

/** The slug of every component page that renders a tier-A preview. */
export const previewPageSlugs = (pageDirectory: string): readonly string[] =>
  [
    ...new Set(
      readdirSync(pageDirectory)
        .filter((file) => file.endsWith(".mdx"))
        .flatMap((file) =>
          [
            ...readFileSync(join(pageDirectory, file), "utf8").matchAll(
              PREVIEW_BLOCK,
            ),
          ].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
        ),
    ),
  ].sort();
