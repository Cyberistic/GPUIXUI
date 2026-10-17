# MISSION.md — the source of truth

> **Read this file before anything else.**
>
> **The swarm's first deliverable is high-detail implementation plans under
> `.agents/slop/plans/` — one per phase and one per package.** Each plan is
> self-contained for a weaker executor: exact files, exact commands, expected
> results, STOP conditions, and a test plan. **No implementation work starts
> until those plans exist and are indexed in `.agents/slop/plans/README.md`.**
> `TODO.md` is the persistent source of truth so work resumes after context
> compaction or a restart.

---

**Objective.** Build a production-quality, reusable **native UI component
library powered by GPUix + React**, using these as references — **GPUI Kit**
(https://github.com/longbridge/gpui-kit), **shadcn/ui** (https://ui.shadcn.com/),
**PanelUI** (https://panelui.dev/docs/components), **GPUix**
(https://github.com/remorses/gpuix), **Fumadocs** (https://fumadocs.dev/). The
library must be independently branded, maintainable and extensible. Build the
**actual library**, not a prototype, mockup, gallery or docs site. Deliverables:
a working GPUix-native library; a comprehensive component collection; a
consistent design system and theming architecture; a Fumadocs component
documentation and showcase; working examples, interaction demos and API docs;
automated tests/validation/build tooling; clear install, usage, contribution and
extension instructions. Work autonomously; inspect first, decide without
unnecessary questions, iterate until the acceptance criteria are met.

**Mandatory architectural principles.**

- **GPUix is the rendering target.** The runtime must use GPUix and its React
  integration. Do **not** implement the components as DOM/HTML/CSS-styled React
  or a browser app disguised as native. The Fumadocs site is a separate web app
  and may use ordinary web tech. Inspect GPUix's actual APIs, primitives, events,
  layout and limitations **before** designing abstractions; establish what is
  genuinely supported. Do not assume DOM events, CSS, Radix or HTML semantics
  exist in the native runtime. Build thin compatibility abstractions where
  needed, but never pretend unsupported features work.
- **shadcn/ui is the architectural and DX reference**: composable predictable
  APIs, a small set of foundational primitives, consistent variants/sizes,
  design tokens and semantic theming, component-level docs, copyable readable
  implementations, accessible patterns where the runtime supports them,
  developer ownership of source, realistic composition examples. Do not import
  its browser-oriented internals.
- **GPUI Kit is the native UI reference**: component hierarchy, visual design,
  theme implementation, layout, input/interaction models, tables/data
  presentation, menus/dialogs/popovers/overlays, complex workspace components,
  styling conventions. Reimplement the behaviour with GPUix-compatible
  primitives — not a mechanical Rust→TS substitution. Reuse source only where
  APIs are compatible **and** the licence permits.
- **PanelUI is the panel/workspace reference**: resizable panels, split layouts,
  tabbed workspaces, panel groups, collapsible sections, nested layouts,
  workspace composition, keyboard interactions. Verify what it documents and
  what GPUix supports.
- **Fumadocs is the documentation platform**: build a real Fumadocs site with
  its supported architecture; do not invent a custom docs framework. It must be
  independent of the native runtime while accurately documenting and showcasing
  the real native components.

**Reconnaissance first.** Inspect the repo, package manager and environment;
identify the GPUix version and APIs; read GPUix's docs/examples; inspect GPUI
Kit's implementations, dependencies and **licence**; study shadcn's organisation;
review PanelUI; inspect Fumadocs' current setup and MDX conventions; identify
build/test/type-check/packaging/native constraints. Record findings and produce
an implementation plan with explicit acceptance criteria. Maintain **`PLAN.md`**
(architecture, phases, decisions), **`TODO.md`** (granular tasks, dependencies,
status — the source of truth for resuming after a restart), **`COMPONENTS.md`**
(inventory, status, limitations) and **`LICENSES/`** (licences and attribution).
Adapt to the existing repo rather than destroying it; if empty, establish a clean
workspace. Don't spend the whole task researching.

**Workspace architecture.** TypeScript-first monorepo; prefer the established
package manager. A possible structure —
`apps/{docs,playground}`, `packages/{tokens,primitives,components,icons,data-grid,docking,editor,testing}`,
`examples/{basic-app,settings-app,workspace-app}`, plus `PLAN.md`, `TODO.md`,
`COMPONENTS.md`, `LICENSES/`. Only introduce packages with a real
responsibility and implementation; no empty scaffolding. **Boundaries:** tokens
must not depend on components; primitives must not depend on higher-level
components; components may depend on tokens+primitives; specialised packages may
depend on foundational ones; the docs app may consume API metadata/examples;
**the native runtime must not depend on the docs site**. Keep the public API
stable and typed.

**Design system.** A cohesive system, not unrelated components: study GPUI Kit's
appearance and shadcn's semantic tokens, then develop an **original** identity
that works in desktop apps. Implement light/dark themes; semantic
background/foreground/border/muted/accent/primary/destructive/focus tokens;
typography scales; spacing; component dimensions; radii; borders/separators;
interaction, disabled, loading, focus and selection states; density options;
icon sizing/alignment; overlay/tooltip/popover/modal layering; high-contrast
considerations. Centralised tokens and semantic roles — never scattered literal
colours. Themes extensible without rewriting components. Verify every component
in both themes. Do **not** assume CSS variables or CSS theming work in GPUix —
use what the runtime supports. Document every public token and the extension
mechanism.

**Component inventory** (build in dependency order; the inventory is a target,
not permission to fake unsupported things):

- **Tier 1 foundational**: text/typography, icons, separators, spacers,
  stack/layout primitives, boxes/containers, scrollable containers, buttons,
  button groups, labels, text inputs, text areas, checkboxes, radio groups,
  selects, switches, progress, tooltips, skeletons, loading indicators.
- **Tier 2 composition/feedback**: cards, badges, avatars, lists, list items,
  empty states, alerts, inline validation, toasts/notifications, dialogs,
  confirmation dialogs, popovers, dropdown menus, context menus, command menus,
  tabs, accordions, collapsible sections, breadcrumbs, pagination, search
  inputs, comboboxes, date/time pickers where feasible.
- **Tier 3 data presentation**: tables, sortable tables, row selection, column
  configuration, resizable columns, filtering controls, data toolbars,
  virtualized lists, virtualized tables where GPUix permits, tree views,
  expandable rows, key-value displays, property panels, statistic/metric cards,
  charts where a native rendering solution exists.
- **Tier 4 desktop workspace** (GPUI Kit + PanelUI): resizable split panes,
  panel groups, collapsible sidebars, tabbed panels, detachable/movable tabs if
  supported, docking layouts, nested panel arrangements, workspace layouts,
  persistent panel state, keyboard navigation, command palette, application
  menus, status bars, toolbars, breadcrumb navigation, inspector panels,
  property editors, file trees, log viewers, terminal surfaces if feasible,
  search-and-replace, multi-pane editing layouts. Complex workspace components
  must be independently reusable and composable.
- **Tier 5 specialised** where justified: code editor integration, syntax
  highlighting, diff viewer, rich-text editing, image preview, file/folder
  selection, drag-and-drop, notification centre, multi-step forms, virtualized
  hierarchical data, advanced filtering/query builders. Where GPUix lacks a
  capability, investigate alternatives and **document the limitation**. Never
  ship a decorative placeholder as a working component.

**Implementation standards.** Every component: one clear responsibility; typed
public API; sensible defaults; composable children where appropriate;
predictable variants/sizes; consistent theme integration; correct interaction
states; keyboard behaviour where supported; clear disabled/error behaviour; uses
supported GPUix APIs; tests appropriate to its behaviour; a docs page; at least
one working example; an inventory record. Target API shape (adapt to the real
runtime and document deviations):
`<Button variant="primary" size="md">Save changes</Button>`. Controlled state
where it helps the consumer, uncontrolled where practical. Avoid boolean-prop
proliferation, config objects, duplicated behaviour and abstractions that only
hide implementation. Keep components small enough to understand without
fragmenting every expression. Strict TypeScript; no `any`, unsafe casts,
swallowed errors or fake implementations. Don't add a big dependency because it
is popular in browser React.

**Interaction, layout, state.** Prioritise real functionality over visual
imitation. Implement and verify: button activation; input editing; focus
management; selection; keyboard navigation; menu open/close; dialog lifecycle;
outside-click where supported; nested overlays; scroll behaviour; resizable
panel interaction; tab selection/movement; table sort/selection;
filtering/search; empty and error states; workspace layout persistence where
appropriate. Decide what state belongs to a component, a composite, or the app;
avoid unnecessary global state; keep complex state machines explicit and
testable. Build abstractions around GPUix's native events rather than assuming
DOM behaviour. **Do not mark an interaction complete until tested in the actual
native runtime or a verified compatible test environment.**

**Fumadocs docs and showcase.** A complete site with clear IA: Introduction,
Installation, Getting started, Architecture, Theming, Typography, Components,
Layouts, Workspace, Data display, Patterns, Examples, API reference,
Contributing, License and attribution. **Every component page**: description;
interactive/runnable preview where supported; important variants; sizes/states;
usage example; API/prop docs; composition examples; keyboard notes; theming
behaviour; accessibility considerations and limitations; dependencies; related
components; implementation status when incomplete. Provide copyable source.
Prefer realistic compositions (a dialog page shows a real form/confirmation
workflow, not a floating rectangle). **Native previews — be honest**: do not
render a fake web version and imply it is native. Choose the strongest honest
strategy: (1) embed a real native surface if supported; (2) otherwise a
companion native playground with run instructions; (3) if browser previews are
used, **label them as illustrative approximations**; (4) for unsupported
interactions, give source + real screenshots + a limitation notice. Keep
metadata/inventories structured so navigation and status are generated
consistently. Showcase quality: fast navigation, component search, clear
sidebar, consistent previews, readable code blocks, light/dark docs themes,
responsive layout, good typography, cross-links, a useful landing page and
quick-start. Use Fumadocs' supported MDX conventions.

**Testing and quality gates.** The smallest effective toolchain: TS strict
checking; lint + format; unit tests for deterministic logic; component behaviour
tests; integration tests for composites; **native runtime smoke tests**; docs
build validation; package build validation; public-export checks;
dependency/licence checks. Test representative critical interactions (dialog
open/close/confirm; menu selection/dismissal; input update/validation; tabs and
panel switching; theme switching; table sort/selection; panel resizing;
workspace restore). Use real GPUix runtime tests for what a DOM test cannot
validate; where native infrastructure is unavailable, document the exact
limitation and give the strongest alternative. **Never claim a test passed
unless it ran.**

**Licensing and provenance (release requirement).** Verify GPUI Kit's actual
licence; inspect NOTICE and third-party licences; inspect licences for shadcn/ui,
PanelUI, Fumadocs, GPUix, icon sets and copied assets; distinguish inspiration
from copied source; preserve copyright/licence notices on reused code; track
provenance of adapted implementations; include required
attribution/redistribution notices; **do not copy logos or trademarks** into the
new identity; produce a licence inventory before release. Create an original
package name, branding, docs identity and release metadata.

**Execution phases.** A: audit and feasibility (map requirements to GPUix
capabilities; architecture; plans). B: working foundation (workspace,
boundaries, tokens, theming, primitives, example app, docs shell) — end with
**at least one fully working component running in GPUix and documented in
Fumadocs**. C: Tier 1–2 components (code + tests + example + docs + inventory
entry before marking complete). D: data and workspace components in dependency
order, prioritising what GPUix supports robustly. E: specialised components;
document what needs unavailable infrastructure. F: integration and polish
(consistency, keyboard, themes, composability, native behaviour, performance,
packaging, docs). G: release readiness (clean-environment install, public
exports, examples, licence compliance, all gates). **Completing a phase is not a
reason to stop** while the acceptance criteria are unmet.

**Autonomous iteration loop** — after every meaningful batch: inspect the
implementation; compare against requirements/references; run format, lint,
type-check, tests and relevant builds; run the native playground/smoke tests;
inspect screenshots/runtime output; find broken behaviour, missing
functionality, inconsistent APIs, incomplete docs; update
`TODO.md`/`PLAN.md`/`COMPONENTS.md`; fix the highest-priority issues; repeat.
**Do not stop** after a plan, a scaffolded monorepo, a few attractive
components, a docs shell, or a first passing build. On a blocker: investigate
the cause; check official docs and working examples; try a minimal
reproduction; evaluate alternatives; make a concrete decision; continue with
unblocked work. Do not retry the same failed command unchanged. If a capability
is genuinely unavailable, document the evidence, the affected components, the
alternatives and the remaining work. **Never fake completion to satisfy the
inventory.**

**Definition of done.** *Architecture*: runs on GPUix; not a disguised browser
app; clear boundaries/APIs; centralised extensible theming; reproducible build.
*Components*: every feasible inventory item really implemented; typed props and
documented behaviour; critical interactions work in the target runtime;
consistent composition/themes/states; complex components reusable independently
of the example app. *Documentation*: Fumadocs builds; every implemented
component has a page; accurate examples and API info; native previews genuine or
clearly labelled; verified install/getting-started. *Quality*: type-check, lint,
tests and builds pass; critical interactions have automated or documented
runtime verification; no broken placeholder presented as complete; no hidden
critical issues; limitations explicit. *Release*: complete metadata/exports;
licence and attribution met; install and examples work from a clean checkout;
clear contribution and maintenance workflow.

**Final report** when finished: final repo structure; architecture and key
decisions; inventory grouped by completion status; implemented features and
notable differences from the references; build/lint/type-check/test results; how
to run the playground and Fumadocs; install/usage examples; licence and
attribution summary; remaining limitations with reasons and evidence; the
highest-value future improvements. Be honest about what was implemented, tested
and left incomplete.

**Three practical constraints the owner adds:** (1) `TODO.md` is the persistent
source of truth so work resumes after context compaction or a restart; (2) work
to a **time/iteration budget** — finish complete components in priority order
rather than generating dozens of half-finished ones; (3) require a **real native
smoke test early** — the biggest risk is whether GPUix supports the layout,
input, focus, overlay and panel primitives required; resolve that before
investing heavily in the component API. And: **Fumadocs runs in the browser
while the library runs through GPUix** — unless GPUix exposes a supported way to
embed its rendering surface in the docs site, the docs use code examples plus a
companion native playground, never a silent HTML/CSS reimplementation.

---

## Platform styles (macOS · Linux · Windows) — a first-class requirement

The library ships **three built-in platform style variants**, pre-styled to look native on
**macOS**, **Linux** and **Windows** (plus the default variant). They are real, **editable
token themes** in `packages/tokens` — not docs-only CSS. A consumer picks a platform, or
starts from one, and can **change any of its values** to match their own design, exactly as
shadcn/ui lets a user own and edit the source: copyable, readable, documented, never an
opaque preset. The default theme must remain the identity the rest of the system is built
on; the platform styles are variants of it, not replacements.

The **Fumadocs site** gets a **platform toggle** (macOS · Linux · Windows · Default) that
switches every component preview between the platform styles, so a reader sees how a
Button, a Tab, a Panel, a menu and a table look on each platform. The toggle state belongs
in the page URL (shareable) and is remembered across navigation; it is documented under
Theming.

**Honesty rule (unchanged).** The docs run in a browser while the library runs on GPUix, so
a browser preview is an **illustrative approximation** unless it is a real GPUix surface —
label it as such. The platform variants must exist in the library itself, so the docs
preview reflects real theming and not a mock.

**Acceptance.** A reader toggles macOS -> Windows and every preview changes; a consumer can
take one platform theme file, edit it, and ship their own look; both are covered by tests
and documented under Theming.
