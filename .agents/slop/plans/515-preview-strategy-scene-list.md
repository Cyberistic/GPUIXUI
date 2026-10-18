# 515 — The preview strategy names every scene, and stops implying none is gesture-driven

**Phase:** F (documentation truth and its guard)
**Depends on:** 410, 412, 455–458, 486, 492, 493, 497, 508, 513
**Owns:** `docs/preview-strategy.md`, one test file in `apps/docs`

## 1. The bug

Plan 513 added the last live scene (`message-scroller`) and updated the two
counted sentences in `docs/preview-strategy.md` and `apps/docs/README.md`.
It did **not** update the tier‑L row of the honest-tiers table, which still ends
at `Carousels`. Measured in the shipped document:

```text
$ grep -c 'liveScene' apps/docs/src/component-meta/entries.ts
43        # one type field + 42 records
$ grep 'On a record that declares' docs/preview-strategy.md
| **L** | … | On a record that declares a `liveScene` (Buttons, Tabs, … Carousels); click-to-load …
```

`Message scrollers` is missing, so the document a reader trusts for the preview
contract undercounts the shipped surface. The row also uses editorial plurals
(`Sliders`, `Number fields`, `Hotkey inputs`) that are not the registry titles
(`Slider`, `Number Field`, `Hotkey-recorder input`), and the gesture table repeats
that mismatch, so the document and the index name the same component two ways.

The same section also says:

> An interactive scene opens in the state it documents — a menu, a dialog, a
> popover or the command palette starts open — so the surface proves the real
> composition without a pointer.

That was true before plan 486. Twenty scenes are now **gesture-driven**: the
smoke clicks, types, wheels or presses a key through the renderer's automation
API, and the section *Gestures are proved, not implied* below says exactly that.
The two paragraphs contradict each other.

Nothing compares either the tier‑L name list or the gesture table's names with
the code. `preview-gaps.test.ts` guards the **gap** table, the scene **count**
and the gesture **row count**, but a renamed, duplicated or omitted name keeps
the counts right.

## 2. What changes

### 2.1 `docs/preview-strategy.md`

1. In the tier‑L row of *The honest tiers*, add `Message scrollers` to the
   list. Leave every other name as written; they are the registry record titles
   (see §2.3), which is what the new guard compares.
2. Replace the duplicated name list in *What is explicitly not claimed* with a
   pointer to that table, keeping the count and the rationale. The list must
   exist once:

   ```md
   blank frame. **42 scenes ship today**, one per record that declares a
   `liveScene`; the tier table above names them all. They are chosen because a
   still cannot prove the point: …
   ```

3. Replace the stale sentence in the tier‑L paragraph with the shipped
   interaction contract:

   ```md
   A live scene is built from the real package code: `@gpuixui/primitives` and
   `@gpuixui/components`. Some scenes mount in the state they document — a menu,
   a dialog, a popover or the command palette starts open — and 20 more are
   opened by a real gesture through the renderer's automation API; *Gestures are
   proved, not implied* below is that contract.
   ```

   Keep the following sentence about `smoke:preview` and the sized canvas.

### 2.4 `apps/docs/README.md`

The same name list is repeated a third time in the live-surface section, with
the same editorial plurals. Replace it with a pointer to the strategy document
(and keep the gesture sentence the count test reads):

```md
occurs in its view. Live scenes ship for every record that declares a
`liveScene` (42 today); `docs/preview-strategy.md` owns the tier table and
names them all. 20 of those document state only a gesture produces — …
```

### 2.2 `apps/docs/src/components/preview/preview-gaps.test.ts`

Add a `describe("the strategy names the code's scenes")` block with two tests.

Both derive the expected names from the packages, never from a copied list:

```ts
import { components } from "../../component-meta/registry";

const liveSceneTitles = components
  .filter((component) => component.liveScene !== null)
  .map((component) => component.title);

const gestureSceneTitles = components
  .filter((component) => component.liveScene !== null)
  .filter((component) => SCENE_GESTURE[component.liveScene!] !== undefined)
  .map((component) => component.title);
```

1. **`names every live scene in the tier table`** — find the tier‑L row
   (`/^\| \*\*L\*\*/m`), take the text of its last cell up to
   `; click-to-load`, split on `, `, trim, sort, and compare with
   `liveSceneTitles` sorted. Report `{ missing, extra }` so the failure names the
   component.
2. **`names one gesture row per gesture scene`** — parse the first column of the
   table under `## Gestures are proved, not implied`, drop the header and
   separator, and check that every expected title is the **prefix** of exactly
   one row (the Lists row is `Lists / list items`), and that no row is left
   without a title.

Why a prefix rule for the second: the document deliberately expands the list row
to `Lists / list items`, which is still the component's page. Any other drift
(an omitted, duplicated or renamed row) fails.

### 2.3 Naming rule (measured before implementation)

The document currently uses editorial plurals (`Sliders`, `Number fields`,
`Hotkey inputs`) while the registry uses the inventory title (`Slider`, `Number
Field`, `Hotkey-recorder input`). Those are not the same name, so a guard that
compares them would need a hand-written alias table — a second source of truth.

