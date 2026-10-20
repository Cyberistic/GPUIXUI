# 731 — `Select` has no type-ahead, so a long list is arrow-only

| Field | Value |
| ----- | ----- |
| Status | done — measured in §8 |
| Phase | C/F (Tier 1 keyboard behaviour, then docs truth) |
| Owner | primitives |
| Depends on | `030`, `041`, `047`, `057`, `069`, `346`, `354`, `390`, `599`, `694` |
| Feeds | the shared prefix rule the components workstream still keeps privately |

`Select` documents one keyboard gap that is ours, not the runtime's: "No search
or type-ahead. A long list wants a combobox, which is Tier 2" (`docs/select.mdx`
§Limitations). GPUix's headless `SelectTrigger` handles only
`up`/`down`/`enter`/`space`/`escape` (and `ctrl+n`/`ctrl+p`), so typing a letter
does nothing. Every desktop select answers a typed prefix by choosing the next
matching option; a 40-row select without it is arrow-only.

This plan adds **type-ahead while the trigger is focused and the list is
closed**, with the matching rule in `core/` so it is provable without a runtime,
and records the components workstream's duplicate prefix rule as a hand-off.

---

## 1. Measured facts this plan relies on

Measured on this worktree, 2026-10-20, `nub v0.9.6`, Node 24.18.0, against the
store's release-tag `@gpuix/native@0.10.0` binding, with a throw-away runtime
probe (`runtime/typeahead-probe.runtime.test.tsx`, deleted afterwards):

1. **A typed key reaches the trigger's caller handler.**
   `runtime.keyDown("s-trigger", "e")` on a mounted `Select` with
   `onKeyDown={(event) => seen.push(event)}` delivered **one** event to the
   caller: `{ key: "e", keyChar: undefined }`. So the wrapper can see printable
   keys on the trigger; the slot contract already forwards `onKeyDown`.
2. **`keyChar` is absent in this renderer but modifiers are real.**
   `runtime.keyDown("s-trigger", "cmd-e")` delivered `key: "e"` with
   `modifiers: { shift: false, ctrl: false, alt: false, cmd: true }`. The
   character therefore comes from `keyChar ?? key`, and the modifier guard is
   available.
3. **GPUix owns the keys it knows.** `packages/primitives/node_modules/@gpuix/react/dist/components/select.js`
   compares `event.key` against `escape`, `down`/`up` (plus `ctrl+n`/`ctrl+p`),
   `enter` and `space`; it calls the caller's `onKeyDown` **first** and handles
   its own key afterwards. A printable key it does not know is left to us.
4. **The library already has this rule one layer up.**
   `packages/components/src/internal/typeahead.ts` implements exactly this
   contract for menus and `List` (500 ms window, repeated letter cycles, disabled
   rows skipped, case-insensitive prefix). `packages/primitives` cannot import
   `@gpuixui/components` (the dependency arrow points the other way), so the
   pure rule is hoisted **down** here and the components copy is recorded as the
   duplicate to retire.

**STOP** if a printable key never reaches the caller handler on the trigger —
then the capability is not reachable and the limitation stays; report the
measured event dump instead of shipping a dead code path.

**STOP** if `matchPrefix` cannot be expressed without importing
`@gpuix/react` at runtime in `core/` (`core/` is runtime-free by contract).

---

## 2. The contract

| Fact | Rule |
| ---- | ---- |
| When | the trigger holds focus **and** the list is closed; a disabled select never types |
| Which key | `keyChar ?? key`, exactly one non-whitespace character; `ctrl`/`cmd`/`alt` chords and held repeats are refused; `shift` is allowed |
| Window | 500 ms after the last keystroke; a later key starts a new prefix |
| Repeat | pressing the same single letter keeps the prefix and advances to the next match (the desktop convention) |
| Matching | case-insensitive prefix over the option's resolved text (`label`, else `value`); disabled and blank options are skipped; the search starts **after** the current selection and wraps |
| Result | the matched option is committed through the one value rule (`value`/`defaultValue`/`onValueChange`); a match equal to the current value reports nothing |
| While open | no type-ahead: GPUix owns the highlight and exposes no way to move it, so typing there must not invent a second cursor |

