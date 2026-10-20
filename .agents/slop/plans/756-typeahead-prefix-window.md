# 756 — Type-ahead: a new prefix starts from the current item

**Phase** F · **Block** `050–099` free · **Owner** primitives · **Depends on**
`731`, `732`, `741`, `751` · **Status** done

## 0. The defect, in one sentence

The shared type-ahead hook keeps the **last match** as its search cursor, and
never resets it when the 500 ms prefix expires, so a fresh prefix searches from
where the *previous typing session ended* instead of from the control's current
item — measured, the first key after a pause is dead.

## 1. Measured evidence (probe, `runtime/`, 2026-10-20)

A `Select` whose controlled parent **defers** every report (the plan-`732`
scene), options `Europe(0) Estonia(1) Ecuador(2)`, value pinned at `ee`
(Estonia), three `e` presses with a 650 ms pause before the third:

```
AssertionError: expected [ 'ec', 'eu' ] to deeply equal [ 'PROBE' ]
```

Replay of the rule that produced it:

| press | buffer | search from | match | reported |
| ----- | ------ | ----------- | ----- | -------- |
| 1 | `"e"` | `from` = Estonia (1) | Ecuador (2) | `"ec"` |
| 2 | `"e"` (repeat, inside window) | cursor = Ecuador (2) | wraparound → Europe (0) | `"eu"` |
| 3 | *expired* → fresh `"e"` | **cursor is still Europe (0)** — the stale match | Estonia (1) = the pinned value | **nothing** (no-op guard) |

The third key did nothing. A fresh prefix must start from the **current item**
(the value for a `Select`, the focused item for a roving group), exactly as the
first key of a session does; the "last match" rule from plan `732` is a rule
*within* one prefix.

`RadioGroup`/`ToggleGroup` share the hook but move focus with every match, so
`from` follows the cursor and the stale cursor cannot be observed there. The fix
is still theirs: it is one rule in the one hook.

## 2. Files to change (exact)

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/typeahead.ts` | add exported `startsTypeahead(buffer, now): boolean` (empty buffer **or** window passed); `pressTypeahead` must call it instead of repeating the comparison |
| `packages/primitives/src/components/typeahead.ts` | in the callback: read `now` once, `const fresh = startsTypeahead(buffer.current, now)`, and when `fresh` set `cursor.current = from` before matching; document the rule |
| `packages/primitives/src/core/typeahead.test.ts` | 3 cases for `startsTypeahead` (empty, inside window, past window) |
| `packages/primitives/runtime/select-typeahead.runtime.test.tsx` | 1 case: the sequence in §1, expecting `["ec","eu","ec"]`; add the contract to the header comment |
| `packages/primitives/docs/select.mdx` | one clause in the `### Type-ahead` bullet list |
| `COMPONENTS.md` | one `**Type-ahead window (756):**` clause on the `Selects` row |
| `TODO.md` | one ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | index row for this plan |

Nothing outside these paths. `packages/components`' private type-ahead copy is
already a recorded hand-off (`TODO.md`, plan `731`); do not edit it.

## 3. Implementation steps

1. **Core predicate.** In `core/typeahead.ts`, below `TYPEAHEAD_WINDOW`:

   ```ts
   /** Whether this keystroke begins a new prefix: nothing typed, or the window passed. */
   export const startsTypeahead = (buffer: TypeaheadBuffer, now: bigint): boolean =>
     Str.isEmpty(buffer.text) || now - buffer.at > WINDOW_NANOS;
   ```

   Replace the same expression inside `pressTypeahead` with
   `startsTypeahead(buffer, now)`. The window keeps **one** owner.
2. **Hook.** In `components/typeahead.ts`:

   ```ts
   const now = monotonicNanos();
   const fresh = startsTypeahead(buffer.current, now);
   if (fresh) cursor.current = from;
   const next = pressTypeahead(buffer.current, char, now);
   ```

   Keep the existing `moved` reset. Update the hook's doc comment: a fresh
   prefix searches from the current item; the last-match cursor only carries a
   prefix that is still being typed.
3. **Tests.** Offline cases in `core/typeahead.test.ts`; the runtime case in §1
   (imports `TYPEAHEAD_WINDOW` from `../src/core/typeahead.js`, sleeps
   `Duration.toMillis(TYPEAHEAD_WINDOW) + 150`).
4. **Docs.** `select.mdx`, in the `### Type-ahead` bullets, after the
   "500 ms" bullet: "after the window a letter starts a new prefix from the
   current value, not from where the previous prefix ended".
5. **Ledger.** The `COMPONENTS.md` clause, the `TODO.md` row, the plan index.

## 4. Test plan (both directions)

**New offline cases** (`src/core/typeahead.test.ts`):

- `startsTypeahead(EMPTY_TYPEAHEAD, NOW)` → `true`;
- `startsTypeahead({ text: "u", at: NOW }, NOW + 100n)` → `false`;
- `startsTypeahead({ text: "u", at: NOW }, NOW + window + 1n)` → `true`.

**New runtime case** (`runtime/select-typeahead.runtime.test.tsx`): §1's scene.

- **Old direction:** with the hook line removed, the case fails with
  `["ec","eu"]` (measured above).
- **New direction:** with the fix it reports `["ec","eu","ec"]`.
- **Core direction:** make `pressTypeahead` ignore `startsTypeahead` (always
  append) and the existing "starts over once the window has passed" case fails.

**Regression:** the other two type-ahead suites must stay green
(`radio-typeahead`, `toggle-group-typeahead`) — the hook is shared.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# 71 files, ≥986 tests, 0 failed

nub run --filter @gpuixui/primitives test:runtime runtime/select-typeahead.runtime.test.tsx
# 1 file, 11 tests, 0 failed (the new case is the eleventh)

nub run --filter @gpuixui/primitives test:runtime \
  runtime/radio-typeahead.runtime.test.tsx runtime/toggle-group-typeahead.runtime.test.tsx
# 2 files, 0 failed

nub run --filter @gpuixui/primitives check-types
# exit 0

nub run lint
# exit 0 (this is a read-only repo-wide lint; apps/docs is not touched)
```

`nub run check` stops at `nub run fmt` on
`apps/docs/src/components/docs/demos.tsx` (another workstream's file, recorded
in `TODO.md`); run the four commands above instead and do **not** reformat that
file.

## 6. STOP conditions

- The runtime case does not report `["ec","eu","ec"]` after the fix → stop and
  report the measured sequence; do not re-baseline the assertion.
- The `RadioGroup`/`ToggleGroup` suites change → stop; the fix must be a no-op
  there (their `from` tracks focus).
- The 650 ms wait proves flaky on this host → stop and propose an injected
  clock, do not lengthen the sleep.
- Any file outside §2 needs a change → record it in `TODO.md`, do not edit it.

## 7. Acceptance

- The new runtime case fails with the old hook line and passes with the fix.
- Offline and the three scoped runtime suites are green; `check-types` and
  `lint` exit 0.
- `select.mdx`, the `COMPONENTS.md` row, `TODO.md` and the plan index state the
  measured rule.
- The 500 ms window is defined once (`startsTypeahead`) and used by both the
  buffer rule and the cursor rule.
