# 465 — The record's limitations stop denying what the inventory ships

**Phase:** F (docs truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 411 (the record contract), 429 (the inventory owns status), 443
(the registry mirrors the inventory), 463 (the page half of this truth pass)

## 1. Why

Plan 463 corrected eight component **pages**. The same stale claims also live in
the **records**, and `<ComponentState slug=…>` renders `record.limitations` in the
status block at the top of every component page
(`apps/docs/src/components/component-state.tsx:41-52`). The component index
searches the same strings (`component-index.tsx:33`). So after 463 the patchwork
reads like this:

| Page | Rendered by `<ComponentState>` | `COMPONENTS.md` row |
| ---- | ------------------------------ | ------------------- |
| `toast.mdx` documents pause-on-hover and the labelled action | “No progress indicator and no pause-on-hover.” | hover **and** focus pause the clock; one labelled action |
| `list.mdx` documents `selectionMode="multiple"` and type-ahead | “Single selection only: no multi-select, type-ahead or reorder.” | none/single/multiple, ranges, type-ahead over `textValue` |
| `dropdown-menu.mdx` documents submenus and type-ahead | “No submenus and no type-ahead in v1.” | one level of submenus, 500 ms type-ahead |
| `accordion.mdx` documents arrow/Home/End focus movement | “No arrow-key movement between headers.” | arrows/Home/End move focus between enabled headers |
| `context-menu.mdx` documents submenus, type-ahead and `Shift+F10` | “No keyboard path to open; it is a pointer gesture.” / “No portal, submenus or type-ahead.” | `Shift+F10` opens at the trigger; submenus and type-ahead |
| `command-menu.mdx` documents a subsequence matcher | “No fuzzy matching or recent-command memory in v1.” | case-insensitive subsequence; no recent-command memory |
| `accordion.mdx` documents arrow/Home/End movement | “No arrow-key movement between headers.” | arrows/Home/End move focus between enabled headers |

A reader sees the denial **above** the prose that contradicts it. Nothing fails:
the schema accepts any string, the template guard checks headings, and
`registry.test.ts` checks status coherence, not whether a limitation is true.

Plan 463 made the page half testable with the `shippedFeatures` table. This plan
extends the same table to the record, so one source guards both copies, and
corrects the six strings. `COMPONENTS.md` is the source of truth for what the
components ship; this plan does not edit any package.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/src/component-truth.test.ts` | Import `bySlug`; add the record test; widen two denial regexes (below); extend the block comment to name the bug. |
| `apps/docs/src/component-meta/entries.ts` | Six limitation strings corrected (§3). |
| `.agents/slop/plans/README.md` | Add this plan to the docs row. |
| `TODO.md` | Tick the docs-site row and advance the count. |

No other file changes. In particular do **not** touch
`packages/components/docs/*.mdx` or the in-package pages: they are another
workstream's paths, and the six strings below are already true there.

## 3. The seven corrections

Order matters only for `entries.ts` line numbers; search the string. Six records
change; the `dropdown-menu` record keeps its other limitation
(`No aria-haspopup, aria-controls or aria-checked in 0.10.0.`), which is true.

| Record | Old limitation | New limitation | Evidence |
| ------ | -------------- | --------------- | -------- |
| `list` | `Single selection only: no multi-select, type-ahead or reorder.` | `No reorder, group headers or nested rows, and no aria-multiselectable.` | `COMPONENTS.md` “Lists / list items”: no drag reorder or virtualisation, no `aria-multiselectable` |
| `toast` | `No progress indicator and no pause-on-hover.` | `No progress indicator and no dismiss-countdown display.` | `COMPONENTS.md` “Toasts / notifications”: hovering/focus pauses; no progress bar |
| `accordion` | `No arrow-key movement between headers.` | *(delete the line: the two remaining limits are real)* | `COMPONENTS.md` “Accordions”: arrows/Home/End move focus between enabled headers |
| `dropdown-menu` | `No submenus and no type-ahead in v1.` | `Submenus are one level deep and only open to the right.` | `COMPONENTS.md` “Dropdown menus”: no deeper nesting tested, submenus only open right |
| `context-menu` | `No keyboard path to open; it is a pointer gesture.` | `No menu key: Shift+F10 opens at the trigger, not at the pointer.` | `COMPONENTS.md` “Context menus”: `Shift+F10` opens at the trigger's bottom-left |
| `context-menu` | `No portal, submenus or type-ahead.` | `No portal; submenus are one level deep and open right.` | same row: no portal, one level of submenus |
| `command-menu` | `No fuzzy matching or recent-command memory in v1.` | `Per-group rather than global ranking; no recent-command memory.` | `COMPONENTS.md` “Command menus”: per-group ranking, no recent-command memory |

The guard found a seventh stale string the first draft of this table missed:
the accordion record still denied its own shipped arrow keys. It is a removal,
not a rewrite, because the remaining two rows already state the real limits.

Keep every other limitation in those records as it is: each states a real limit
(`No aria-haspopup`, `No virtualisation`, `No portal: render the viewport last`).

## 4. The guard

In `component-truth.test.ts`, inside the existing
`describe("inventory features the pages must not deny")`:

1. Import `bySlug` from `./component-meta/registry` (the file already imports
   `components`).
2. Add one test:

```ts
  it("does not deny it from the record's limitations", () => {
    const denied = shippedFeatures.flatMap(({ slug, denial }) => {
      const record = bySlug.get(slug);
      if (record === undefined) return [`${slug}: no record`];
      return record.limitations
        .filter((limitation) => denial.test(limitation))
        .map(
          (limitation) =>
            `${slug}: still denies ${JSON.stringify(limitation)}`,
        );
    });
    expect(denied).toEqual([]);
  });
```

3. Widen two denials so they also match the record wording:
   - the `context-menu` submenu entry and the `dropdown-menu` submenu entry:
     `/no submenus/i` → `/no [^.;\n]{0,40}submenus/i`. The `[^.;\n]` clause stops
     at a clause boundary, so the corrected `No portal; submenus are one level
     deep` and `Submenus are one level deep` do not match.
   - the `command-menu` entry: `/case-insensitive substring/i` →
     `/case-insensitive substring|no fuzzy matching/i`.
4. Extend the block comment: the same table now guards the page prose and the
   record limitations that `<ComponentState>` renders above it.

Do not add a second table: one claim per feature, checked in both places, is the
point.

## 5. Commands and expected results

Run from `workspaces/docs-site`.

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test -- component-truth` **after the guard, before §3** | **fails** with nine rows naming the seven stale strings (list ×2, accordion, dropdown-menu ×2, context-menu ×2, command-menu, toast) |
| `nub run --filter docs test` **after §3** | 0 failures (42 files / 261 tests: one new test) |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` | test-quality, lint, format and types green |
| `nub run lint` | exit 0 |

`nub run --filter docs smoke:build` is **not** required: no route, page or
component changes. Run it only if §3 grows a page edit by mistake.

## 6. STOP conditions

- A correction's evidence cannot be found in `COMPONENTS.md` or the component's
  own source: stop and record the conflict in `TODO.md`; do not write a new
  claim.
- The guard passes before §3 is applied: the table no longer covers a stale
  string. Re-read the record text and fix the regex — do not weaken the test to
  make it pass.
- A correction would need a change under `packages/`: stop; the record is the
  copy, the package owns the behaviour.
- The corrected limitation stops being a limitation (it becomes a feature
  description): rewrite it as the remaining limit; a record documents what is
  missing, not what works.

## 7. Test plan

- **Non-vacuous:** the six denials match six existing record strings, so the new
  test fails today. A denial that matches nothing in either copy is still
  meaningful only while the table has the page-side evidence test (unchanged).
- **Two directions (record both):**
  1. Without §3, `component-truth` fails with exactly the six rows above.
  2. With §3, the suite passes.
  3. Re-break one string (`list` restored to `Single selection only: …`) and
     confirm the failure names `list` again, then restore.
- The existing three page-side tests must keep passing unchanged.

## 8. Acceptance

- `grep` for the seven old strings in `apps/docs/src/component-meta/entries.ts`
  returns nothing.
- Each new limitation is traceable to the `COMPONENTS.md` row named in §3.
- `component-truth.test.ts` carries the record test and the two widened regexes;
  the measured two-direction result is recorded in §9.
- `TODO.md` and the plan index are updated; the commit is pushed on
  `agent/docs-site`.

## 9. Progress

- The record test is in `component-truth.test.ts`; the two denial regexes are
  widened as specified.
- **Without the corrections:** the test failed with seven rows — list (twice,
  because two entries share the string), accordion, dropdown-menu (twice),
  context-menu ×2, command-menu and toast.
- **With the corrections:** all seven strings are rewritten (accordion's stale
  sentence is removed, because the two remaining rows state the real limits);
  `component-truth.test.ts` passes 7/7.
- **Re-break:** restoring the old list string fails with
  `list: still denies "Single selection only: no multi-select, type-ahead or reorder."`;
  restored.
- `nub run --filter docs test`: 42 files / 261 tests green; `check-types` and
  `build` green.