The wrapper's handler runs **after** the caller's `onKeyDown` and cannot be
cancelled: 0.10.0's `EventPayload` has no `defaultPrevented` (capability table
§3). That sentence goes on the page.

---

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/typeahead.ts` | **new** — the pure rule: `typeaheadChar`, `pressTypeahead`, `matchTypeahead`, buffer/item/match types and the 500 ms window |
| `packages/primitives/src/core/typeahead.test.ts` | **new** — deterministic core suite |
| `packages/primitives/src/core/index.ts` | export the new module |
| `packages/primitives/src/components/typeahead.ts` | **new** — the React adapter (`useTypeahead`): one buffer ref, `Clock` reads at the event boundary |
| `packages/primitives/src/components/Select.tsx` | compose the type-ahead key handler into the trigger (see §4) |
| `packages/primitives/runtime/select-typeahead.runtime.test.tsx` | **new** — the real renderer cases |
| `packages/primitives/docs/select.mdx` | top paragraph, `## Keyboard`, `## Limitations`, `## Verification` |
| `COMPONENTS.md` | the Select row gains a measured type-ahead sentence |
| `TODO.md` | tick this row; add the components hand-off row |
| `.agents/slop/plans/README.md` | index this plan in the primitives block |

No new public component, no new prop, no change to any other component.

---

## 4. Implementation

### 4.1 `core/typeahead.ts` (pure, runtime-free)

Mirror the components rule so the eventual hand-off is a deletion, not a
rewrite. Imports: `effect` (`pipe`), `effect/Array`, `effect/Duration`,
`effect/Option`, `effect/String`. No React, no `@gpuix/react`.

```ts
export interface TypeaheadBuffer { readonly text: string; readonly at: bigint }
export const EMPTY_TYPEAHEAD: TypeaheadBuffer;              // { text: "", at: 0n }
export const TYPEAHEAD_WINDOW: Duration.Duration;           // Duration.millis(500)

export const typeaheadChar: (press: {
  readonly key?: string;
  readonly keyChar?: string;
  readonly modifiers?: { readonly ctrl: boolean; readonly alt: boolean; readonly cmd: boolean };
  readonly isHeld?: boolean;
}) => Option.Option<string>;

export const pressTypeahead: (
  buffer: TypeaheadBuffer, char: string, now: bigint
) => TypeaheadBuffer;

export interface TypeaheadItem { readonly label: string; readonly disabled: boolean }
export interface TypeaheadMatch<Item> { readonly item: Item; readonly index: number }

export const matchTypeahead: <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
) => Option.Option<TypeaheadMatch<Item>>;
```

Rules, each with a test:

- `typeaheadChar`: refuse `isHeld`; refuse `ctrl`/`cmd`/`alt`; prefer a
  non-blank `keyChar`, else `key`; accept only `Str.length(char) === 1` and a
  non-blank trim. (`"enter"`, `"space"`, `"up"`, `"f1"` and a literal space all
  yield `None`.)
- `pressTypeahead`: past `TYPEAHEAD_WINDOW` starts a fresh prefix; a repeat of
  the only letter keeps the prefix (so the next match can advance); anything
  else appends; the buffer is lower-cased.
- `matchTypeahead`: empty prefix → `None`; normalise (lower + trim) both sides;
  keep enabled, non-blank labels that start with the prefix; pick the first
  index **greater than** `from`, else the first match (wrap); return both the
  item and its index.

Every export carries a TSDoc summary (`src/tsdoc.test.ts`).

### 4.2 `components/typeahead.ts` (the adapter)

```ts
export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  onMatch: (match: TypeaheadMatch<Item>) => void,
) => (char: string) => void
```

- The buffer is a `useRef<TypeaheadBuffer>(EMPTY_TYPEAHEAD)`; nothing renders it.
- `now` is one synchronous `Effect.runSync(Clock.monotonicTimeNanos)` per key —
  the same boundary rule as `components/internal/clock.ts`, documented on the
  function, so no `Date.now`.
