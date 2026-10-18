# 340 — Combobox async option loading

**Phase.** C/F — Tier 2 composition, closing a documented limitation.
**Workstream.** components (`packages/components`).
**Depends on.** 110, 116, 138, 302, 323, 328, 338, 339.
**Status.** done — 2 logic + 4 native tests; unit 356, behaviour 522.

## 1. Why

`Combobox` wraps GPUix's headless combobox with a local ranking
(`combobox/logic.ts`). The wrapper owns the whole option list, so a caller with
options from a server has no seam:

- it cannot learn what the user typed, and
- the wrapper filters the caller's list a second time, discarding rows the
  caller's own search returned.

`COMPONENTS.md` and `docs/combobox.mdx` both state the limitation: *"no async
option loading"*. The task fixes exactly that, without adding a network layer to
a UI package: the component exposes the query, lets the caller own filtering,
and can say it is loading.

This is additive. Every existing call site keeps today's behaviour because
`shouldFilter` defaults to `true` and `onQueryChange` is optional.

## 2. Public API

Three optional props on `Combobox` (all in `src/combobox.tsx`):

| Prop | Type | Default | Meaning |
| ---- | ---- | ------- | ------- |
| `onQueryChange` | `(query: string) => void` | — | Fires with `""` when the popup opens and with each user edit while it is open. **Never** fires for the label the runtime writes back on selection. |
| `shouldFilter` | `boolean` | `true` | `false` shows `options` exactly as given (order, membership). The caller's search result is not re-filtered or re-ranked. |
| `loading` | `boolean` | `false` | While no option is shown, the default empty slot reads `Loading…` instead of `No matches`. `ComboboxEmpty` children still win. |

`ComboboxInput` gains an optional `onChange?: (event: EventPayload) => void`
forwarded to the host input, so a caller that needs the raw event still gets it.

## 3. Design decisions (do not re-litigate while executing)

1. **Fire `onQueryChange` from `ComboboxInput`'s `onChange`, not the root's
   `onInputValueChange`.** GPUix's `selectItem` calls `setInputValueState(label)`
   *before* `setOpen(false)`, so at that moment the wrapper's `open` is still
   `true`; the existing `if (open)` guard does not distinguish a user edit from
   that programmatic label write. The host input's `onChange` is the only signal
   that means "the user typed". Test 4.1 pins this.
2. **`onQueryChange("")` on open.** A remote caller needs one fetch for the
   initial list. `useControllableState` fires `onOpenChange` only on a real
   state change, so this fires once per open, not on every focus.
3. **`visibleOptions` is a pure helper.** `shouldFilter ? filterOptions(...) :
   options`, in `src/combobox/logic.ts`, so the branch is unit-testable and the
   component stays a renderer.
4. **No debounce, no fetch, no `AbortController` in the component.** The caller
   owns the request lifecycle; the docs say so. A UI package cannot choose a
   debounce interval or a transport.
5. **`loading` only affects the empty slot.** There is no separate spinner row:
   GPUix's `ComboboxEmpty` is the only slot that is guaranteed to render when
   the list is empty, and the wrapper must not invent a selectable sentinel.
   A caller that keeps stale rows while loading renders its own indicator.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/combobox/logic.ts` | add `visibleOptions(options, query, filter)` |
| `packages/components/src/combobox/logic.test.ts` | 2 tests for `visibleOptions` |
| `packages/components/src/combobox.tsx` | 3 root props, context fields, input `onChange`, empty text, `comboboxMeta.limitations` |
| `packages/components/src/behaviour/combobox.test.tsx` | 4 native tests (23 → 27) |
| `packages/components/examples/combobox.example.tsx` | a fourth picker: a caller-filtered "directory" (`shouldFilter={false}` + `onQueryChange`) |
| `packages/components/docs/combobox.mdx` | "Remote options" section, prop table, limitations, verification count 27, logic-test coverage sentence |
| `COMPONENTS.md` | Combobox row: 27 native tests, async limitation replaced, note the new props |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | one task under "Tier 2 hardening after the inventory closed (plans 120+)" |

## 5. Exact implementation

### 5.1 `src/combobox/logic.ts`

Append after `filterOptions`:

```ts
/**
 * The rows to feed the runtime. `filter` is `false` when the caller owns the
 * search (remote options), so the caller's result is shown exactly as given.
 */
