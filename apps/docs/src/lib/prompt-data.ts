import { componentPages } from "./component-index-data";
import { frontmatter, frontmatterValue } from "./component-index";

/**
 * The build prompt, generated from the pages the site already ships.
 *
 * Nothing here is a hand-kept list. The component rows come from the same
 * build-time index the Components page renders, and the block rows come from the
 * block pages' own frontmatter — so a page that lands is in the prompt on the
 * next build, and a page that is removed leaves it. A prompt that needed
 * maintaining would drift from the site within a week.
 *
 * The prose stays short on purpose: an agent reads this before it reads anything
 * else, and a long preamble is context it will not spend on the code.
 */

/** One thing the prompt lists: what it is called, where it lives, what it does. */
export interface PromptEntry {
  readonly title: string;
  readonly url: string;
  readonly description: string;
}

const siteRoot = "https://gpuixui.sudokw.com";

/** The block pages, read from their own frontmatter. */
const blockFiles = import.meta.glob("../../content/docs/blocks/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

/** The slug a block page's filename names. */
const slugOf = (file: string): string =>
  file.slice(file.lastIndexOf("/") + 1).replace(/\.mdx$/, "");

/** The blocks the site ships, alphabetical, without their index page. */
export const promptBlocks: ReadonlyArray<PromptEntry> = Object.entries(
  blockFiles,
)
  .flatMap(([file, source]) => {
    const slug = slugOf(file);
    if (slug === "index") return [];
    const head = frontmatter(source);
    const title = frontmatterValue(head, "title");
    return title === undefined
      ? []
      : [
          {
            title,
            url: `/docs/blocks/${slug}`,
            description: frontmatterValue(head, "description") ?? "",
          },
        ];
  })
  .toSorted((left, right) => left.title.localeCompare(right.title));

/**
 * The components the site ships, one row per page.
 *
 * The index's own order is already alphabetical inside each section, which is
 * the order a reader scans; the prompt keeps it rather than re-sorting flat.
 */
export const promptComponents: ReadonlyArray<PromptEntry> = componentPages.map(
  (entry) => ({
    title: entry.title,
    url: entry.url,
    description: entry.description,
  }),
);

/** One line per entry: the shape a prompt reads best. */
const line = (entry: PromptEntry): string =>
  `- ${entry.title} — ${entry.description || "see the page"} (${siteRoot}${entry.url})`;

/** The prose an agent needs before it writes a component. */
const HEADER = `# GPUIxUI

A React component library for **GPUix**, a native desktop UI runtime. Components
are TypeScript, themed by semantic roles, and rendered by GPUix's reconciler
rather than the DOM. Tags are GPUix hosts (\`div\`, \`text\`, \`img\`, \`input\`,
\`anchored\`), so a browser habit that needs the DOM does not always carry over.

## Install

    nub install
    nub add @gpuixui/components@workspace:*

The packages are private and workspace-linked: there is no registry, so the
version is the workspace protocol.

## Run

    nub run dev          # the app you are working in
    nub run check        # types, exports, lint, format
    nub run test         # every package
    nub run --filter <pkg> test

Node 24, \`nub\` as the package manager. \`nub run fmt\` does not apply the repo's
formatter config; use \`sh node_modules/.bin/oxfmt --config .oxfmtrc.json <files>\`.

## Rules

- Effect for logic: typed failures, \`Option\` for absence, \`Schema\` at
  boundaries. No \`any\`, no casts, no \`@ts-ignore\`.
- Semantic roles only (\`bg-card\`, \`text-muted-foreground\`); a literal colour
  fails review.
- Every fix lands with a test that fails without it.
- No \`transform\` in native code: the runtime has none.

## Contribute

Fork, branch from \`master\`, keep the change one idea, and run the gates before
pushing. A component needs its page (\`packages/<pkg>/docs/<name>.mdx\`), an
inventory row, and a behaviour test. Report runtime limits rather than mocking
them.`;

/**
 * The whole prompt: the prose, then the two lists the site generates.
 *
 * Rendered by `/docs/prompt` and copied as text, so what an agent reads is the
 * same string the page prints — there is no second source to keep in step.
 */
export const buildPrompt = (
  components: ReadonlyArray<PromptEntry> = promptComponents,
  blocks: ReadonlyArray<PromptEntry> = promptBlocks,
): string =>
  [
    HEADER,
    "",
    `## Components (${components.length})`,
    "",
    ...components.map(line),
    "",
    `## Blocks (${blocks.length})`,
    "",
    ...blocks.map(line),
    "",
  ].join("\n");

/** The word count of the prose, which is the part that has to stay short. */
export const promptProseWords = (): number =>
  HEADER.split(/\s+/).filter((word) => word !== "").length;