- On a match: store the buffer, call `onMatch(match)`.
- On a miss: reset the buffer (an unmatched letter must not poison later keys).
- `useCallback` over `[items, from, onMatch]`.

### 4.3 `Select.tsx` wiring

Inside the stateful `Select` (not `renderSelect`, which stays pure):

1. `const flat = selectOptions(props.options)` (a `useMemo`).
2. `const selectedIndex = Option.fromNullishOr(state.value.current)` then
   `Arr.findFirstIndex(flat, (option) => option.value === value)`; `None` when
   there is no selection.
3. Build the type-ahead items **once per flat list**: `{ label: optionText(label, value), disabled, value }`.
4. `const typeahead = useTypeahead(items, selectedIndex, (match) => state.set(match.item.value))`.
5. Compose the key handler:
   ```ts
   const typeKey = (event: EventPayload): void => {
     props.onKeyDown?.(event);
     if (open || props.disabled === true) return;
     Option.match(typeaheadChar(event), {
       onNone: () => {},
       onSome: typeahead,
     });
   };
   ```
6. Pass it to the renderer as `renderSelect({ ...props, onKeyDown: typeKey }, ...)`.
   `renderSelect` already forwards `onKeyDown` to `SelectTrigger` verbatim, so
   the element shape is unchanged and GPUix still runs its own key rule after
   ours.

Do **not** intercept keys on `SelectContent`: while the list is open the
runtime owns the highlight and the wrapper has no hit-testable cursor to move.

---

## 5. Test plan

### 5.1 Core (`src/core/typeahead.test.ts`)

Header comment states the contract being guarded. Cases (each able to fail):

