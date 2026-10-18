# 337 — Component API truth: the documented parts are the exported parts

**Phase:** F (docs truth) · **Owner:** components workstream
(`packages/components`) · **Depends on:** 200, 304, 305, 330, 333, 335, 336.

**Status when written:** the Tier 2/5 component set is complete and green (337
unit, 517 native). Three claims are stale or self-contradictory, and one class of
drift has no guard:

1. `docs/component-api.md` §8 still carries a **"Planned Tier 2 additions"**
   table naming `TagInput`, `Countdown` and `InlineEdit` as unimplemented. All
   three landed (plans 312–314) and have §8 rows, records, pages and suites. The
   document contradicts itself two paragraphs apart.
2. `docs/avatar.mdx` opens with "a missing image never leaves a blank hole" and
   then, under Limitations, states the opposite: a missing file paints nothing
   and the initials are not restored. The code shows `<img>` instead of the
   initials whenever `src` is set (`src/avatar.tsx`), so the opening claim is
   false. `src/avatar.tsx`'s `avatarMeta.limitations` phrases the same fact too
   weakly ("the initials fallback is what shows until the picture paints").
3. `docs/alert.mdx` and `docs/confirm-dialog.mdx` say the local button stand-in
   is replaced "when `@gpuixui/primitives` lands" and that "no `Spinner`
   primitive exists yet". `packages/primitives` has landed and exports both. The
   reason the stand-in remains is different and must be stated honestly: the
   components package reads its theme from `@gpuixui/tokens`' provider while the
   primitives read a second context (`packages/primitives/src/components/ThemeProvider.tsx`),
   so adopting them is a provider-unification task, not a drop-in.

Nothing checks the §8 parts tables against the modules they describe, so a part
rename (or a part added to the contract but never implemented) is invisible until
a consumer reads the docs and finds it missing.

## 1. The rule

> A part the component-API contract lists for an implemented component must be
> an export of that component's module, and the contract must not describe a
> landed component as planned. A docs page's opening claim must not contradict
> its own limitations section.

## 2. Exact changes

### 2.1 `packages/components/src/inventory.test.ts`

Add a `describe("documented API")` block. Test-time `node:fs` is authorised by
plan 117 §3 (the file already uses it).

**Test A — every documented part is exported.**

1. Read `docs/component-api.md` (repository root) and slice from `## 8. Parts by
   component` to the next `## `.
2. Parse every markdown table row whose first cell is a component name; take the
   second cell (Parts) and extract backticked identifiers with
   ``/`([A-Za-z][A-Za-z0-9]*)`/g``. Ignore cells whose identifiers contain `*`
   (a wildcard is not an export); the Context menu row is expanded in §2.3 so
   this does not hide a real part.
3. For each row whose name equals a `meta.name` in `inventory`, check the part
   against the package's **root namespace** (`await import("./index.js")`).
   `exports.test.ts` already holds every public module to `src/index.ts`, so the
   root is exactly the public surface a part can reach; it also avoids a static
   import of 41 modules in one test. Report every name that is not a key.

**Test B — the contract does not plan a landed component.**

Parse the table under `## Planned Tier 2 additions` if that heading exists; every
listed component name must not appear in `inventory`. Removing the stale block
(§2.3) makes this pass; the check keeps the next stale entry from surviving.

**Test C — every page has a limitations section.**

For every `meta.docs`, assert the page contains a heading matching
`/^##+ .*[Ll]imitation/` (`## Limitations` or `## Accessibility and
limitations`). That is the section the release criteria require, and the two
spellings are already in use.

Header comment states the bug being guarded: a contract that names parts the
module does not export, a landed component still listed as planned, and a page
that drops its limitations section.

### 2.2 `packages/components/docs/avatar.mdx`

- Opening paragraph: replace "or before the picture paints — it shows
  deterministic initials … a missing image never leaves a blank hole" with the
  truth: initials when no `src` is given; when `src` is given the picture is what
  paints, and a missing file leaves the disc empty because the runtime reports no
  image-load failure. Point at `## Limitations`.
- No other change; the Limitations section is already correct.

### 2.3 `docs/component-api.md`

- Delete the **"Planned Tier 2 additions"** table and its lead-in (all three rows
  landed). Keep §9's rule; it already says how a new part is split out.
- Expand the Context menus Parts cell to the real exports:
  `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`,
  `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuGroup`,
  `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuSub`,
  `ContextMenuSubTrigger`, `ContextMenuSubContent`. Verify each against
  `src/context-menu.tsx` before writing; if a name differs, the check in §2.1 is
  the arbiter and the source wins.
- Fix the duplicated `aria-activedescendant` bullet in
  `packages/components/docs/command-menu.mdx` (it appears twice in the same
  section).

### 2.4 Stale "until primitives lands" claims

- `packages/components/docs/alert.mdx`: state that the dismiss control is this
  package's button stand-in, that `@gpuixui/primitives` now exports `Button` and
  `Spinner`, and that adoption waits on one shared theme provider (the interlock
  row in `TODO.md`).
