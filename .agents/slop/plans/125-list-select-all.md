# 125 — List select-all (`Cmd`/`Ctrl`+`A`)

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 111 (List), 120 (multiple selection), 117 (inventory gate)
- **Status:** done, 2026-10-17. 3 helper tests + 2 native tests (List: 22),
  docs/example/inventory/`COMPONENTS.md` synced. Deviations in §10.

`COMPONENTS.md`, `docs/list.mdx` and `listMeta.limitations` all record the same
gap: a multiple-selection list has no select-all. Every desktop file list,
property tray and assignment panel that will compose `List` expects
`Cmd`/`Ctrl`+`A` to select every enabled row; today the key falls through to the
window. The rules are pure (`list/selection.ts`) and the key path is already
provable in the real renderer, so this is a small, complete hardening item rather
than an API redesign.

The one design question is the anchor. After select-all, a subsequent
`Shift`+click must extend from somewhere predictable; the first enabled row is
the convention (Windows Explorer, Finder's list view) and keeps the arithmetic
already in `range`.

---

## 1. Files

```
src/internal/key.ts                # isSelectAll predicate
src/list/selection.ts              # selectAll(rows) pure helper
src/list.tsx                       # handle Cmd/Ctrl+A in multiple mode
src/list/selection.test.ts         # + 3 helper tests
src/behaviour/list.test.tsx        # + 2 native tests
examples/list.example.tsx          # mention select-all in the reviewers panel
docs/list.mdx                      # keyboard table, limitations, verification
src/inventory.ts                   # listMeta limitations
COMPONENTS.md                      # Lists row notes
README.md                          # list line in the package table (if it names limits)
TODO.md                            # tick the new hardening task
.agents/slop/plans/README.md       # index this plan
```

## 2. `src/internal/key.ts`

Add beside the other modifier predicates:

```ts
/** Cmd+A (macOS) or Ctrl+A (elsewhere): select every row in a list. */
export const isSelectAll = (event: EventPayload): boolean =>
  event.key === "a" &&
  (event.modifiers?.cmd === true || event.modifiers?.ctrl === true);
```

`EventPayload.modifiers` already carries `cmd`/`ctrl` (plan 120 proved it through
a real click); a keystroke is the same payload shape.

## 3. `src/list/selection.ts`

```ts
/** Every enabled row's value, in declaration order. Disabled rows never enter. */
export const selectAll = (
  rows: ReadonlyArray<SelectableRow>,
): ReadonlyArray<string> =>
  pipe(
    rows,
    Arr.filter((row) => !row.disabled),
    Arr.map((row) => row.value),
  );
```

Pure `effect/Array`, no React and no native import.

## 4. `src/list.tsx`

Add one callback next to `select`:

```ts
/** Cmd/Ctrl+A: select every enabled row and anchor at the first of them. */
const selectEveryRow = useCallback(() => {
  if (!multiple) return;
  const next = selectAll(rows);
  pipe(
    Arr.head(next),
    Option.match({
      onNone: () => undefined,
      onSome: (value) => setAnchor(Option.some(value)),
    }),
  );
  commit(next);
}, [commit, multiple, rows]);
```

Then extend `handleKeyDown` before the arrow branches:

```ts
Match.when(isSelectAll, selectEveryRow),
```

Rules:

- multiple mode only; single mode and `"none"` ignore the key and report nothing;
- disabled rows are never selected (`selectAll` filters them);
- selecting the set that is already selected reports nothing (`commit` already
  compares with `sameValues`);
- focus does not move: the user keeps their place in the list;
- the anchor becomes the first enabled value, so `Shift`+click afterwards
  behaves like the same gesture in a desktop file list.

Do not change single-mode behaviour, the tab stop, or the pointer rules.

## 5. Tests

### 5a. `src/list/selection.test.ts` (logic, default run)

Header comment gains the bug guarded: "select-all must never put a disabled row
into the selection, and must keep row order rather than insertion order."

1. `selectAll` returns every enabled value in declaration order.
2. It omits the disabled row in the middle (the `rows` fixture already has `b`
   disabled).
3. It returns `[]` for a list whose rows are all disabled, and `[]` for no rows.

### 5b. `src/behaviour/list.test.tsx` (real renderer, `test:behaviour`)

Header comment gains the bugs: "Cmd+A in a multiple list did nothing, and Ctrl+A
in a single list reported a selection change."

1. **Selects every enabled row on Cmd+A.**
   - render `multiCatalog(onValueChange)`, focus `row-c`;
   - `renderer.simulateKeystrokes("cmd-a")`;
   - `onValueChange` last called with `["a", "c", "d"]` exactly (no `b`);
   - `aria-selected` true on a/c/d and false on b;
   - focus is still on `row-c`.
2. **Ignores select-all in single mode.**
   - render `catalog` (single), focus `row-a`;
   - `renderer.simulateKeystrokes("ctrl-a")`;
   - `onValueChange` was never called and focus did not move.

Prove both directions: before the handler, test 1 fails because nothing is
selected; test 2 passes trivially, so it is a regression guard, not a fix test.
Record the red output of test 1 in the commit message.

If `simulateKeystrokes("cmd-a")` does not deliver `{ key: "a", modifiers: { cmd: true } }`
on this binding, STOP (§7.1) — do not call the handler directly.

## 6. Docs, example, inventory

- `docs/list.mdx`:
  - multiple-mode keyboard table gains `Cmd+A` / `Ctrl+A` → "select every enabled
    row; focus stays";
  - the `**Not built**` sentence loses "no select-all" and keeps type-ahead,
    drag reorder and `aria-multiselectable`;
  - Limitations section loses select-all;
  - Verification gains the two tests and the new counts.
- `examples/list.example.tsx`: the reviewers panel's description mentions
  "Cmd+A selects all" (the example already has one disabled reviewer, so the
  behaviour is visible).
- `src/inventory.ts` → `listMeta.limitations`: replace
  `"no select-all, typeahead, drag reorder or virtualisation"` with
  `"no typeahead, drag reorder or virtualisation"`.
- `COMPONENTS.md` → Lists row: add the select-all rule, keep the remaining
  limitations and update the test count.
- `README.md` → the `src/list.tsx` row, if it names selection behaviour beyond
  "single or multiple selection", gains "select-all". Read it first; do not
  invent a new column.
- `TODO.md` → under "Tier 2 hardening after the inventory closed":
  `- [x] List select-all (Cmd/Ctrl+A) — plan 125`.
- `.agents/slop/plans/README.md` → add the plan 125 row, status `done` when the
  gates pass, with the test counts.

## 7. STOP conditions

1. `simulateKeystrokes("cmd-a")` does not reach `EventPayload` with
   `key === "a"` and `modifiers.cmd === true` → STOP and report the measured
   payload. Do not test the branch by invoking `handleKeyDown` directly.
2. The new behaviour test changes the meaning of an existing single-mode test →
   STOP; select-all must be inert outside multiple mode.
3. `selectAll` needs a cast, `any`, or a non-null assertion to type-check → STOP
   and report the compiler output.
4. Any behaviour test fails intermittently across two consecutive runs → STOP and
   report; there is nothing time-dependent here, so a flake means shared state
   the plan did not account for.

## 8. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 178 → 181 logic tests
nub run --filter @gpuixui/components test:behaviour   # List: 20 → 22, all files green
nub run check                                         # repo gate, exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

## 9. Acceptance criteria

- [x] `Cmd`/`Ctrl`+A selects every enabled row in a multiple list, in row order,
      and never a disabled one.
- [x] Single and `"none"` lists ignore the key.
- [x] Focus stays put and the anchor moves to the first enabled row.
- [x] A reselect of the same set reports nothing.
- [x] The new native test fails without the handler and passes with it.
- [x] Docs, example, inventory, `COMPONENTS.md`, `README.md`, `TODO.md` and the
      plan index agree with the code, and every command in §8 passes.

## 10. Deviations, recorded during implementation (2026-10-17)

1. **The callback is `selectEveryRow`, not `selectAll`.** The pure helper keeps
   the plain name; the component-local callback takes the verb-y one so the
   import is never shadowed. No API change.
2. **Both-direction proof:** with
   `Match.when(isSelectAll, selectEveryRow)` removed from `handleKeyDown`, the
   new test failed with `expected last call to have been called with
   [['a','c','d']]` and no received value; with the branch restored the suite
   passed. The single-mode guard test passes both ways by design (it guards the
   mode boundary, not the fix).
3. **Actual counts:** default suite 181 (178 + 3 helper tests), behaviour 208
   (206 + 2), List's own suite 22. The path argument after `--` does not narrow
   the workspace behaviour script, so the run covers every file.
4. **The docs' keyboard-table line about the anchor is one sentence**, not a
   separate "Anchor" section: the behaviour is a consequence of the existing
   `range` contract, not a new public concept.