1. `typeaheadChar` — `{key:"e"}` → `Some "e"` (the renderer's measured shape).
2. `typeaheadChar` — `{key:"e", keyChar:"ß"}` → `Some "ß"` (keyChar wins).
3. `typeaheadChar` — `enter`, `space`, `up`, `"f1"`, `" "` → `None`.
4. `typeaheadChar` — `cmd`, `ctrl` and `alt` chords → `None`; `shift` → the char.
5. `typeaheadChar` — `isHeld: true` → `None`.
6. `pressTypeahead` — fresh → the letter; within the window → appends;
   after 501 ms → resets; a repeated single letter keeps the prefix;
   `"E"` stores `"e"`.
7. `matchTypeahead` — empty → `None`; first match from no selection; advances
   after `from`; wraps; skips `disabled`; skips a blank label; no match → `None`;
   the returned index is the item's index.

### 5.2 Native (`runtime/select-typeahead.runtime.test.tsx`)

One window, a `Select` with `Europe` (`eu`), `Estonia` (`ee`),
`United States` (`us`), `Uganda` (`ug`), `Greece` (`gr`) and a disabled `Beta`
(`b`), plus a caller `onKeyDown` spy.

1. Typing `e` on the focused trigger commits `eu` and reports once.
2. A second `e` (inside the window, repeated letter) commits `ee` — the cycle
   rule, not the first match again.
3. `u` then `g` commits `ug` (two-letter prefix).
4. `b` reports nothing (the only `b` option is disabled).
5. `z` reports nothing.
6. `cmd-e` reports nothing (modifier guard) and the caller still saw the event.
7. `keyDown("s-trigger", "e", true)` (held) reports nothing.
8. The caller's `onKeyDown` ran for every key above (one assertion over the spy).

Both directions, measured: delete the `onKeyDown` override in `Select` → cases
1–3 and 8 fail (0 reports); make `matchTypeahead` return the current item first
→ case 2 fails; remove the modifier/held guard → cases 6–7 fail.

### 5.3 Commands (scoped)

```sh
nub run --filter @gpuixui/primitives test src/core/typeahead.test.ts
nub run --filter @gpuixui/primitives test:runtime runtime/select-typeahead.runtime.test.tsx
nub run --filter @gpuixui/primitives check-types
```

Expected: **1 file / N tests passed** each; `check-types` exits `0`.
Then the end-of-task gates (cross-cutting docs + source change):

```sh
nub run check && nub run lint && nub run test
```

---

## 6. Docs truth

`docs/select.mdx`:

- Top paragraph: add "the trigger's type-ahead" to what the wrapper owns.
- `## Keyboard`: replace "This wrapper does not intercept any key." with the
  closed-list type-ahead contract (§2) and the measured facts: prefix window,
  repeat-to-cycle, disabled skipped, modifiers/held refused, no cancel because
  the runtime has no `defaultPrevented`, and **nothing while open** because the
  runtime owns the highlight.
- `## Limitations`: replace "No search or type-ahead" with the honest partial:
  prefix matching only, closed list only, no search field, no fuzzy match.
- `## Verification`: add both new files and the scoped commands.

`COMPONENTS.md` Select row: one **Type-ahead (731)** sentence with the measured
values.

`TODO.md`:

- tick this plan's row with the measured counts;
- new cross-workstream row (owner `components`): delete
  `packages/components/src/internal/typeahead.ts` and import
  `pressTypeahead`/`matchTypeahead` from `@gpuixui/primitives/core` (their hook
  and clock stay), so one prefix rule serves menus, `List` and `Select`.

---

## 7. Acceptance

- [ ] A typed printable key on a focused, closed `Select` commits the next
      enabled option whose text starts with the typed prefix, and reports
      through `onValueChange` exactly once.
- [ ] A repeated letter advances; a two-letter prefix matches; a disabled row is
      skipped; a modifier chord and a held key do nothing.
- [ ] Nothing changes while the list is open, and no existing Select case fails.
- [ ] The core rule has no React or `@gpuix/react` import and its suite runs
      without a binding.
- [ ] Page, inventory row and TODO agree with the measurement; the hand-off row
      is recorded for the components workstream.
- [ ] Scoped suites were **run** and their exact ids/counts recorded in the plan
      and commit message.

## 8. Result

Implemented 2026-10-20.

**Files.** `src/core/typeahead.ts` (pure rule), `src/components/typeahead.ts`
(the `useTypeahead` adapter), `Select.tsx` (the composed trigger handler),
`src/core/typeahead.test.ts`, `runtime/select-typeahead.runtime.test.tsx`, plus
the page, inventory, README counts, TODO and this index.

**Scoped results (run, not inferred).**

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test src/core/typeahead.test.ts` | 1 file / **17 passed** |
| `nub run --filter @gpuixui/primitives test:runtime runtime/select-typeahead.runtime.test.tsx` | 1 file / **8 passed** |
| the same file + `select-pointer`, `select-value`, `fields`, `overlay-trigger`, `activation` | 5 files / **187 passed** |
| `nub run --filter @gpuixui/primitives test` | 69 files / **940 passed** |
| `nub run check-types` (whole repo) | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` (whole repo) | primitives 69/940, components 32/308, playground 2/20, all green |

`nub run check` stops at `fmt` on `apps/docs/src/components/docs/demos.tsx`, a
pre-existing unformatted file outside this workstream's paths (already recorded
in `TODO.md`, owner `docs-site`). Every file this plan touched is format-clean
(`oxfmt --check` on them is green).

**Both directions (measured).**

1. Passing `props` to `renderSelect` instead of the composed handler → 4 runtime
   cases fail by name (`expected [] to deeply equal ['eu']` and friends).
2. `candidate.index > after` changed to `>=` → the advance case fails
   (`expected ['eu'] to deeply equal ['eu', 'ee']`).
3. The modifier/held guard replaced by `if (false)` → the chord and held cases
   fail (`expected ['eu'] to deeply equal []`).

**Enforcer notes (intentional, precedented).** `useTypeahead` uses React
`useRef`/`useCallback` for a local per-component buffer — the same shape as the
components package's adapter, and not shared application state; and
`Effect.runSync(Clock.monotonicTimeNanos)` is the documented synchronous clock
boundary for a React event handler (`packages/components/src/internal/clock.ts`).

