# 750 — Docs prose pass, terminal and Omarchy guides

| Field | Value |
| --- | --- |
| Status | done — every page under the `docs/VOICE.md` budget, the two new pages shipped |
| Phase | F (docs polish) |
| Depends on | 400-series docs site, the page contracts in `apps/docs/src/lib` |
| Workstream | docs |
| Risk | low — Markdown only; the contracts in `docs/VOICE.md` and `docs/preview-strategy.md` already state the target |

## 1. Problem

The site is complete but the pages carry prose that a reader does not need: the
implementation story behind a component, measurements, version archaeology,
second explanations of what an API table already prints, and `Theming` /
`Motion` / `Notes` sections that narrate internals. `docs/VOICE.md` has stated
the budget since the site landed; the pages drifted from it.

The site also has no page for two things a consumer asks for:

- running the same view **in a terminal** (`render(<App />, { terminal: true })`);
- **Omarchy** — developing on the Hyprland/Arch setup, and reading its live
  `colors.toml` palette.

## 2. The rule this pass enforces

`docs/VOICE.md`, unchanged:

- 60 prose words per component page outside frontmatter, code, tables and JSX.
- A sentence under 25 words.
- At most three examples, at most three limitations.
- No "Installation" prose; the `<Install>` tag is the installation.
- Delete rationale, test counts, measurement prose, version stories, plans,
  issue numbers, and the banned connectives ("genuinely", "deliberately", "the
  point is", "what this means", "in short", "we", "let's").

Section contract (held by `apps/docs/src/lib/component-page.test.ts`):

- `## Installation`, `## Usage`, `## API reference`, `## Limitations`, in that
  order, on every curated component page.
- `## Composition` where the component is compound — the tree alone, no prose.
- Limitations: 1–3 bullets, **one physical line each**, each a runtime fact a
  consumer must know. No explanation of why, no measurements, no test paths.

Extra sections (`## Theming`, `## Motion`, `## Behaviour`, `## Notes`,
`## Sides`, `## Recipes`, …) are deleted unless one line of them is a fact the
API table cannot carry; that fact moves into Limitations.

Tables, code fences, JSX tags and inline code identifiers survive verbatim
except where a cell is a sentence rather than a type and a default.

## 3. Work split

Seven reviewers, one file set each, disjoint. No two touch the same file. None
touches `meta.json`, `src/`, `packages/` or any test.

| Set | Files |
| --- | --- |
| A | `components/{alert,avatar,empty-state,accordion,tabs,breadcrumb,card,timeline,collapsible,form}.mdx` |
| B | `components/{pagination,command-menu,list,badge,navigation-menu,confirm-dialog,stepper,carousel,button,time-picker}.mdx` |
| C | `components/{color-picker,inline-edit,checkbox,search-input,popover,tooltip,switch,calendar,field,dialog}.mdx` |
| D | `components/{select,combobox,auth,dropdown-menu,table,tag-input,date-picker,drawer,toast,context-menu,index}.mdx` |
| E | `blocks/*.mdx` (23 pages + `index`, `all`) |
| F | `introduction.mdx`, `diagrams.mdx`, `registry.mdx`, `themes.mdx`, `examples.mdx`, `reference.mdx`, `getting-started/prompt.mdx` |
| G | `platform/{index,native-window,window}.mdx`, `primitives/index.mdx`, `data-display/index.mdx`, `workspace/index.mdx` |

## 4. Facts that must survive a cut

Content tests read the served pages. These strings are assertions, not prose:

| Page(s) | Must contain |
| --- | --- |
| `dialog`, `drawer` | `tab order`, `` `inert` ``, `320 ms`, `scroller`, `src/behaviour/<name>.test.tsx` |
| `command-menu` | `tab order`, `` `inert` ``, `320 ms`, `Enter`, `keeps the focus` |
| `toast` | `tab order`, `` `inert` ``, `180 ms`, `3 cards`, `history` |
| `navigation-menu`, `dropdown-menu` | `tab order`, `` `inert` ``, `200 ms` |
| `context-menu` | `tab order`, `` `inert` ``, `200 ms` |
| `collapsible` | `[Accordion](/components/accordion)` |
| `color-picker` | the `label` API row keeps the fallback name and the word `blank`; the `testId` row keeps `root's locator` and every suffix, and never says `above` |
| `introduction` | `<Badge variant="success">`, no `tone` |
| `examples` | `apps/playground/README.md`, `--only examples-mount`, `apps/playground/dist/smoke/run.js`, `GPUix modules, not browser components`, `nub run --filter @gpuixui/primitives test:runtime` |
| `reference` | `<ApiReference />` |
| `blocks/conversations` | `## The four dresses` and a `**macOS**`, `**Windows 11**`, `**Linux (Breeze dark)**`, `**Omarchy**` label |
| `blocks/dashboard` | `browser reproduction`, `one tint`, `stacked`, `/data-display/charts`, the three chart names |

## 5. New pages

### `apps/docs/content/docs/platform/terminal.mdx`

- Frontmatter `title: Terminal`, a one-line description.
- The call: `render(<App />, { terminal: true })`, and `GPUIX_TERMINAL=1`.
- The two terminals that speak the protocol: kitty, Ghostty.
- In this repo: `nub run --filter playground build && GPUIX_TERMINAL=1 nub apps/playground/dist/main.js`.
- Facts: fills the terminal, window and chrome options are ignored, `isTerminal()` reads true while rendering, macOS and Linux, no titlebar, not a window (no automation, no embedded terminal host).
- Add `terminal` to `apps/docs/content/docs/platform/meta.json`.

### `apps/docs/content/docs/getting-started/omarchy.mdx`

- Frontmatter `title: Omarchy`.
- Develop on Omarchy: x86_64 Arch, Node 24.18.0 via `nub`, `nub install`,
  `nub run dev:playground`, `nub run dev:docs`, the gate.
- Terminal run from kitty.
- Follow the live theme: `~/.local/state/omarchy/current/theme/colors.toml` →
  `decodeOmarchyPalette` → `paletteToTokens`, sourced from `docs/tokens.md`
  §Omarchy's `colors.toml`. Include the runnable snippet.
- Honesty line: the published `x86_64-unknown-linux-gnu` binding is what loads;
  the measurements in this repo were taken on macOS.
- Add `omarchy` to `apps/docs/content/docs/getting-started/meta.json`.
- Link both new pages from `getting-started/index.mdx` under "Where next".

## 6. Verification

```sh
nub run --filter @gpuixui/docs test        # page contracts + content guards
nub run --filter @gpuixui/docs check-types
nub run --filter @gpuixui/docs build       # MDX compiles, links resolve
```

Expected: the same green suites that pass on `main` today. A failure names the
page and the missing fact; restore the fact rather than the paragraph.

## 7. STOP conditions

- A required section would have to be deleted to hit the budget → keep the
  section, cut elsewhere.
- A page's only remaining limitation bullet is an explanation, not a fact →
  keep the most useful fact; do not invent one.
- A new page needs a claim the repository cannot source → write the limit and
  say it is unmeasured; do not assert a Linux result this tree never ran.

## 8. Acceptance

- Every page above passes the budget scan (`wc -w` on prose), keeps its
  contract, and reads without a "why" paragraph.
- `/platform/terminal` and `/getting-started/omarchy` exist, are in the
  sidebar, and every command on them is one this repo runs.
- The three commands in §6 pass; `.agents/slop/TODO.md` carries the tick.
