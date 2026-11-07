# GPUIXUI status ledger

The internal ledger that used to open `README.md`: status, layout, what the
library stands on, the reference clones and the tooling. `README.md` is the
project overview; this file is the ledger. Keep it current.

`.agents/slop/MISSION.md` is the requirement. `.agents/slop/PLAN.md` is the architecture. `.agents/slop/TODO.md` is the
source of truth for what is left to do. `.agents/slop/COMPONENTS.md` is the inventory.

## Status

Phase C — Tier 1–2 components. **Tier 2 is complete in `packages/components`**:
39 components/areas, each with a native behaviour suite, at least one working
example, a docs page and an inventory record checked against `.agents/slop/COMPONENTS.md`.
The newest are **`Calendar`** — the shadcn-shaped month grid the Date picker now
composes, with single/multiple/range selection, one or two months, outside days,
disabled matchers and label/dropdown captions — and four surfaces the inventory
did not carry: **`HoverCard`** (hover and focus, one shared wait store with
Preview Card), **`AspectRatio`** (the runtime's own ratio), **`Item`** and
**`InputGroup`**.
The last batch closed the twelve gap rows from plan 205 (Drawer, Navigation Menu,
Preview Card, Timeline, Countdown, Keyboard shortcuts, Carousel, Inline edit,
Tag input, Mention input, Hotkey recorder, Color picker) — `nub run --filter
@gpuixui/components test:behaviour` covers them in 1 157 tests.
Phase D has started: **`packages/data` (`@gpuixui/data`) ships the table core
with sort, selection and filtering** — the measured fixed header (one horizontal
scroller, the header a sibling of the row scroller), measured body height, empty
and loading states, `TableSortHeader`, `TableFilterField`, the pure
`sort`/`selection`/`filter` reducers and the `useTable` controller, covered by 7
native behaviour cases and the headless `data-table-core` probe. Its four Tier 3
inventory rows are `done`; columns, virtualisation, trees, charts and the data
surfaces are the remaining phases in `.agents/slop/TODO.md`.

**The calculator example is live**: `@gpuixui/calc` is the Effect-first engine
(Casio parser/evaluator, the eight manual modes, 40 constants, 40 conversions, a
model seam for a later TI-84), and Slang (`examples/slang`) wears it in a native
macOS window and in a kitty/Ghostty terminal, with light/dark, a full keyboard
map and ⌘K over every command. The Natural Display is native layout too:
stacked fractions, √ with a vinculum, π coefficients and two-term √ sums. SETUP
(SHIFT+MODE) covers display/angle/Fix/Sci/Norm/fraction/complex/STAT
frequency/decimal/contrast; SHIFT+AC powers the LCD off. Evidence: 82 engine
tests, 6 app logic tests and 12 real-renderer tests (`1 + 2 = 3`, a stacked 1/3,
SETUP, contrast, SHIFT+AC off, matrix mode, ⌘K searching `det(MatA)`, the
appearance repaint); screenshots in `examples/slang/media/`.

The design tokens and theming layer (light, dark, high-contrast, density) is
landed. A shadcn project's `styles.css` converts to a theme with
`shadcnTheme(css, mode)` — its `:root`/`.dark` variables become this library's
roles, `--chart-1…5` the data scale and `--radius` the radius — and
`shadcnCss(theme)` / `shadcnStylesheet(light, dark)` write one back out in the
same variables for a web surface. The platform palettes are authored in
shadcn's variables plus an `extras` block, and the site's **Default** platform is
shadcn's neutral theme exactly, audited as warnings rather than errors. Tier 1, the rest of data presentation,
workspace and specialised components are tracked in `.agents/slop/TODO.md`.

The docs site follows shadcn/ui's anatomy: a sectioned sidebar (the Guide,
Components, Primitives, Graphics, Data display, Workspace, Blocks, Examples,
Reference), a reusable component page with Preview/Code tabs, a `nub` install
block, Usage, Composition and API reference, plus the "On this page" table of
contents and the previous/next pager. Button, Dialog, Popover and
Tabs are the pattern pages; their previews are labelled browser renderings of
the native components, and the Code tab plus **Component source** show the real
implementation. The remaining shadcn surfaces — **Blocks** (`/blocks`) and the
**Theme page** (`/themes`) — landed too: recipe pages composed from the library,
and a live token editor with the authored looks, the compiled style reference and
the Aero look's generated stylesheet. The **Dashboard**
block (`/blocks/dashboard`) is the landing's product window: a six-card
activity dashboard composed from the library, with `BarChart`, `DonutChart` and
`StackedBar` from `@gpuixui/data`. The newest block is **Tasks**
(`/blocks/tasks`): a Notion-style tasks view with a workspace sidebar, a dated
inbox and two rows of document cards, where every tick updates the card's
count from the same task array.