Instead, **both lists in the document use the exact record title**, derived from
`apps/docs/src/component-meta/entries.ts` and already proven equal to
`COMPONENTS.md` by `registry.test.ts`. Measured expected titles (registry order):

```text
Icons, Scrollable containers, Buttons, Text inputs, Text areas, Checkboxes,
Radio groups, Selects, Switches, Tooltips, Skeletons, Loading indicators,
Slider, Range slider, Number Field, OTP Field, Toggle, Rating,
Lists / list items, Toasts / notifications, Dialogs, Confirmation dialogs,
Popovers, Dropdown menus, Context menus, Command menus, Tabs, Accordions,
Collapsible sections, Pagination, Search inputs, Comboboxes, Date pickers,
Time pickers, Message scroller, Navigation Menu, Preview Card, Drawer,
Tag / token input, Mention input, Hotkey-recorder input, Carousel
```

That changes more than `Message scrollers`; the plan's original STOP condition
applied to a set comparison against the editorial names and is superseded by
this measured decision. The guard reports any remaining difference as
`{ missing, extra }`; if a title itself looks wrong, **STOP** and report it
rather than renaming a record.

The gesture table is rewritten the same way: `Hotkey inputs` →
`Hotkey-recorder input`, `Sliders` → `Slider`, `Range sliders` → `Range slider`,
`Carousels` → `Carousel`, `Message scrollers` → `Message scroller`. Its row set
is the 20 records whose `liveScene` has a `SCENE_GESTURE` entry.

## 3. Commands and expected results

Run from the worktree root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test preview-gaps` **before** the fix | exit `1`; the new tier‑L test reports `Message scroller` in `missing` and every editorial plural (`Sliders`, `Number fields`, `Hotkey inputs`, …) in `extra`; the gesture test reports the five renamed rows |
| After §2.1 | same command exits `0`, 2 new tests pass |
| Temporarily delete `Buttons` from the tier‑L row, rerun | exit `1`, `missing: ["Buttons"]`; restore the word and rerun → `0` |
| Temporarily rename the gesture row `Tooltips` → `Tooltip`, rerun | exit `1` naming `Tooltips`; restore → `0` |
| `nub run --filter docs test` | exit `0`; file/test totals grow by the two tests, nothing else changes |
| `nub run --filter docs check-types` | exit `0` |
| `nub run check` | exit `0` (test-quality, lint, format, types) |
| `nub run --filter docs build` | exit `0` |

## 4. STOP conditions

- `liveSceneTitles` and the tier‑L row disagree by more than `Message scrollers`
  → stop and report the exact sets; do not mass-edit prose.
- `SCENE_GESTURE` lists a scene whose record has no `liveScene`, or a gesture
  scene has no record → stop; that is a registry bug, not a document bug.
- The tier‑L row is reformatted so the parser cannot locate it → stop; do not
  weaken the test to "contains the word".
- Any test outside this file starts failing → stop and report; this plan changes
  no package code.

## 5. Acceptance

- The tier‑L row names all 42 records with a `liveScene` using their **exact
  registry titles**, `Message scroller` included; the same list is not duplicated
  in the strategy's claim list or in `apps/docs/README.md`.
- The document no longer claims every interactive scene starts open; it states
  that 20 are gesture-driven and points at the section that proves them.
- A renamed, omitted, duplicated or added scene name fails
  `preview-gaps.test.ts` by component name, and the two-direction runs in §3 are
  recorded in this plan's implementation note.
- `TODO.md` gains the finished row and its docs-site count moves 115 → 116;
  `.agents/slop/plans/README.md` gains this plan with its final status.
- The change is committed on `agent/docs-site` and pushed to origin.

## 6. Implementation record

Changed:

- `docs/preview-strategy.md` — the tier‑L list now carries the 42 registry
  titles (`Slider`, `Number Field`, `Hotkey-recorder input`, `Lists / list
  items`, `Message scroller`, …); the duplicated list under *What is explicitly
  not claimed* names the table instead; the tier‑L paragraph states that 20
  scenes are gesture-driven; the five gesture-table rows use the registry title.
- `apps/docs/README.md` — the third copy of the list is replaced by a pointer to
  the strategy document.
- `apps/docs/src/components/preview/preview-gaps.test.ts` — two tests: the
  tier‑L row set equals the records with a `liveScene`, and the gesture table's
  first column equals the records whose scene has a `SCENE_GESTURE` entry. Both
  also assert no duplicate row.

Measured (2026-10-18):

| Step | Result |
| ---- | ------ |
| test before the document fix | exit `1`; 2 failed / 6 passed. Tier: `missing` 16 (incl. `Message scroller`), `extra` 15 (the editorial plurals). Gesture: 5 missing / 5 extra |
| after the document fix | exit `0`; 8 passed |
| delete `Buttons` from the tier row | exit `1`; `missing: ["Buttons"]`; restored |
| rename `Tooltips` → `Tooltip` in the gesture table | exit `1`; `missing: ["Tooltips"]`, `extra: ["Tooltip"]`; restored |
| `nub run --filter docs test` | exit `0`; 66 files / 456 tests |
| `nub run --filter docs check-types` | exit `0` |
| `nub run check` | exit `0` (check:tests, lint, format, every workspace type-check) |
| `nub run --filter docs build` | exit `0` |