export const visibleOptions = (
  options: ReadonlyArray<ComboboxOption>,
  query: string,
  filter: boolean,
): ReadonlyArray<ComboboxOption> =>
  filter ? filterOptions(options, query) : options;
```

### 5.2 `src/combobox.tsx`

1. Import `visibleOptions` beside `filterOptions` and import
   `type EventPayload` from `@gpuix/react`.
2. `ComboboxProps` gains:

   ```ts
   /** Called with the search text: `""` on open, then each user edit. */
   readonly onQueryChange?: (query: string) => void;
   /** Default `true`. `false` shows `options` exactly as the caller gave them. */
   readonly shouldFilter?: boolean;
   /** While nothing is shown, the default empty slot says `Loading…`. */
   readonly loading?: boolean;
   ```

3. `ComboboxContextValue` gains `readonly loading: boolean;` and
   `readonly noteQueryChange: (query: string) => void;`.
4. In the root body:

   ```ts
   const visible = visibleOptions(options, query, shouldFilter);
   ```

   and use `visible` where `filterOptions(options, query)` was used.
5. Provider value gains:

   ```ts
   loading,
   noteQueryChange: (next) => onQueryChange?.(next),
   ```

6. `onOpenChange` opening branch: after `setQuery("")`, call
   `onQueryChange?.("")`.
7. `ComboboxInputProps` gains `readonly onChange?: (event: EventPayload) => void;`
   and `ComboboxInput` destructures it. On `HeadlessInput`:

   ```tsx
   onChange={(event) => {
     noteQueryChange(event.value ?? "");
     onChange?.(event);
   }}
   ```

   (`HeadlessInput` calls the caller's `onChange` before its own
   `context.setInputValue(event.value)`, so the root's `setQuery` still runs.)
8. `ComboboxEmpty` reads `loading` and its default text becomes
   `loading ? "Loading…" : "No matches"`. Caller children are unchanged.
9. `comboboxMeta.limitations`: delete `"no async option loading; create-new is
   a synchronous caller callback"` and add `"no built-in debounce: the caller
   debounces and cancels its own request"` and `"no separate loading row: while
   loading, the empty slot says Loading… (stale rows stay visible)"`.

### 5.3 Example (`examples/combobox.example.tsx`)

Add one card section "Remote directory" with a local `directory` array and:

```tsx
<Combobox
  options={matches}
  shouldFilter={false}
  onQueryChange={(query) => setMatches(searchDirectory(query))}
  onValueChange={...}
>
  <ComboboxTrigger label="Remote directory" />
  <ComboboxContent>
    <ComboboxInput label="Search the directory" />
    <ComboboxList label="Directory" />
    <ComboboxEmpty />
  </ComboboxContent>
</Combobox>
```

`searchDirectory` is a plain case-insensitive label filter with the comment
`// In an app this is where the fetch belongs; the component owns no transport.`
The example must not use timers: `src/behaviour/examples.test.tsx` rerenders
every registered example in one root and unmounts at the end.

### 5.4 Docs

Add a `## Remote options` section after `## Ranking` with the prop table from
§2 and a code sketch that uses `shouldFilter={false}` + `onQueryChange`, plus
one honest sentence: the component never fetches, never debounces and never
cancels; `loading` only changes the empty slot.

Update `## Limitations`: remove the async bullet, keep "no grouping headers in
v1", add the debounce and loading-row sentences.

Update the Verification line to **27 tests** and append: *the reported query —
including that a selection's label write is not reported — caller-owned
filtering, and the loading empty state*.

Update the logic-test sentence to include `visibleOptions`.

## 6. Test plan

### 6.1 Unit (`src/combobox/logic.test.ts`)

1. `it("filters when the caller asks for filtering")` — `visibleOptions(catalogue, "ca", true)` equals `filterOptions(catalogue, "ca")` (prefix order `c1, c2, v1`).
2. `it("passes the caller's rows through untouched when filtering is off")` — `visibleOptions(catalogue, "zzz", false)` returns `catalogue` unchanged, including an order that the ranker would change for `"ca"`.