- `packages/components/docs/confirm-dialog.mdx`: same correction for the busy
  indicator (`…` glyph); it becomes a real spinner when the providers unify.
- `packages/components/src/alert.tsx` / `src/confirm-dialog.tsx`: adjust the
  record text only if it repeats the stale claim (check first; do not churn
  otherwise).

### 2.5 `TODO.md`

- Move the `@gpuixui/primitives` interlock row from "pending — package not
  landed" to the real state: the package has landed; the components' local
  `internal/button.tsx` and the `…` busy glyph stay until
  `@gpuixui/tokens/react` and `@gpuixui/primitives`' `ThemeProvider` are one
  provider (owner: cross-package decision, not components).
- Under Phase F → "Docs truth pass against the implementation", add and tick a
  sub-bullet: components' contract, pages and records checked against the
  implementation (plan 337). Do not tick the phase-level row: it also covers the
  docs site.

### 2.6 Plan index

Add plan 337 to `.agents/slop/plans/README.md`, components table, `F`, depends
on `336`, status `done` with the evidence line.

## 3. Test plan

1. Write the three checks **before** fixing the docs, and run:

   ```sh
   nub run --filter @gpuixui/components test -- inventory
   ```

   Expected failures (exactly these):
   - Test A: the Context menus row lists `ContextMenu*`, which is not an export
     (the parser skips wildcards, so the first real failure is whatever the
     source disagrees with — if A is green, note it and rely on the
     both-direction proof in step 3);
   - Test B: `TagInput`, `Countdown`, `InlineEdit` are planned and landed.
   Test C should already pass; if it fails, record the page.
2. Fix §2.2–§2.4; the same command is green.
3. Both-direction proofs:
   - rename one exported part in `docs/component-api.md` (for example
     `CardHeader` → `CardHead`) and confirm Test A names it; restore;
   - re-add `| Inline edit | \`InlineEdit\` | plan 205 |` under "Planned Tier 2
     additions" (restore the heading first) and confirm Test B names it; restore;
   - delete the `## Limitations` heading from one page and confirm Test C names
     it; restore.
4. Full gates:

   ```sh
   nub run --filter @gpuixui/components test          # 337 + 3 = 340 unit
   nub run --filter @gpuixui/components test:behaviour # 517 native, unchanged
   nub run check
   nub run lint
   nub run test
   ```

## 4. STOP conditions

- Test A names a part that the module genuinely does not export **and** the
  contract is right — STOP; that is a missing part, not docs drift, and needs its
  own plan (part + test + docs + record). Do not delete the name from the
  contract to make the check pass.
- A row's component name has no inventory record but is marked implemented —
  STOP; the inventory is incomplete, which is plan 117's problem.
- The provider-unification claim cannot be evidenced from the installed
  packages — STOP; re-read `packages/primitives/src/components/ThemeProvider.tsx`
  and `packages/components/src/internal/theme.ts`, and state only what they show.
- Any doc fix requires changing component behaviour — STOP; this plan is
  documentation and checks only.

## 5. Acceptance

- The three checks fail on the drift they describe and pass on the fixed tree.
- No page claims a capability its own limitations deny.
- The contract has no "planned" row for a landed component.
- The primitives interlock reads as the real blocker (two providers), not as "the
  package has not landed".
- Unit suite 340, behaviour 517, `check` and `lint` green.

## 6. Outcome

Landed on `agent/components` (2026-10-18). Evidence:

- **Before:** the new contract check failed exactly as predicted —

  ```
  Countdown: listed as planned and in the inventory
  Inline edit: listed as planned and in the inventory
  Tag / token input: listed as planned and in the inventory
  ```

  and `docs/avatar.mdx` opened by promising that a missing image "never leaves a
  blank hole" while its own Limitations section said the opposite.
- **Both directions, part names:** changing `CardHeader` to `CardHead` in the
  Cards row failed with `Cards: documents CardHead, which is not exported`.
  Restored.
- **Both directions, limitations:** renaming `## Limitations` to `## Limits` in
  `docs/badge.mdx` failed with `Badges: docs/badge.mdx has no limitations
  section`. Restored.
- **Both directions, planned table:** the pre-fix run above is the failing
  direction; deleting the block is the passing direction. The check is vacuous
  while the block is absent by design — it only fires when a planned name is
  also in the inventory.
- **Docs corrected:** the Avatar opening claim and its `avatarMeta` limitation;
  the stale "planned" table; the Context menus parts row now enumerates all
  eleven exports; the duplicated `aria-activedescendant` bullet in
  `docs/command-menu.mdx`; and five "until `@gpuixui/primitives` lands" notes
  (`alert`, `confirm-dialog`, `command-menu`, `field`, `form`) that were false —
  the package has landed, and the real blocker is its second theme provider,
  now recorded as the interlock.
- **Suites:** unit **340** (337 + 3), behaviour **517** unchanged, `nub run
  check` and `nub run lint` green.
- The plan's per-module check was implemented against the package root: every
  public module is held to `src/index.ts` by plan 336, so the root is the whole
  public surface, and one import replaces 41.
