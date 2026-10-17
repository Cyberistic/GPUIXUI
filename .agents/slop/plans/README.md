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

## The plan set

Numbering is reserved per workstream so concurrent agents never collide:
`010–099` tokens and theming, `100–199` components, and whatever each other
workstream declares in its own section below.

### Components workstream (Tier 2 composition and feedback)

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [110](./110-package-components.md) | `packages/components`: package, boundaries, token/primitives contract, test harness | C | tokens, primitives | done — §7 amended for the local `Button`/`IconButton` stand-in |
| [111](./111-tier2-foundation-parts.md) | Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List | C-1 | 110 | done — all six verified in the real renderer |
| [112](./112-tier2-overlays.md) | Overlays: Dialog, Confirmation dialog, Popover | C-2 | 110, 111 | done — probe answers in §1c; 25 native behaviour tests + 5 dismiss-stack logic tests |
| [113](./113-tier2-disclosure-navigation.md) | Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination | C-3 | 110, 111 | done — 5 components, 33 native behaviour tests |
| [114](./114-tier2-menus.md) | Menus: Dropdown, Context, Command | C-4 | 110, 111, 112 | done — 3 menus, shared core, 23 native behaviour tests |
| [115](./115-tier2-feedback.md) | Feedback: Toast system (Effect) and inline validation | C-5 | 110, 111, 112 | done — store + provider/viewport + Field, 12 native behaviour tests |
| [116](./116-tier2-choice-inputs.md) | Choice inputs: Search input, Combobox (+ date picker delivered in 119) | C-6 | 110, 111, 114 | done — 16 native behaviour tests |
| [117](./117-tier2-verification.md) | Tier 2 verification, inventory sync check and completion gate | C/F | 110–116 | done — inventory check + 11-test theme matrix; gate green |
| [118](./118-single-writer-components.md) | B3 in the components worktree: two live writers, one tree | cross-cutting | — | resolved in this worktree; permanent `scripts/` fix pending |
| [119](./119-tier2-date-picker.md) | Date picker: the deferred Tier 2 item | C | 110, 112, 117 | done — 13 calendar tests + 9 native behaviour tests |
| [120](./120-list-multi-select.md) | List multiple selection + the duplicate inventory row | C/F | 111, 117 | done — 13 selection tests + 8 native behaviour tests; duplicate-row regression |
| [121](./121-accordion-keyboard.md) | Accordion header keyboard navigation | C/F | 111, 113 | done — 4 upsert tests + 4 native tests; both-direction proof |
| [122](./122-context-menu-keyboard.md) | Context menu keyboard opening and focus return | C/F | 112, 114 | done — 5 native tests; both-direction proof |
| [123](./123-toast-pause.md) | Toast pause on hover (timing adjustable) | C/F | 115, 117 | done — 3 store tests + 1 real-time native test; both-direction proof |
| [124](./124-toast-focus-hold.md) | Toast timers respect keyboard focus, not only the pointer | C/F | 115, 123 | done — 2 native tests (Toast: 10); both-direction proof |
| [125](./125-list-select-all.md) | List select-all (`Cmd`/`Ctrl`+`A`) | C/F | 111, 120, 117 | done — 3 selector tests + 2 native tests (List: 22); both-direction proof |
| [126](./126-menu-keyboard-open.md) | Dropdown menu keyboard opening lands on a row | C/F | 114, 117 | done — 4 native tests (DropdownMenu: 13); both-direction proof |
| [127](./127-date-picker-bounds-and-clear.md) | Date picker `min`/`max` bounds and a clear action | C/F | 119, 117 | done — 5 calendar tests + 5 native tests, plus the trigger-ref regression fix (3 native tests); behaviour 220 |
| [128](./128-ref-composition-sweep.md) | Compose the caller's ref on every part that owns one | C/F | 127, 117 | done — 5 native tests (behaviour 225); both-direction proof |
| [129](./129-menu-typeahead.md) | Menu type-ahead (`DropdownMenu`/`ContextMenu`) | C/F | 114, 126, 117 | done — 13 logic + 7 native tests (behaviour 232); both-direction proof |
| [130](./130-list-typeahead.md) | List type-ahead over the shared type-ahead core | C/F | 111, 125, 129 | done — 13 logic (moved) + 7 native tests (List 29, behaviour 239); both-direction proof |
| [131](./131-dropdown-submenus.md) | Dropdown menu submenus | C/F | 114, 122, 126, 129, 112 | done — 3 parts, 11 native tests (DropdownMenu 32, behaviour 250); both-direction proof |
| [132](./132-time-picker.md) | Time picker: the time half of "date/time pickers" | C/F | 110, 117, 119 | done — 12 logic + 8 native tests + 1 theme-matrix row (behaviour 259); both-direction proof |
| [133](./133-command-menu-fuzzy.md) | Command menu fuzzy matching and in-group ranking | C/F | 114, 129, 117 | in progress — ranked subsequence matching, groups keep order |

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

### Tokens and theme workstream

| Plan | Title | Phase | Depends on | Status |
| ---- | ----- | ----- | ---------- | ------ |
| [010](./010-phase-b-design-tokens.md) | Phase B: design tokens and theming | B | Phase A audit | done |
| [011](./011-package-tokens.md) | Package: `@gpuixui/tokens` | B | 010 | done |
| [012](./012-docs-design-system.md) | Docs: design system and token catalogue | B | 011 | done |
| [013](./013-high-contrast-theme.md) | High-contrast accessibility themes | B | 011 | done |
| [014](./014-status-tones-and-colour-helpers.md) | Status tones and colour helpers | B | 011, 013 | in progress |

Plans 010–014 own `packages/tokens`, `docs/tokens.md` and
`docs/design-system.md`; the components workstream consumes them and never
edits them.

## How to use a plan

1. Read it fully before starting. Do not skim the STOP conditions.
2. Work only inside your own worktree (`workspaces/<workstream>/`).
3. Run every command in the plan; a command that was not run did not pass.
4. On a STOP condition, stop and report with the evidence. Do not improvise a
   workaround that the plan did not authorise.
5. When done, update this table's status column and tick the matching task in
   `TODO.md`.
