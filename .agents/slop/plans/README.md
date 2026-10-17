# Implementation Plans

**This directory is the swarm's first deliverable.** No implementation work
starts until the plan set below exists and is indexed here.

Each plan is **self-contained for a weaker executor**. That means, at minimum:

- the exact files to create or change, and their exact paths;
- the exact commands to run, and the expected result of each;
- **STOP conditions** — the point at which the executor must stop and report
  rather than improvise;
- a **test plan** — which tests to write, what they must be able to catch, and
  how to prove the test fails without the fix;
- the acceptance criteria that let the executor say "done".

Naming: `NNN-kebab-title.md`, numbered in dependency order. One plan per phase,
one per package, plus a plan for each cross-cutting concern (native smoke test,
licensing, docs site).

**Number blocks.** Plans are counted across every worktree (see `PLAN.md` D7).
Blocks are reserved so concurrent workstreams do not collide:

| Block | Reserved for |
| ----- | ------------ |
| `010–019` | tokens and theming |
| `020–049` | primitives, icons, Phase C |
| `050–099` | free |
| `100–199` | packages, apps, smoke test |
| `200–299` | reference adoption and gap sequencing |
| `300–399` | free |
| `400–499` | docs site |

## The plan set

### `tokens-theme` (block `010–019`, plus overflow plans `050–053`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [010](./010-phase-b-design-tokens.md) | Phase B: design tokens and theming | B | Phase A audit | done |
| [011](./011-package-tokens.md) | Package: `@gpuixui/tokens` | B | 010 | done |
| [012](./012-docs-design-system.md) | Docs: design system and token catalogue | B | 011 | done |
| [013](./013-high-contrast-theme.md) | High-contrast accessibility themes | B | 011 | done |
| [014](./014-status-tones-and-colour-helpers.md) | Status tones and colour helpers | B | 011, 013 | done |
| [015](./015-colour-role-index.md) | Colour role index for documentation | B | 011, 013, 014 | done |
| [016](./016-tokens-consumable-exports.md) | `@gpuixui/tokens` resolvable without a prebuilt `dist` | B | 011 | done |
| [017](./017-focus-ring-and-docs-truth.md) | Focus ring helper and the focus documentation truth pass | B | 011, 016 | done |
| [018](./018-elevation-truth.md) | Elevation truth: one shadow, no unsupported fields | B | 011, 016 | done |
| [019](./019-motion-tokens.md) | Motion tokens (durations and easings) | B | 011, 016 | done |
| [050](./050-docs-layering-and-omissions.md) | The layering model and the deliberate token omissions | B | 011, 017–019 | done |
| [051](./051-platform-type-styles.md) | Platform type styles: one real theme per platform | B | 011, 016 | done |
| [052](./052-register-font.md) | `registerFont`: the library's and a consumer's typefaces in the runtime | B | 011, 051 | blocked (upstream: not in 0.10.0) |
| [053](./053-reconcile-tokens-branches.md) | Reconcile the two `tokens` branches into one | B | 010–019, 050–052 | done |
| [054](./054-avatar-size-scale.md) | The avatar diameter scale | B | 011, 016 | done |
| [055](./055-filled-control-hover-roles.md) | Designed hover roles for filled controls | B | 011, 013–016 | done |
| [056](./056-docs-truth-guard.md) | Docs truth guard for the token catalogue | F | 010–019, 050–055 | done |
| [057](./057-status-text-roles.md) | Status text roles: a readable status tonality on plain surfaces | B | 010–019, 050–056 | done |
| [058](./058-docs-numeric-tables-guard.md) | Docs-truth guard for the numeric token tables | F | 056 | done |
| [059](./059-catalogue-index-and-contrast-completeness.md) | The type-role index and the unguarded colour pairs | F | 010–019, 050–058 | done |
| [060](./060-motion-property-count-truth.md) | The animated-property count and the reserved `overlay` level | F | 018, 019, 058, 059 | done |
| [061](./061-react-entry-consumer-jsx.md) | The React entry must not inherit the consumer's JSX runtime | B/F | 011, 016 | done |
| [062](./062-design-system-truth-guard.md) | Hold the design-system narrative to the implementation | F | 056, 058, 059 | done |

Plans 010–019 are the `tokens-theme` workstream. They own `packages/tokens`,
`docs/tokens.md` and `docs/design-system.md`; every other plan belongs to the
agent that owns its paths. The block was full at 019 (`010–019` in the table
above) and 020–049 belongs to primitives, icons and Phase C, so the overflow
plans take the free `050–099` block: 050 layering, 051 platform type, 052 font
registration (rescued from the abandoned `agent/fonts` branch, `6fc7641`; its
step 1 was first answered from `references/gpuix` main and then re-checked
against the pinned runtime, which **does not expose the API** — see the plan's
decision section), and 053 the reconciliation of this workstream's two branches.
054 and 055 close the last two open `components` interlocks on the package: the
avatar diameter scale (`components/TODO.md` interlocks, row *"An avatar diameter
scale"*) and the designed filled-control hover roles (the `primaryHover` /
`destructiveHover` row). The earlier interlock rows — the soft status pairs, the
`alpha` helper and the `info` role — were already shipped by plan 014 and only
need the consumer to drop its structural copy. 056 is the Phase F docs-truth
slice for this workstream: it makes `docs/tokens.md`'s colour catalogue fail the
test suite if it drifts from the shipped themes. 057 closes the status-tone
contract: the solid fills are tuned as backgrounds, so status text, icons and
dots drawn on `background`/`card` get their own `xText` tonality (light
`warning` measured 1.78:1 against the canvas). 059 closes the last two drift
surfaces: a `textRoles` index beside `colorRoles` (the docs site had retyped the
ten roles) and the contrast pairs the catalogue claimed but never guarded —
muted text on plain surfaces, typed input text, ghost text on the `hover`/
`active` washes, and the composited `selection` wash. 060 closes the two remaining
false statements in the motion and elevation prose: the runtime animates eight
`MotionStyle` properties, not seven, and the reserved `overlay` level paints
nothing (the "inset ring" comment survived plan 018). 061 closes the last
cross-team interlock on the package's React entry: it carried the package's only
JSX, so a consumer's `jsxImportSource` (`@gpuix/react`) forced the playground to
map a jsx-runtime path that `tokens` must not depend on. The entry now uses
`createElement`, and a consumer-shaped type check guards it. 062 closes the last
unguarded document in this workstream: `docs/design-system.md` carries the
identity metrics, role count, surfaces, type summary and the spacing, density,
radius, icon and avatar scales as prose, and nothing held them to the package
while the catalogue was already guarded. The §9 floor table stays prose because
`color.test.ts` enforces its behaviour on every shipped pair.

### Reference adoption (block `200–299`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| `200` | Adopt `base-gpui`'s compound-part API contract as the Tier 1–2 public API spec | A | `020`, `030`, `110–117` | planned |
| `201` | Adopt `base-gpui`'s runtime / context / parts state model as our state convention | B | `200`, `020` | planned |
| `202` | Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens` | B | `010–014`, `020` | done (tokens scope); licensing row open |
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | planned |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |

> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> (`010–019`, `020–040`, `050–053`, `100–130`, `410–412`) live on their own
> branches and are merged into `main` as each workstream completes; this index is
> the union.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
