# 136 — Forwarding sweep: SearchInput's ref and TabsTrigger's onBlur

- **Phase:** C/F (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 116 (SearchInput), 113 (Tabs), 128 (ref-composition sweep),
  134 (inventory gate)
- **Status:** planned.

Two public props are silently dropped:

1. **`SearchInput`'s caller `ref`.** The field spreads `...rest` (which carries
   `ref` from `InputProps`) and then passes its own `ref` to the same `<input>`;
   the later prop wins, so the caller's ref stays `null`. Plan 128 swept every
   part that owns a ref but missed this one because the internal ref is an inline
   callback, not `useMergedRef`.
2. **`TabsTrigger`'s caller `onBlur`.** It spreads `...rest` and then writes its
   own `onBlur` for the focus ring, so a caller's handler never runs. Every other
   exported part composes focus/blur (`Accordion`, `Breadcrumb`, `Collapsible`,
   `Button`, `Field`, `ContextMenu`); this is the outlier.

Both are one-line composition bugs with user-visible consequences: a consumer
cannot focus or measure a search field through its own ref, and cannot run a
blur side effect (commit on blur, clear a menu) on a tab.

## 1. Files

```
packages/components/src/search-input.tsx              # compose the caller's ref
packages/components/src/tabs.tsx                      # compose the caller's onBlur
packages/components/src/behaviour/search-input.test.tsx   # +1 ref test
packages/components/src/behaviour/tabs.test.tsx           # +1 onBlur test
packages/components/docs/search-input.mdx                 # note ref forwarding + count
packages/components/docs/tabs.mdx                         # note blur forwarding + count
COMPONENTS.md                                             # both inventory rows
TODO.md                                                   # the hardening task
.agents/slop/plans/README.md                              # index this plan
```

## 2. Design decisions (do not re-litigate)

1. **Compose, never replace.** Use `internal/ref.ts`'s `useMergedRef` for the
   input and call the caller's `onBlur` after the internal state update, matching
   every other part.
2. **The internal ref stays a ref object.** SearchInput needs the instance to
   focus the field when clearing. Keep `useRef` and attach through a stable
   callback merged with the caller's ref; do not turn focus-on-clear into a
   state read.
3. **No API change.** `SearchInputProps` already extends `InputProps`; the ref is
   part of that contract. `TabsTrigger` already extends `Props`; `onBlur` is part
   of that contract.

## 3. Implementation

### 3a. `src/search-input.tsx`

Destructure `ref` from the props (it currently falls into `...rest`). Import
`useCallback` and `useMergedRef`. Replace the inline ref:

```ts
const attach = useCallback((next: PublicInstance | null) => {
  input.current = next;
}, []);
const setInput = useMergedRef<PublicInstance | null>(attach, ref);
```

and pass `ref={setInput}`. `input` stays the `useRef` that `clear()` reads.

### 3b. `src/tabs.tsx`

Destructure `onBlur` in `TabsTrigger` and compose it:

```ts
onBlur={(event) => {
  setFocused(false);
  onBlur?.(event);
}}
```

## 4. Tests

### 4a. New cases

`src/behaviour/search-input.test.tsx` (+1):

1. **The caller's ref receives the input instance, and the internal focus path
   still works.** Render with `createRef<PublicInstance>()`; assert
   `ref.current?.id` equals `findByTestId("search-input")?.id`, then press
   `escape` after typing and assert focus is still on that instance. Fails today
   with `ref.current === null`.

`src/behaviour/tabs.test.tsx` (+1):

2. **A caller `onBlur` runs when focus leaves a trigger.** Render a tab with a
   spy, focus the trigger, focus a second trigger (or blur through the renderer);
   assert the spy ran once and the tab set still works. Fails today with zero
   calls.

### 4b. Both directions

1. Green first.
2. Revert `ref={setInput}` to the inline callback → test 1 fails with
   `ref.current` null.
3. Revert the composed `onBlur` to `onBlur={() => setFocused(false)}` → test 2
   fails with zero calls.
4. Restore and run the whole behaviour suite.

Expected counts: SearchInput 6 → 7; Tabs 8 → 9; behaviour 274 → 276; logic stays
223.

## 5. Docs, inventory, ledgers

- `docs/search-input.mdx`: one line that the field merges the caller's `ref` with
  its own; verification 6 → 7.
- `docs/tabs.mdx`: one line that a trigger's caller `onBlur` still runs;
  verification 8 → 9.
- `COMPONENTS.md`: Tabs 9 native tests; Search inputs 7 native tests.
- `TODO.md`: tick the sweep under Tier 2 hardening.
- `.agents/slop/plans/README.md`: index row with final counts.

## 6. STOP conditions

1. `InputProps` does not accept `ref` in 0.10.0 → STOP with the type; do not
   widen the props.
2. `useMergedRef` cannot accept `InputProps["ref"]` → STOP with the type error;
   do not cast.
3. The ref test cannot distinguish "merged" from "internal only" → use two
   distinct assertions (caller id, then focus after clear), not a tautology.
4. A caller `onBlur` fires twice → STOP and report; the internal handler must run
   once.
5. Any existing SearchInput/Tabs test changes behaviour → STOP.

## 7. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 223 unchanged
nub run --filter @gpuixui/components test:behaviour   # 274 -> 276
nub run check                                         # exit 0
nub run test                                          # exit 0
```

## 8. Deviations, recorded during implementation