The landing's showcase grid is a masonry: four columns, each its own stack, so
every tile cascades to the next with a constant gap and no holes. A CSS grid
shares its rows and leaves a hole under a short tile. The conversation row is a
sibling of the columns and one column wide, because a narrow column puts the
transcript's scrollbar over the avatar at the row's edge. The hero's people
list is narrower than the block's (236px against 330px), so the thread beside
it reads. `apps/docs/src/components/landing/css-rules.ts` reads the landing's
own CSS for the guards that hold both.
**Graphics** is one category for charts, icons and diagrams, so the three
things a reader reaches for when they want to *draw* are found in one place:
`/graphics/charts/charts`, `/graphics/icons/icon` and `/graphics/diagrams`. A
chart is a **scene** compiled by TanStack Charts and painted through the
runtime's **document route** — the SVG travels as a data URL on an `<img>` —
and a diagram is a Mermaid source rendered by Pele and painted the same way.
The one-tint mask route (`render="mask"`) remains for a chart that wants to
tint per layer.

Every docs page is prerendered at build time and served from Cloudflare's asset
layer, so a page request never runs the Worker; only `/live` (which needs its
cross-origin isolation headers set per request) and `/api/search` are rendered
there. `apps/docs/README.md` §Prerendering is the contract.

## Layout

```
apps/docs          Fumadocs docs: landing at `/`, documentation at the root
apps/playground    Native GPUix playground and smoke tests
examples/slang     Slang, the fx-991ES Plus calculator app: native window and terminal
packages/config    Shared TypeScript and tooling configuration
packages/calc      Calculator engine: Casio parser/evaluator, model seam
packages/deploy    Alchemy stack: the docs site's Cloudflare resources
packages/tokens     Design tokens, themes and the React theme provider
packages/motion     Motion physics (springs, easing, timelines, inertia) + React hooks
packages/primitives Tier 1 render primitives
packages/icons      Icon set and sizing rules
packages/components Tier 2 composition and feedback components
packages/data       Tier 3 data presentation: table, virtual, tree, charts
packages/dock       Tier 4 panels: split panes, panel groups, dock layouts
packages/editor     Tier 4 code surfaces: editor, diff, search and replace
packages/files      Tier 4 file and inspector surfaces: tree, log, properties
packages/media      Tier 4 media surfaces: image preview, drop zone, upload
packages/fx         Decorative motion, built on the components' authoring seams (plan 726)
packages/shell      Tier 4 app chrome: menus, status bar, toolbar
packages/data       Tier 3 data presentation: tables, sort/selection/filter, charts
packages/tw         shadcn class recipes → GPUix StyleDesc (with `cn`)
packages/runtime    The pinned runtime's capability matrix + typed refusals
packages/testing   Platform-free smoke suite: checks, runner, report, preflight
docs/              Design-system and architecture documents (source of truth)
examples/          Runnable example apps
references/        Read-only clones of the reference repos (gitignored)
scripts/           Repo tooling, including the swarm supervisor
.agents/           ADRs, plans, agent state
```

## Built on

What the library stands on, and what we take from each. Where we adapt code,
the licence is noted and attributed in `.agents/slop/LICENSES/`.

