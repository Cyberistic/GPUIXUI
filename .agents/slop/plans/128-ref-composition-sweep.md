# 128 — Compose the caller's ref on every part that owns one

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** 127 (`internal/ref.ts`, the first three trigger parts), 117
- **Status:** done, 2026-10-17. 225/225 native tests; both-direction proof and the
  one test correction in §7.

Plan 127 found that `PopoverTrigger`, `DropdownMenuTrigger` and
`ContextMenuTrigger` spread their props onto a host element and then passed
their own `ref`, so a caller's `ref` was silently discarded (the last `ref`
wins). `DatePicker` depended on that ref and its post-selection focus-return had
never worked. Those three parts now use `internal/ref.ts`'s `useMergedRef`.

The same overwrite remains in **five** more parts that own an instance ref for
focus/trap bookkeeping:

| Part | File | Internal ref used for |
| ---- | ---- | --------------------- |
| `DialogContent` | `src/dialog.tsx` | focus-in, Tab trap, focus-return |
| `ListItem` | `src/list.tsx` | roving tab stop, real focus |
| `TabsTrigger` | `src/tabs.tsx` | roving tab stop, real focus |
| `AccordionTrigger` | `src/accordion.tsx` | header focus movement |
| `MenuItem` | `src/menu/item.tsx` | highlight-follows-focus |

Their prop types extend `Props`, which includes `ref`, so the public API already
promises a ref and currently breaks that promise. This plan closes the class
rather than waiting for the next consumer to discover it.

---

## 1. Files

```
packages/components/src/dialog.tsx                 # ref merged into contentRef
packages/components/src/list.tsx                   # ref merged into attach
packages/components/src/tabs.tsx                   # ref merged into attach
packages/components/src/accordion.tsx              # ref merged into attach
packages/components/src/menu/item.tsx              # ref merged into attach
packages/components/src/behaviour/dialog.test.tsx     # +1 ref test
packages/components/src/behaviour/list.test.tsx       # +1 ref test
packages/components/src/behaviour/tabs.test.tsx       # +1 ref test
packages/components/src/behaviour/accordion.test.tsx  # +1 ref test
packages/components/src/behaviour/dropdown-menu.test.tsx # +1 row-ref test
packages/components/README.md                     # the adding-a-component rule
TODO.md                                           # tick the task
.agents/slop/plans/README.md                      # index this plan
```

No docs page changes: this is an API-contract fix, not a new prop. The package
README gains the rule so the next part does not reintroduce it.

## 2. The change (identical at all five sites)

`internal/ref.ts` already exports:

```ts
export const useMergedRef = <T>(
  internal: Ref<T>,
  caller: Ref<T> | undefined,
): RefCallback<T>;
```

At each part:

1. Destructure `ref` from the props (it is in `Props`).
2. Replace the host element's `ref={attach}` (or `ref={contentRef}`) with
   `ref={useMergedRef(attach, ref)}` — or `ref={setContent}` when the internal
   value is a state setter behind a local callback.
3. Keep everything else identical: the internal ref must still receive the
   instance, because focus, registration and the tab stop depend on it.

Naming: use `setElement` / `setContent` / `setRow` for the merged callback so the
host line reads as one assignment.

### `DialogContent`

`contentRef` is a stable `useCallback` that stores the instance in state (its id
is what `focusNextWithin` needs). Keep it, and merge:

```ts
const setContent = useMergedRef<PublicInstance | null>(contentRef, ref);
```

Destructure `ref` next to `style`/`testId`, then `<div … ref={setContent}>`.

### `ListItem`, `TabsTrigger`, `AccordionTrigger`, `MenuItem`

Each already has a stable `attach` callback. Merge it:

```ts
const setElement = useMergedRef<PublicInstance | null>(attach, ref);
```

and use `ref={setElement}`. `attach` must stay stable: the merged callback is
stable because both inputs are.

## 3. Tests (one per part, +5 native)

Each test proves **both** refs work, so it fails if the caller's ref is dropped
and also if the internal registration is broken:

1. `dialog.test.tsx` — render a dialog with `ref={createRef<PublicInstance>()}` on
   `DialogContent`; after opening, `ref.current?.id` equals
   `renderer.findByTestId("dialog-content")?.id`; Escape still closes and returns
   focus to the opener (the existing internal path).
2. `list.test.tsx` — a ref on the first `ListItem` receives its id; arrow
   navigation still moves focus between rows.
3. `tabs.test.tsx` — a ref on the selected `TabsTrigger` receives its id; a
   left/right arrow still selects the next tab.
4. `accordion.test.tsx` — a ref on the first `AccordionTrigger` receives its id;
   `ArrowDown` still moves focus to the second header.
5. `dropdown-menu.test.tsx` — a ref on `DropdownMenuItem` receives its id; opening
   the menu and pressing `ArrowDown` still moves focus onto rows.

Use `createRef` (not `useRef`) in test bodies. Assert ids, not layout.

The header comment of each touched suite gains one clause: "a caller ref on the
part was discarded in favour of the internal one."

Both directions: after writing the tests, revert one site (e.g. `DialogContent`)
to `ref={contentRef}` and record the red output; restore. Repeat for one
list-family part. The five call sites share one helper, so two proofs plus the
five green tests are the evidence.

## 4. STOP conditions

1. Merging the ref breaks registration/focus at any part (a whole existing suite
   goes red) → STOP and report which invariant broke; do not weaken the test.
2. A merged callback is recreated each render (refs detach/attach in a loop) →
   STOP; `useMergedRef` must stay a `useCallback`.
3. A type error needs `any`, a cast or a non-null assertion → STOP with the
   compiler output.
4. A `Ref` cleanup function is returned from a callback ref and the host does not
   support it → STOP; React 19 callback refs return void here.
5. Any suite flakes across two runs → STOP and report; nothing here is timed.

## 5. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 186, unchanged
nub run --filter @gpuixui/components test:behaviour   # 220 → 225
nub run check                                         # exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

## 6. Acceptance criteria

- [ ] All five parts give the caller's ref the same host instance the part uses.
- [ ] Every internal behaviour still passes unchanged (focus, tab stop, trap).
- [ ] Five native tests fail when a site is reverted and pass when restored.
- [ ] The package README states the rule (`useMergedRef` for a part that owns a ref).
- [ ] Plan index and `TODO.md` are current; all commands in §5 pass.

## 7. Deviations, recorded during implementation

1. **The dropdown row test needs two `ArrowDown` presses, not one.** A pointer
   open deliberately leaves focus on the menu surface with no row highlighted
   (plan 126's contract), so the first `ArrowDown` lands on the first row and the
   second reaches `delete`. The test asserts that sequence; changing the
   component to highlight a row on pointer open would undo plan 126 §2.
2. **Both-direction proof.** Reverting `DialogContent` to `ref={contentRef}` and
   `ListItem` to `ref={attach}` made both new tests fail with
   `expected undefined to be 4` / `expected undefined to be 6` (the caller's ref
   never received an instance). Restored: the five suites passed 73/73 and the
   full behaviour run 225/225.
3. **Actual counts.** Logic unchanged at 186. Behaviour 220 → 225: one test each
   in Dialog, List, Tabs, Accordion and DropdownMenu.
4. **No docs-page changes.** The ref contract is a package rule, recorded in
   `packages/components/README.md` → Adding a component, not in five component
   pages.

