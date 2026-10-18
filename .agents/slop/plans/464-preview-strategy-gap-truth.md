# 464 — `docs/preview-strategy.md` names the real preview gaps, and a guard keeps it that way

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 412 (the preview strategy), 455–458 (the live-scene contract), 461 (the 17 new pages and their tier-V reasons)

## 1. Why

`docs/preview-strategy.md` is the source of truth for every preview on the
site. Its last section is the only written claim a reader has about which
component pages show neither a live GPUix surface nor a tier-A illustration,
and why. That claim is **stale**:

- it says **five** records remain (`context-menu`, `date-picker`, `combobox`,
  `select`, `tooltip`, `toast` — six slugs across five bullets), and
- `apps/docs/src/components/preview/scene-contract.test.ts` now measures
  **nine** (`combobox`, `context-menu`, `date-picker`, `drawer`,
  `hotkey-input`, `mention-input`, `navigation-menu`, `toast`, `tooltip`).
  Plan 461 added Drawer, Mention input, Navigation menu and Hotkey recorder to
  the map and updated `apps/docs/README.md`, but not this document.

The gap list is a contract: a page may only sit at tier V/X for a measured
reason. Because the document is prose, nothing compared it to the code, so the
plan-461 addition drifted silently. This plan fixes the prose **and** makes the
agreement testable, so the next gap cannot be added without the document.

## 2. What changes (exact files)

| File | Change |
| ---- | ------ |
| `apps/docs/src/components/preview/gaps.ts` | **New.** Export `NO_LIVE_SCENE: ReadonlyMap<string, string>` — the map currently inline in `scene-contract.test.ts`, unchanged keys and reasons. |
| `apps/docs/src/components/preview/scene-contract.test.ts` | Import `NO_LIVE_SCENE` instead of declaring `noLiveScene`; delete the local map. |
| `apps/docs/src/components/preview/preview-gaps.test.ts` | **New guard** (§4). |
| `docs/preview-strategy.md` | Replace the "Five records remain…" bullet list with a `### The pages without a live scene` table of **all nine** gaps, each with its measured reason. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Tick the new docs-site row; keep the count current. |

## 3. The document edit

In `docs/preview-strategy.md`, under **What is explicitly not claimed**, replace
the `- That a live scene exists for every component.` bullet's tail (from
"**Five records remain**" to the end of the file) with:

```md
  **Nine records remain** with neither a live scene nor an illustration, each
  for a measured reason and never for convenience. This table is the same set
  `apps/docs/src/components/preview/gaps.ts` declares; `preview-gaps.test.ts`
  fails when the document and the code disagree.

### The pages without a live scene

| Component | Why it has no live scene |
| --------- | ------------------------ |
| `combobox` | The wrapper owns the popup's open state and exposes no `defaultOpen`. |
| `context-menu` | The surface paints at an internal point no prop can set. |
| `date-picker` | The picker owns its open state and exposes no `defaultOpen`. |
| `drawer` | The panel exists only while open and is anchored by its trigger; an approximation would show a button, not the drawer. |
| `hotkey-input` | The field's content is a captured chord, which needs a real key event rather than a static layout. |
| `mention-input` | The suggestion list exists only while a query is open and no prop opens it. |
| `navigation-menu` | The panel exists only while open; the rest state is a trigger row that proves nothing about the menu. |
| `toast` | A scene must race the toast's own dismissal, and its provider pulls the Effect runtime into every scene. |
| `tooltip` | The wrapper exposes no open state, and a headless check cannot prove a hover-opened tip. |

The API asks are recorded in `TODO.md`; a scene is never faked.
```

Keep every other section as it is. Re-read the map before writing: the prose
is the map's human wording, not a second set of facts.

## 4. The guard — `preview-gaps.test.ts`

Read `docs/preview-strategy.md` from the test with
`fileURLToPath(new URL("../../../../../docs/preview-strategy.md", import.meta.url))`
(the same relative-file technique `content-references.test.ts` uses). Then:

1. Slice the document from the `### The pages without a live scene` heading to
   the next `## ` or `### ` heading (or end of file).
2. Parse the table rows `| \`slug\` | reason |` into a slug → reason map.
3. Assert the slug set **equals** `NO_LIVE_SCENE`'s keys, sorted, so a missing
   row, an extra row or a renamed slug fails with both lists printed.
4. Assert every reason cell is non-empty and does not contain `TODO`.
5. Assert the section exists at all — a deleted heading fails rather than
   parsing an empty set that happens to match nothing.

Header comment must state the bug being guarded: *the gap list said five while
`noLiveScene` measured nine after plan 461.*

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 0 failures; 42 files / 260 tests (255 + this plan's three guard tests + plan 463's two) |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` | test quality, lint, format and types green |
| `nub run lint` | exit 0 |

## 6. STOP conditions

- The document's gap list and the map cannot be made to agree without changing
  a *reason*: stop and record which record's reason is wrong in `TODO.md` for
  the components workstream. Do not weaken the guard to a subset check.
- Parsing the table needs regex gymnastics beyond the one line shape above:
  stop and report; do not move the document's list into code instead — the
  document is the deliverable.
- A record leaves the gap map (a scene lands): that is not this plan's scope.
  The guard fails until the document row is removed, which is the correct
  behaviour.

## 7. Test plan (both directions)

1. Delete the `drawer` row from the document table → `preview-gaps.test.ts`
   fails naming `drawer` as missing from the document; restore → green.
2. Add a `select` row to the document without adding it to `NO_LIVE_SCENE` →
   the same test fails naming `select` as extra; remove → green.
3. Blank the `toast` reason → the non-empty assertion fails; restore → green.

Record the exact failure messages in §9.

## 8. Acceptance

- The document lists the same nine gaps the code enforces, with readable
  reasons.
- The new guard fails on a missing row, an extra row, an empty reason and a
  deleted heading; each proven once and reverted.
- `nub run --filter docs test`, `check-types` and `build` pass; `nub run check`
  and `nub run lint` pass; the commit is pushed on `agent/docs-site`.

## 9. Progress (2026-10-18)

- `NO_LIVE_SCENE` moved to `apps/docs/src/components/preview/gaps.ts`; both
  `scene-contract.test.ts` and the new `preview-gaps.test.ts` import it.
- `docs/preview-strategy.md` now names all nine gaps in a table the guard reads.
- Two-direction proofs, measured and reverted:
  - deleting the `drawer` row → `preview-gaps.test.ts` failed with
    `document is missing: drawer`;
  - adding a `select` row → failed with `document lists a gap the code does not
    enforce: select`;
  - blanking the `toast` reason → failed with `toast: reason is empty`.
- `nub run --filter docs test`: 42 files / 260 tests green; `check-types`,
  `build`, `nub run check` and `nub run lint` green.
