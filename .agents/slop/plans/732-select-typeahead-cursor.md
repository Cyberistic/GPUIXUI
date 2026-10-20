# 732 — The type-ahead cursor is the last match, not the accepted value

Status: planned 2026-10-20. Depends on `731`.

## 0. The defect

Plan `731` gave the closed `Select` type-ahead. Its `useTypeahead` adapter
(`packages/primitives/src/components/typeahead.ts`) takes `from` from the
**rendered value** on every keystroke:

```ts
const selectedIndex = Option.flatMap(
  Option.fromNullishOr(state.value.current),
  (value) => Arr.findFirstIndex(flat, (option) => option.value === value),
);
const typeahead = useTypeahead(typeItems, selectedIndex, ...);
```

A controlled parent that defers or rejects a reported value keeps
`selectedIndex` where it was, so every repeated letter searches from the same
origin and commits the same option forever. This is the `RadioGroup` /
`ToggleGroup` / `Rating` class plan `359` fixed (D39): **movement starts from the
cursor, not from the value**. Type-ahead has no cursor, so it has the bug.

Measured on this host (scoped runtime probe, 2026-10-20) with options
`Europe`, `Estonia`, `United States`, `Uganda` and a parent that pins
`value="eu"`:

| Press `e` | Expected | Received |
| --------- | -------- | -------- |
| 1 | `ee` | `ee` |
| 2 | `eu` | `ee` |
| 3 | `ee` | `ee` |
| 4 | `eu` | `ee` |

The same scene with a parent that applies the reported value is correct
(`eu, ee, eu, ee`), which is why the shipped suite (uncontrolled) never saw it.

`docs/select.mdx` promises "pressing the same letter again advances to the next
match", without qualification, and `COMPONENTS.md` repeats it.

## 1. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/typeahead.ts` | the hook owns a cursor ref; see §2 |
| `packages/primitives/runtime/select-typeahead.runtime.test.tsx` | two new cases: a deferring parent advances; a value change resets the cursor |
| `packages/primitives/docs/select.mdx` | the type-ahead rule names the cursor (plan `732`) |
| `COMPONENTS.md` | one **Type-ahead cursor (732)** sentence on the Selects row |
| `.agents/slop/plans/README.md` | index this plan in the primitives table |
| `TODO.md` | tick this row with the measured counts |

Nothing else. Do **not** touch `core/typeahead.ts` (its `from` contract is
correct and already tested), the `components` package's private copy (a recorded
hand-off), or any path outside `packages/primitives`.

## 2. The rule

The hook keeps three refs beside the existing buffer:

```ts
const cursor = useRef<Option.Option<number>>(Option.none()); // last match
const origin = useRef<Option.Option<number>>(Option.none()); // value origin at that keystroke
```

On each keystroke:

1. If `origin` is not the current `from`, the value moved elsewhere (the parent
   applied a selection, a click, an arrow, a reset): set `cursor = from`.
2. Record `origin = from`.
3. Match from `cursor`, falling back to `from` when there is no cursor yet.
4. On a match: `cursor = some(match.index)`, keep the buffer, report the match.
5. On a miss: clear the buffer and set `cursor = from` (the next letter starts
   from the committed value, the behaviour plan `731` already has).

Consequences to state in the code comment and the page:

- an applying parent is unchanged: `eu, ee, eu, ee`;
- a deferring parent cycles: `ee, eu, ee, eu` (the `359` rule);
- a value change to another option mid-prefix moves the cursor with it.

The comparison is `Option.getOrUndefined(a) === Option.getOrUndefined(b)` over
numbers; `Option.contains` is not used because `None` and `Some` equality is the
fact being compared.

## 3. Commands and expected results

```sh
# 1. the new runtime case fails before the fix
nub run --filter @gpuixui/primitives test:runtime runtime/select-typeahead.runtime.test.tsx
#    expected before: 1 failed / 9 passed, the failure reading
#    ['ee','ee','ee','ee'] vs ['ee','eu','ee','eu']

# 2. after the fix: 10/10
nub run --filter @gpuixui/primitives test:runtime runtime/select-typeahead.runtime.test.tsx

# 3. the neighbours still pass (Select is shared)
nub run --filter @gpuixui/primitives test:runtime runtime/select-pointer.runtime.test.tsx runtime/select-value.runtime.test.tsx runtime/fields.runtime.test.tsx runtime/overlay-trigger.runtime.test.tsx

# 4. the offline suite (typeahead core is untouched, 17 cases stay green)
nub run --filter @gpuixui/primitives test
#    expected: 69 files / 940 passed

# 5. types
nub run --filter @gpuixui/primitives check-types
```