| Source | What we take | Licence |
| ------ | ------------ | ------- |
| [shadcn/ui](https://ui.shadcn.com) | component API and composition, plus the docs experience (Preview/Code, install, theming) | — |
| [Base UI](https://base-ui.com) | behaviour and parts model — compound parts, controlled state, focus | — |
| [PanelUI](https://panelui.dev) | resizable panels, split layouts, panel groups, tabbed workspaces and workspace composition — behaviour/decomposition reference | — |
| [Tailwind](https://tailwindcss.com) | utility syntax and recipe model, mapped to `StyleDesc` (not the CSS engine) | — |
| [React](https://react.dev) | the runtime surface (JSX, hooks) on GPUix | — |
| [GPUix](https://gpuix.dev) | the native renderer — GPU, no DOM | — |
| [open-gpui](https://github.com/Latias94/open-gpui) (`crates/motion`) | spring/sequence physics, ported to TS | Apache-2.0 |
| [gpui-motion](https://github.com/1bye/gpui-motion) | broader motion API surface — easing variants and inertia — borrowed as spec | MIT |
| [TanStack](https://tanstack.com) | headless cores — Table (grid state), Virtual (windowing), Form (field state), Pacer (debounce/throttle), Hotkeys (accelerators) | MIT |
| [mermaidcn](https://github.com/Riley1101/mermaidcn) | docs-only Mermaid renderer and playground API — rebuilt on Pele | MIT (declared in README) |
| [TanStack](https://tanstack.com) | headless cores — Table (grid state), Virtual (windowing), Form (field state), Pacer (debounce/throttle), Hotkeys (accelerators), **Charts** (the DOM-free scene compiler) | MIT |
| [Pele](https://pele.run) | the DOM-free Mermaid renderer the `Diagram` component draws with | MIT |

## References

Cloned read-only into `references/` (gitignored) and used as references, never
edited:

- GPUix — https://github.com/remorses/gpuix
- GPUI transform branch — https://github.com/0xErwin1/zed, `feature/53306-07-text-raster-subpixel-regressions` (audited in plan 525; treeless clone at `references/transform-zed`)
- GPUI Community Edition — https://github.com/gpui-ce/gpui-ce, `main` @ `a8d3969` (audited in plan 537; Apache-2.0; full clone at `references/gpui-ce`)
- fc-gpui (Adabraka) — https://github.com/freefcw/fc-gpui, a GPUI fork with a compat layer, tray/notification/hotkey/platform APIs (surveyed for adoptable platform features; clone at `references/fc-gpui`)
- GPUI Kit — https://github.com/longbridge/gpui-kit
- shadcn/ui — https://github.com/shadcn-ui/ui
- Fumadocs — https://github.com/fuma-nama/fumadocs
- TanStack — https://github.com/TanStack (table, virtual, form, pacer, hotkeys: headless cores; the docs app runs TanStack Start)
- Netherite — https://github.com/Infatoshi/netherite (the C/CUDA Minecraft 1.7.10 engine; `apps/netherite` wraps its CLI in a GPUix terminal client; clone at `references/netherite`)
- PanelUI — https://panelui.dev/docs/components (documentation only: no public
  source repository, so it is read as documentation and not cloned)
- mermaidcn — https://github.com/Riley1101/mermaidcn (Mermaid renderer API,
  theme names and playground shape; clone at `references/mermaidcn`)

## Tooling ledger

| Tool | Purpose | Notes |
| ---- | ------- | ----- |
| **nub** | package manager and task runner | pinned in `devEngines.packageManager`; Node 24.18.0 via `.node-version` |
| **TypeScript** | language | strict; `packages/config/tsconfig.base.json` |
| **Effect** | effect system | required for domain logic; see `AGENTS.md` §5 |
| **oxlint** / **oxfmt** | lint and format | `nub run lint`, `nub run fmt` |
| **vitest** | tests | co-located `src/**/*.test.ts` |
| **GPUix** | native rendering target | the runtime the library is built on |
| **Fumadocs** | documentation platform | the docs site |
| **shadcn registry** | source distribution | generated at build time from the component pages; served at `/registry.json` and `/<package>-<page>.json` (docs: `/docs/registry`) |
| **alchemy** | deploy | `packages/deploy/alchemy.run.docs.ts` |
| **git worktree** | agent isolation | one writer per tree, `workspaces/` |

## Development

```sh
nub install
nub run check        # tests-can-fail gate, lint, format, type-check
nub run test
nub run dev:docs
nub run dev:playground
```

## Run in a terminal

GPUix can paint into **kitty or Ghostty** instead of a native window. Pass
`terminal: true` to `render`, or set `GPUIX_TERMINAL=1` and change no code:

```tsx
import { render } from "@gpuix/react";

render(<App />, { terminal: true });
```

Frames render offscreen and are shown with the **kitty graphics protocol**;
mouse, hover, scroll, keyboard (with key-up), paste, focus and resize all reach
the app. `ctrl-c` quits and the terminal is restored on quit, `SIGTERM`,
`SIGINT`, panic or exit.

A terminal has no titlebar, so a component that reserves macOS traffic-light
space must drop it. `isTerminal()` tells it:

```tsx
import { isTerminal } from "@gpuix/react";

// Drop the traffic-light space when there is no window chrome to sit under.
if (!isTerminal()) {
  // reserve space under the titlebar …
}
```

Read `isTerminal()` while rendering — it is `false` until `init()` has run, so
never at module scope. `Tab`/`Shift+Tab` move focus by default (cancel with
`event.preventDefault()`); an app no longer binds `renderer.focusNext()` to Tab.

## Working with agents

Each workstream runs in its own `git worktree` under `workspaces/` on branch
`agent/<workstream>`. A supervisor keeps at least five agents alive; see
`scripts/swarm-supervisor.sh` and `.agents/slop/swarm-status.log`.
