import { allBlocks } from "./block-index-data";
import { componentPages, primitivePages } from "./component-index-data";

export interface PromptEntry {
  readonly title: string;
  readonly url: string;
  readonly description: string;
}

const siteRoot = "https://gpuixui.sudokw.com";

export const promptBlocks: ReadonlyArray<PromptEntry> = allBlocks.map(
  (block) => ({
    title: block.title,
    url: block.url,
    description: block.description,
  }),
);

export const promptComponents: ReadonlyArray<PromptEntry> = [
  ...componentPages,
  ...primitivePages,
].map((entry) => ({
  title: entry.title,
  url: entry.url,
  description: entry.description,
}));

const line = (entry: PromptEntry): string =>
  `- ${entry.title} — ${entry.description || "see the page"} (${siteRoot}${entry.url})`;

const HEADER = `# GPUIxUI

A React component library for **GPUix**, a native desktop UI runtime. Components
are TypeScript, themed by semantic roles, and rendered by GPUix's reconciler
rather than the DOM. Tags are GPUix hosts (\`div\`, \`text\`, \`img\`, \`input\`,
\`anchored\`), so a browser habit that needs the DOM does not always carry over.

## Install

    npx shadcn@latest add @sudokw/primitives-button

\`shadcn add\` writes the component's source, the \`@gpuixui/*\` runtime and the
npm packages it imports. Items are \`<package>-<component>\`, listed with
\`npx shadcn@latest search @sudokw\`. React 19; \`@gpuix/native\` is prebuilt for
Apple Silicon, Linux x64 and Windows.

The copied files need the GPUix JSX runtime:

    { "jsx": "react-jsx", "jsxImportSource": "@gpuix/react" }

## Run

The repository is a workspace on Node 24 with \`nub\`:

    nub install
    nub run dev:docs         # the documentation site
    nub run dev:playground   # the native playground window
    nub run check            # types, exports, lint, format
    nub run test             # every package
    nub run --filter <pkg> test

\`nub run fmt\` does not apply the repo's formatter config; use
\`sh node_modules/.bin/oxfmt --config .oxfmtrc.json <files>\`.

## Window

    render(<App />, {
      title: "My app", width: 1100, height: 720,
      minWidth: 720, minHeight: 480,
    });

GPUix opens one window per process. Always set \`minWidth\`/\`minHeight\`: a shell of
a 260px rail beside a pane has a size below which neither fits, and without a
minimum the window lets a pane collapse into a clipped column.

## Appearance

A docs page carries no appearance in its URL: the platform switch is the app's
own state — React for the page, local storage for the next visit — so a URL
names the page and nothing else. The switch offers three axes: the platform
(\`darwin\`, \`win32\`, \`linux\`, \`default\`), the palette (\`dark\`, \`light\`) and
an authored look (\`luna\`, \`aero\`, \`omarchy\`).

There is **no OS appearance query** in GPUix 0.11.0 (a measured absence: no
\`appearance\`, \`prefers*\` or \`reduce*\` export). The app owns the mode and passes
it in; \`@gpuixui/motion\` takes reduced motion as a boolean for the same reason.

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

export const promptProseWords = (): number =>
  HEADER.split(/\s+/).filter((word) => word !== "").length;
