# Implementation Plans

Plans exist for **multi-day work and runtime capability gaps only**. A task that
fits in one turn is implemented directly, with a test that can fail. Completed
plans are deleted, not archived: `TODO.md` and `COMPONENTS.md` carry the outcome,
and git history carries the rest. The index below lists only active work.

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
| `300–399` | free — `300–303` are the components workstream's §9 part migrations |
| `400–499` | docs site |

## The plan set

Numbering is reserved per workstream so concurrent agents never collide:
`010–099` tokens and theming, `100–199` components, and whatever each other
workstream declares in its own section below.

### Components workstream (Tier 2 composition and feedback)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [118](./118-single-writer-components.md) | B3 in the components worktree: two live writers, one tree | cross-cutting | — | resolved in this worktree; permanent `scripts/` fix pending |

Interlocks this workstream depends on and does not own:

- `@gpuixui/primitives` exports listed in plan 110 §7;
- `apps/playground` mounting the Tier 2 examples (recorded as a TODO task);
- a decision on the GPUix version: 0.10.0 is the latest published release and is
  behind the reference clone, so it ships no `Dialog`, `Button` or
  `DismissableLayer` (evidence in `TODO.md` → Blockers).
- **B3 — one writer per tree:** resolved in this worktree 2026-10-17 08:56 — the
  stale turn committed and stood down, and the count has read `1` since. The
  permanent fix (pinned `--session`, session counting in `agent_alive`) is still
  plan `022` §5 / plan `118` §4, owner `scripts/`.

**Foundation parts are done**, which unblocks C-2 onwards. The behaviour suites run
here because plan 140's locally built `darwin-x64` binding is in the store, so the
component side is no longer waiting on primitives:

### `primitives`, `icons` and Tier 1 (block `020–049`)

Owns `packages/primitives`, `packages/icons` and the Tier 1 rows. The table is
the authority on order; the file names carry the detail.

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [022](./022-swarm-single-writer.md) | One writer per worktree — the swarm is running duplicate agents | infra | — | **BLOCKER B3 — read §3 before writing anything** |
| [030](./030-primitives-package.md) | `packages/primitives` — render primitives + Tier 1 components | B/C | 020 | implemented — all 19 Tier 1 components + `core/`; docs-site pages pending |

Cross-cutting records: `.agents/adr/0001-native-smoke-host.md` (the 0.10.0
binding gap), `0002-two-gpuix-versions.md` (the 0.5.1 legacy probe),
`0003-darwin-x64-source-build.md` (the locally built binding and the provenance
of every `verified 0.10.0` verdict).

### `tokens-theme` (block `010–019`, plus one overflow plan)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [019](./019-motion-tokens.md) | Motion tokens (durations and easings) | B | 011, 016 | in progress |
| [052](./052-register-font.md) | `registerFont`: the library's and a consumer's typefaces in the runtime | B | 011, 051 | planned — native proof blocked by B1 |

Plans 010–019 are the `tokens-theme` workstream. They own `packages/tokens`,
`docs/tokens.md` and `docs/design-system.md`; every other plan belongs to the
agent that owns its paths. The block was full at 019 (`010–019` in the table
above) and 020–049 belongs to primitives, icons and Phase C, so 051 takes the
first free block — as the tokens workstream's docs-layering plan (050) does.
052 is rescued from the abandoned `agent/fonts` branch (`6fc7641`), with its
step 1 answered from the pinned runtime's source; its native proof is blocked by
B1, so it is planned, not done.

