# 329 — Command menu recent commands

**Phase:** C/F · **Owner:** components workstream · **Depends on:** 114, 133, 200, 201, 301.

## 1. Why

`Command menus` records "no recent-command memory" as a limitation
(`COMPONENTS.md`, `commandMenuMeta.limitations`, `docs/command-menu.mdx`). A
palette that forgets what the user just ran is the difference between a demo and
a tool: the second invocation of a command should be one keystroke away.

There is no renderer storage, so recents are **component state** by default and
**caller-owned** when the app needs them to survive a remount. That keeps the
component honest: no hidden `localStorage`, no fake persistence.

## 2. Contract

```tsx
<CommandMenu
  actions={actions}
  recent={recent}                 // optional, controlled
  defaultRecent={["save"]}        // optional, uncontrolled start
  onRecentChange={setRecent}      // optional notification
  recentLimit={5}                 // default 5
  recentLabel="Recently used"     // default "Recent"
  … />
```

Rules:

- Running an enabled command records its `id` at the front of the list, removes
  any older copy, and caps the list at `recentLimit` (minimum 1).
- Running the command already at the front does not change or report a new
  list.
- With an **empty query**, the recent commands are shown first under
  `recentLabel`, in recency order, followed by every other action in declaration
  order. A recent command appears once.
- With a non-empty query, ranking is exactly as today; recents are not pinned
  and no `recentLabel` heading is injected. Running a row still records it.
- An id that no longer exists in `actions` is ignored on render (the list may
  shrink between sessions).
- `recent` makes the list controlled: the visual order changes only when the
  caller supplies a new array; `onRecentChange` still fires.
- Disabled commands are never recorded, because they never run.

## 3. Files and exact changes

1. `packages/components/src/command-menu/logic.ts` — **create**
   - Move the public `CommandAction` interface here (the component re-exports it,
     so existing imports keep working).
   - `recordRecent(recent, id, limit)`.
   - `orderWithRecent(actions, recent, label)`: recent rows cloned with
     `group: label`, then the rest; unknown/duplicate ids removed first. No
     recents returns the input array unchanged.
2. `packages/components/src/command-menu/logic.test.ts` — **create**
   - Recording: prepend, dedupe, cap, same-head no-op, limit below 1 clamps.
   - Ordering: recents first and regrouped, rest keep declaration order, unknown
     ids dropped, empty recents identity, duplicate ids collapse.
3. `packages/components/src/command-menu.tsx`
   - Import the type from the logic module and re-export it.
   - Add `recent`/`defaultRecent`/`onRecentChange`/`recentLimit`/`recentLabel`
     through `useControllableState`.
   - On an empty query use `orderWithRecent`; otherwise the existing
     `defaultMatches`/`filter` path.
   - Record in `run` before `perform()`? After the disabled check and before
     `perform()` is fine; the contract is "a command that runs is recorded".
     Keep `perform` first so a throwing perform still closes as before, then
     record. Record only when `perform` returns.
4. `packages/components/src/behaviour/command-menu.test.tsx`
   - Five native tests (§4). A small wrapper with an "Open palette" button makes
     close → reopen observable without remounting `CommandMenu`.
5. `packages/components/examples/command-menu.example.tsx`
   - Show `defaultRecent` and `onRecentChange` with a caption that says recents
     are session state unless the app persists them.
6. `packages/components/docs/command-menu.mdx`
   - A "Recent commands" section, the prop table, the persistence rule, and the
     updated Verification count; drop the recents limitation.
7. `COMPONENTS.md` — the Command menus row: recents sentence, updated test
   count, no recents limitation.
8. `.agents/slop/plans/README.md`, `TODO.md` — index and one task.

## 4. Test plan (each must be able to fail)

Logic (`command-menu/logic.test.ts`):

- `records at the front and removes the older copy` — reverse the prepend or
  drop the dedupe and it fails.
- `caps the list` — remove `Arr.take` and it fails.
- `does not report a no-op when the head already matches` — remove the head
  check and the array identity changes.
- `puts recent rows first under the requested heading` — remove the reorder and
  it fails.

Behaviour (`command-menu.test.tsx`, real GPUix renderer):

1. `shows a run command first when the palette reopens` — run the first row,
   close, reopen through the button; `Recent` is in the text, the run row's
   measured `y` is above the next section, and `onRecentChange` reported
   `["open-file"]` once.
2. `keeps recency order and does not duplicate` — run Save, reopen, run Open
   file, reopen: recent order is Open file then Save, each once.
3. `takes its initial list from defaultRecent` — first open already shows the
   recent group and the row first.
4. `ranks normally while a query is typed` — with recents, typing `op` shows
   `Open file` once and no `Recent` heading.
5. `reports the next list without moving a controlled order` — with `recent`
   controlled and `onRecentChange` observed, running a command reports the new
   array while the displayed group still reflects the supplied prop.

Both-direction proof: remove the `orderWithRecent` call in the empty-query
branch; tests 1–3 fail. Remove `recordRecent` from `run`; 1, 2 and 5 fail.
Restore and all pass.

## 5. Commands

```sh
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Expected: behaviour grows from 487 to 492, unit tests from 324 to 331; all
gates exit 0.

## 6. STOP conditions

Stop and report if:

- reopening the palette remounts `CommandMenu` (then component-owned recents
  cannot persist; document and require controlled `recent` only — do not fake
  continuity);
- the recent heading changes the keyboard handoff (the input must keep focus,
  arrows and Enter must still target the reordered rows);
- a disabled or non-existent id can enter the recorded list;
- a test can only pass by asserting the internal action clones rather than
  visible order and callbacks.

## 7. Acceptance

- [x] Recording is front-inserted, deduped, capped, and idempotent at the head.
- [x] Empty query shows recents first under the label; a query ranks exactly as
      before.
- [x] Controlled `recent` never moves without a new prop; `onRecentChange`
      still reports every accepted change.
- [x] Logic + five native tests fail without the feature and pass with it.
- [x] Docs, example, inventory record and `COMPONENTS.md` agree; the recents
      limitation is gone.
- [x] `nub run check`, `nub run lint`, `nub run test` and the behaviour suite
      are green with the measured counts.

## 8. Result

Landed 2026-10-18.

- `command-menu/logic.ts`: `CommandAction` moved here (the component re-exports
  it), plus `recordRecent` and `orderWithRecent`. Seven unit tests; removing the
  head no-op or the cap fails its own test.
- `command-menu.tsx`: `recent`/`defaultRecent`/`onRecentChange`/`recentLimit`/
  `recentLabel` through `useControllableState`. An empty or whitespace query
  shows recents first; a typed query keeps the existing ranking path. `run`
  records only after `perform` returns and after the disabled guard.
- Five native tests. The reopen path uses a real click on a visible control, so
  the close → open lifecycle is exercised rather than a remount that would reset
  component-owned recents.
- Both-direction proof: removing `orderWithRecent` failed four tests (the
  filtering test correctly still passed because it asserts normal ranking);
  removing `recordRecent` failed three. Restoring made 19/19 pass.
- Measured: behaviour **492** (46 files), unit **331** (34 files). Docs, example,
  inventory limitation and `COMPONENTS.md` updated.
- The component keeps recents for its own lifetime only. There is no renderer
  storage; an app that needs them across a remount controls `recent` and
  persists it. That is stated in the docs, not implied.
