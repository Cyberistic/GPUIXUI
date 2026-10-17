# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Harness — the supervisor that keeps the swarm alive

`[x]` `[█████████░]` 6/7

`[x]` Repo on `proserver` with the required shape, mission, rules and plan index
`[x]` opencode 2.0.31 installed with the provider credentials and a trimmed config
`[x]` Verified a real run on `opencode-go-braven/deepseek-v4.1-flash`
`[x]` Supervisor: 30-minute tick, ≥5 agents, one worktree each, idempotent and crash-safe
`[x]` Scheduler installed (launchd agent + daemon driver; see `.agents/slop/README.md`)
`[x]` Model fallback chain with limit detection, one active model for the whole swarm, and an hourly recovery probe (see `scripts/README.md`)
`[ ]` Enforce one live session per worktree: the `opencode run` loop currently
starts a new session before the previous one closes (evidence:
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`; the guard is
planned in `primitives` plan 022, `022-swarm-single-writer.md`)

---

## Phase A — audit and feasibility

`[ ]` `[░░░░░░░░░░]` 0/6

`[ ]` Inspect the environment, package manager and toolchain; record the findings
`[ ]` Establish the GPUix version, APIs, primitives, events, layout and limits
`[ ]` Read GPUix docs and examples; write the capability map
`[ ]` Inspect GPUI Kit (hierarchy, theming, layout, interaction, licence)
`[ ]` Study shadcn/ui organisation and semantic tokens; review PanelUI; review Fumadocs setup
`[ ]` Write and index every phase and package plan in `.agents/slop/plans/`

## Phase B — working foundation

`[x]` `[██░░░░░░░░]` 1/6

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[ ]` Land the primitives package
`[ ]` **Native smoke test**: layout, input, focus, overlay and panel primitives in real GPUix
`[ ]` Land one fully working component running in GPUix
`[ ]` Land the docs shell and document that component in Fumadocs

### Design tokens and theming (`tokens-theme`)

`[x]` `[███████░░░]` 29/40

`[x]` Write and index the tokens/theme plan set (plans 010–019, 050–053)
`[x]` Implement `packages/tokens`: semantic colour roles, typography, spacing,
radii, density, elevation, light + dark themes
`[x]` Implement the theme extension mechanism (`createTheme`/`extendTheme`) and
the `@gpuixui/tokens/react` provider
`[x]` Add high-contrast (AAA) light and dark themes (`getTheme(mode, "high")`)
`[x]` Add status tone roles plus `alpha` and `statusTone` helpers
`[x]` Expose `colorRoles` for the docs site's generated token tables
`[x]` Make `@gpuixui/tokens` resolvable from source so a clean checkout needs no
prebuilt `dist` (plan 016)
`[x]` Ship `focusRing(theme)` and correct the focus claims in `docs/tokens.md` and
`docs/design-system.md` — GPUix 0.10.0 has no `outline*` and no `focusVisible`
(plan 017)
`[x]` Drop `BoxShadow.inset`, document the one-shadow rule and hoist
`elevationShadow(theme, level)` (plan 018)
`[x]` Write `docs/tokens.md` (every token + extension API)
`[x]` Write `docs/design-system.md` (identity, roles, state, accessibility)
`[x]` Add platform type styles and `platformTheme(theme, platform)` for the docs
platform toggle (plan 051)
`[x]` Add the design-system rows to `COMPONENTS.md`
`[x]` Ship the avatar diameter scale (`avatarSize`) so `components` can delete
its local `DIAMETER` (plan 054)
`[x]` Ship designed `primaryHover` / `destructiveHover` roles so filled controls
stop faking hover with an alpha fill (plan 055)
`[x]` Guard the token catalogue against drift from the implementation (plan 056)
`[x]` Guard the numeric token tables in `docs/tokens.md` (typography,
spacing, radius, density, elevation, motion, borders/icons/avatars) against
drift from the implementation (plan 058)
`[x]` Expose `textRoles` and guard it against the `Typography` interface
(plan 059)
`[x]` Guard every documented colour pair — muted text on plain surfaces, input
text, ghost text on `hover`/`active`, the composited `selection` wash (plan 059)
`[x]` Make `@gpuixui/tokens/react` consumable under a GPUix `jsxImportSource`
with no tsconfig shim — the entry uses `createElement` and carries no JSX; a
consumer-config type check guards it (plan 061)
`[x]` Correct the runtime's animated-property count (eight, not seven) and the
reserved `overlay` JSDoc; evidence in the pinned `MotionStyle` (plan 060)
`[x]` Ship status text roles (`infoText`/`successText`/`warningText`/
`destructiveText`) so status labels, icons and indicator dots have a readable
colour on plain surfaces — light `warning` was 1.78:1 on `background` — and
expose them as `statusTone(...).text` (plan 057)
`[x]` Add motion tokens (durations/easings); three `primitives` call sites held
`120`/`700` as literals (plan 019)
`[x]` Guard that all four shipped themes carry every theme group (part of plan
019)
`[x]` Document the layering model (tree order, no portal in 0.10.0) and the
deliberate token omissions (plan 050; completes plan 202 §2.3–2.4)
`[x]` Reconcile the two `tokens` branches into one — motion tokens (019) and
platform type styles (051) now live on one branch (plan 053)
`[!]` Custom typefaces: `registerFont` is **absent from pinned GPUix 0.10.0** — it
exists only as an unreleased minor changeset on `references/gpuix` main — so no
registration code lands. Evidence: `@gpuix/native@0.10.0`'s `GpuixRenderer`
declares no such method and `@gpuix/react@0.10.0` re-exports that class. Plan 052
is `blocked (upstream)` and keeps the ready design (idempotent `registerFonts`) and
test plan for the release that exposes it. No font is bundled.
`[x]` Native theme gallery landed in `apps/playground` (plan 150, 14/14 green;
owner: `playground`) — it paints every `colorRoles` entry and every type role
across dark/light/high-contrast dark and asserts the runtime's own
`paintedStyle`, which is the native proof these rows cite
`[ ]` Cross-team: a visual per-platform comparison (macOS / Linux / Windows /
Default) built on `platformTypes` + `platformTheme` (owner: `docs-site` and
`playground`); ignore the `references`
**symlink** — a `references/` rule does not match a symlink, so every worktree
shows it as untracked (owner: repo tooling; `packages/README.md` already lists
`tokens`)
`[ ]` Cross-team: `components` uses `statusTone(...).text` for inline status
text, icons and indicator dots and retires its local `tone()` foreground, which
reads the solid `success`/`warning` fills as text (plan 057; owner: `components`)
`[ ]` Cross-team: `primitives` and `components` depend on `@gpuixui/tokens`
directly and delete their structural copies of the theme and role list, their
local focus-ring helpers (`primitives/src/core/style.ts`,
`components/src/internal/theme.ts`) and their first-shadow helpers
(`primitives/src/core/style.ts` `firstShadow`, `components/src/internal/theme.ts`
`elevation`), now that `focusRing` and `elevationShadow` exist and the package
resolves from source. `components` also deletes its local `DIAMETER`, `tone()`,
`withAlpha`, `HOVER_ALPHA` and borrowed `accent` pair: `avatarSize`,
`primaryHover` / `destructiveHover`, the soft status pairs, `alpha` and `info`
now ship in the package (owner: those workstreams; plans 014, 016–018, 054, 055)
`[ ]` Cross-team: `primitives` replaces the `useStep(…, 120)` / `useStep(…, 700)`
literals with `theme.motion.step` / `theme.motion.pulse`, and the Tier 2 overlay
components take enter/exit transitions from `motionTransition` (owner:
`primitives` and `components`; plan 019)
`[!]` Cross-team: `components` plan 112 builds Dialog/Popover on
`Dialog`/`DialogPortal`/`createPortal`. Published `@gpuix/react` 0.10.0 exports
none of them — only `FloatingLayer`/`floatingRootStyle`, the `<anchored>` host
element and `AnimatePresence`; `createPortal` is an unreleased changeset. The
layering rule and the no-portal limitation are documented in `docs/tokens.md`
(plan 050). Owner: `components`
`[ ]` Cross-team: `components` still carries a whole structural copy of the
package (`packages/components/packages/tokens/src`, plus a built `dist/`) — delete
it and import `@gpuixui/tokens` directly once the package is on `main` (owner:
`components`)
`[ ]` Cross-team: `docs-site` generates its type table from `textRoles` instead
of its local role array, so an eleventh role cannot be silently omitted (owner:
`docs-site`; plan 059)
`[ ]` Cross-team: `playground` deletes the `@gpuix/react/jsx-runtime` `paths`
mapping from `tsconfig.check.json` / `tsconfig.build.json`, now that the tokens
React entry carries no JSX (owner: `playground`; plan 061)
`[ ]` Cross-team: `playground` re-runs the theme gallery against the current
53-role package — the last green run was the 47-role package, and the four
`xText` roles plus `primaryHover`/`destructiveHover` are contrast-tested but not
painted natively; the `Design tokens` row then moves from `wip` to `done`
(owner: `playground`; plan 150)
`[ ]` Cross-team: `LICENSES/adabraka-ui.md` (MIT, `Copyright (c) 2025 Adabraka
Team`, "token structure referenced, no assets copied") — plan 202 §7, not this
workstream's path. Owner: licensing
`[x]` Promoted plans 010–019 and 051 to `main` (`458fe10`), then merged `main`
back (plan 053) so motion tokens (019) and platform type styles (051) are one
branch; `main` compiles `@gpuixui/tokens` from source, so `primitives`,
`components` and `docs-site` can drop their structural copies
`[ ]` Cross-team: the integration owner promotes the reconciled commit to `main`
so the shared `TODO.md`, `COMPONENTS.md` and plan index carry the tokens rows,
and retires the now-redundant `agent/tokens-platform` worktree (its branch is
`main`; `agent/tokens-theme` is the union); this agent was instructed not to push
`main`

## Phase C — Tier 1–2 components

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Tier 1 foundational components (code + test + example + docs + inventory)
`[ ]` Tier 2 composition/feedback components (same bar)
`[ ]` Verify every component in both themes

## Phase D — data and workspace components

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Tier 3 data presentation
`[ ]` Tier 4 desktop workspace (panels, docking, tabs, command palette)
`[ ]` Verify critical interactions in the real runtime

## Phase E — specialised components

`[ ]` `[░░░░░░░░░░]` 0/2

`[ ]` Tier 5 specialised components where justified
`[ ]` Document every capability GPUix does not provide, with evidence

## Phase F — integration and polish

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Consistency, keyboard, themes, composability pass
`[ ]` Performance and packaging
`[ ]` Docs truth pass against the implementation

## Phase G — release readiness

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Clean-environment install and public-export checks
`[ ]` Licence inventory and attribution complete
`[ ]` All gates green (`nub run check`, `nub run lint`, `nub run test`)

## Swarm-owned blockers (fix these)

- **B1** GPUix native bindings fail to install (blocks the playground + every native smoke test).
- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in ; each fix starts with a plan under .