### Reference adoption (block `200–299`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [201](./201-adopt-runtime-state-model.md) | Adopt `base-gpui`'s runtime / context / parts state model as our state convention | B | `200`, `020` | **components half done** — `core/runtime.ts` + test + doc §7 + ADR 0005; `packages/testing` helper pending |
| `202` | Reconcile `adabraka-ui`'s `ThemeTokens` with `@gpuixui/tokens` | B | `010–014`, `020` | planned |
| `203` | Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0 | A | `020`, `110` | planned |
| `204` | Adopt `adabraka-ui`'s workspace and data tiers for Tier 3–4 | A/D | `203`, `020` | planned |
| `205` | Implement the "not provided by GPUix" cluster | C/E | `200`, `201`, `203`, `030`, `110–117` | planned |
| `206` | Port **shadcn/ui's Message Scroller** behaviour — pinned follow, no yank, jump-to-latest, streaming rows | C | `200`, `201`, `203` | done — 11 rule + 10 native tests + 1 theme-matrix case (behaviour 437, unit 296); plain scroll viewport recorded as the limitation; both-direction proof |
| `207` | Port **shadcn/ui's AI Elements `chat` + `message`** — conversation scaffold and message row (streaming, reasoning, tool calls, sources, retry) | C | `200`, `201`, `206` | planned |
| `433` | **Platform theme recipes** — reshape the Windows variant into XP (Luna) / 7 (Aero), and follow Omarchy's live system theme | E | `063`, `203`, `200` | planned |
| `434` | **Landing page** — a "Hunter License" identity over a stacked macOS / Windows / Linux hero, in the register of cap.so / klack | E | `063`, `433`, `423` | planned |
| `435a` | **Pele** (Obsidian's design system) — recon, licence, and an inventory diff | A | `203`, `200` | planned |
| `435b` | **Fumadocs Editor** — ship an MDX/rich-text editor as a component in the suite (not for authoring our docs) | C/E | `200`, `203` | planned |
| `435c` | **RTL** — logical placement, a direction token, mirrored directional icons, and an RTL docs toggle | C/D | `063`, `200` | planned |
| `437` | **Embedded APIs and foreign surfaces** — the `Surface`/adapter contract (a runtime seam), the headless-vs-DOM verdict per candidate API, the GPUI/GPUix capability findings, and the ranked extra-mile backlog split by owner | A/E | `020`, `130`, `203`, `530`, `537`, `435b` | spec complete (no implementation) |
| `438` | **Keyboard controls, OTA updates, and the runtime gap list** — FlashSpace hotkey/OTA recon, the `@gpuix/native@0.11.0` key/focus/update surface with the exact missing list, the library-only vs runtime-change verdict, and the keyboard + OTA architectures | A | `020`, `310`, `316`, `437`, `reference-research.md` | keyboard half landed as `packages/keyboard`; OTA/updater open; §2 truth-passed to 0.11.0; `@gpuixui/runtime` + `@gpuixui/tw` refusals landed |
| [439](./439-motion-and-ely-components.md) | **Motion physics (open-gpui) + the Ely inventory** — verdict on porting the pure open-gpui `motion` crate (spring/timeline/sequence/retarget) to TS over GPUix `motion`, and a spec-only Ely-GPUI-Components inventory/diff/theming checklist | A | `019`, `020`, `203`, `201` | spec complete (no implementation) |

> The `200` block was written by the reference-adoption executor on
> 2026-10-17 from `.agents/slop/reference-research.md`. The per-workstream plans
> (`010–019`, `020–040`, `051`, `100–130`, `410–412`) live on their own branches
> and are merged into `main` as each workstream completes; this index is the
> union.

### Docs site (block `400–499`)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |

> The earlier phase-E docs plans (`433` platform recipes, `434` landing, `435a–c`
> Pele / Editor / RTL) are listed in the reference-adoption table above; they
> share this block but were numbered before the docs-site section existed.

### Cross-cutting styling conformance

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [524](./524-shadcn-tailwind-conformance.md) | shadcn/Base UI conformance: Tailwind recipes → `StyleDesc`, with `cn` | infra | `020`, `200`, `201` | in progress |
| [525](./525-gpui-transform.md) | GPUI transform/scale: audit the 0xErwin1 branch, merge surface, licence, and the fork-or-fallback decision | infra (renderer) | `020`, `524`, `140` | research complete — **needs port**; optional patch ported and green (`patches/gpui/`), but the fork is still not distributable; fallback recommended until gate 2. Build plumbing: `538` |
| [537](./537-gpui-ce.md) | `gpui-ce`: capability delta, patch-vs-switch, and the integration verdict | infra (runtime) | `020`, `524`, `525` | research complete — **do not switch**; port binding-level patches, keep renderer features unsupported |
| [538](./538-transform-build-fork-source.md) | Transform build plumbing: fetch the GPUix Zed fork at the pin and apply the transform patch behind `GPUIX_TRANSFORM=1` | infra (renderer) | `525`, `530`, `140` | source integration done — fetch, patch apply and flag transitions proven without a build; transform-enabled build deliberately deferred |

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