### 6.2 Native (`src/behaviour/combobox.test.tsx`, real renderer)

Use the existing `Picker` helper; extend it with `shouldFilter`, `loading`,
`onQueryChange`, and an `options` override (keep the current defaults so the
other 23 tests do not change).

3. `it("reports each typed query, not the label written on select")` — spy;
   open → call 1 is `""`; type `ca` → calls `["", "c", "ca"]`; press Enter (the
   highlighted row is Calendar) → spy still has three calls (no `"Calendar"`).
4. `it("shows the caller's rows when filtering is off")` — `shouldFilter={false}`,
   open, type `zzz`, settle: `Calendar`/`Camera`/`Vacation`/`Desk booking` are
   all still in `getAllText()` and `combobox-empty` is absent. This fails if the
   wrapper still filters.
5. `it("lets a caller replace the options for a query")` — a stateful
   `RemotePicker` in the test file: `onQueryChange` sets `options` to the
   directory filtered by the query, `shouldFilter={false}`. Open, type `vac`,
   settle: `Vacation` present, `Calendar`/`Camera`/`Desk booking` absent. This
   fails if `onQueryChange` is not wired to the host input.
6. `it("says Loading… instead of No matches while options are loading")` —
   empty options, `loading`, open; `getAllText()` contains `Loading…` and not
   `No matches`. `rerender` the same tree with `loading={false}`; contains
   `No matches` and not `Loading…`. Both directions in one test.

### 6.3 Both-direction proof (required before calling it done)

Run each, then revert the temporary change and re-run the suite:

```sh
cd packages/components
# 1. unit: make visibleOptions always filter
#    `filter ? filterOptions(options, query) : filterOptions(options, query)`
nub run test -- combobox/logic.test.ts
# expected: "passes the caller's rows through untouched" fails (1 failure)

# 2. native: move noteQueryChange into the root's onInputValueChange
nub run test:behaviour -- combobox.test.tsx
# expected: "reports each typed query" fails on the extra "Calendar" call,
#           "lets a caller replace the options" still passes

# 3. native: drop the loading branch in ComboboxEmpty
# expected: "says Loading…" fails
```

Record the observed failure output in the commit message body (one line each).

### 6.4 Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/components
nub run --filter @gpuixui/components test
# expected: 37 files, 354 → 356 tests, all pass

nub run --filter @gpuixui/components test:behaviour
# expected: 47 files, 518 → 522 tests, all pass

nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run check
# expected: exit 0 (check:tests, lint, fmt, check-types)

nub run lint
nub run test
# expected: exit 0
```

The inventory suite enforces the 27-test count in both `COMPONENTS.md` and the
docs verification line; if either is stale the suite fails by name.

## 7. STOP conditions

Stop and report with evidence (do not improvise) if:

- `ComboboxInput`'s `onChange` is not called before the runtime's own
  `setInputValue` (check `node_modules/.store/@gpuix+react@0.10.0_*/.../combobox.js`
  — the order is `onChange?.(event)` then `context.setInputValue(...)`);
- GPUix's `ComboboxContent`/`ComboboxEmpty` does not render when `items` is empty
  with `filter={null}` (it renders because `filteredItems` is `items`);
- the example registry check or `examples.test.tsx` fails after adding the fourth
  picker (do not register a second example file — the registry is 1:1 with docs
  pages and inventory records);
- any existing combobox test changes behaviour with `shouldFilter` defaulting to
  `true` — that means the default was wired wrongly, not that the test is wrong;
- a gate cannot run on this host. Report which gate and why; do not claim a pass.

## 8. Acceptance

- All three props work as specified, proven by tests 3–6 failing without them.
- The example renders the remote path in the real renderer and uses no timers.
- `COMPONENTS.md` and `docs/combobox.mdx` state 27 native tests and no longer
  claim async loading is unsupported.
- `nub run check`, `nub run lint`, `nub run test` are green.
- The commit is pushed to `origin/agent/components`.