Scoped forms only. Do not run `--all`, the full live suite, or the root
`nub run check` (its `fmt` leg is red on `apps/docs/src/components/docs/demos.tsx`,
a recorded docs-site task outside this workstream).

## 4. STOP conditions

Stop and report — do not improvise — if:

- the pre-fix case does **not** fail with the `['ee','ee','ee','ee']` shape
  (the measurement in §0 is then wrong and this plan needs re-scoping);
- fixing the cursor makes the existing eight cases fail (the hook contract
  changed beyond a cursor, e.g. the buffer or the wrap rule);
- the fix needs a change outside the files in §1;
- the runtime file cannot run (no binding): record the exact error and leave the
  plan `planned`.

## 5. Test plan (both directions)

1. **Deferring parent** — options `Europe(0)`, `Estonia(1)`, `United States(2)`,
   `Uganda(3)`; the parent pins `value="eu"` and records `onValueChange`. Four
   `e` presses must report `["ee","eu","ee","eu"]`. Without the cursor the
   second press repeats `"ee"` (the §0 measurement), so the case fails by name.
2. **Value change resets the cursor** — options `Europe(0)`, `Estonia(1)`,
   `Ecuador(2)`; start `value="eu"`, press `e` once (reports `"ee"`, cursor 1),
   re-render with `value="ec"` (index 2), press `e` again: the cursor must follow
   the value to index 2 and wrap to `"eu"`. A kept cursor would search after 1
   and report `"ec"`.
3. The existing eight cases and the four neighbouring files must stay green.

Both new cases go in `select-typeahead.runtime.test.tsx` (the file header already
explains the class). No new file.

## 6. Docs, inventory, TODO

- `docs/select.mdx` §Type-ahead: add "the search starts after the **last match**,
  not the accepted value, so a controlled parent that defers or rejects a report
  cannot trap a repeated letter on one option (plan `732`)" to the first bullet,
  and add the cursor to the `## Verification` list.
- `COMPONENTS.md` Selects row: one **Type-ahead cursor (732)** sentence with the
  measured `['ee','eu','ee','eu']` and the old direction.
- `.agents/slop/plans/README.md`: index row in the `020–049` primitives table
  (the 700-series rows live there).
- `TODO.md`: add the unchecked row first, then tick it with the measured counts
  after the run; keep the progress bar truthful.

## 7. Acceptance

- [ ] The deferring-parent case fails before and passes after the fix.
- [ ] The value-change case fails with the cursor kept and passes with the reset.
- [ ] All existing Select and type-ahead cases pass; the offline suite is green.
- [ ] The page, `COMPONENTS.md` and `TODO.md` state the measured rule.
- [ ] Commands in §3 were **run**, with their exact counts recorded in §8.

## 8. Result

Implemented 2026-10-20.

**Files.** `src/components/typeahead.ts` (cursor + origin refs and the reset
rule), `runtime/select-typeahead.runtime.test.tsx` (a `deferring` scene and two
cases; the file header names the class), `docs/select.mdx` (the rule and the
verification list), `COMPONENTS.md` (the Selects row), the plans index and
`TODO.md`.

**Scoped results (run, not inferred).**

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test:runtime runtime/select-typeahead.runtime.test.tsx` | 1 file / **10 passed** |
| the same file + `select-pointer`, `select-value`, `fields`, `overlay-trigger` | 5 files / **116 passed** |
| `nub run --filter @gpuixui/primitives test` | 69 files / **940 passed** (unchanged: the core rule did not move) |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run lint` | exit `0` |

The runtime suite was not run in full: this change touches one hook reached by
`Select` only, and the five files above are the complete Select surface plus the
field/overlay compositions that mount it.

**Both directions (measured).**

1. Old body (`matchTypeahead(items, from, …)`, no cursor): the deferring case
   fails with `expected [ 'eu', 'eu', 'eu', 'eu' ] to deeply equal [ 'eu', 'ee', 'eu', 'ee' ]`.
2. New body with the `moved` reset removed (`cursor` never follows the value):
   the value-change case fails with `expected [ 'ee' ] to deeply equal [ 'ee', 'eu' ]`.
3. Restored: 10/10, and the four neighbouring files stay green.

**One measurement worth keeping.** The first version of the deferring case
pinned `eu`, the same value the repeated letter matches, and saw only two
reports: `useControlState` suppresses a reported value that equals the current
prop, so a match equal to the committed value is correctly silent. The shipped
case pins `us` (not an `e` match), so every match is a real report and the
advance is observable. The rule is the cursor, not the report count.

**Enforcer note (intentional, precedented).** `useTypeahead` uses React refs for
a per-component keystroke buffer and cursor. That is local event state, not
shared application state, and it is the same shape plan `731` shipped; the
`avoid-react-hooks` finding is advisory here.
