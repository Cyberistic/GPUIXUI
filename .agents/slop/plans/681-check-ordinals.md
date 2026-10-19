# Plan 681 — The two check ordinals that disagree with `themeChecks`

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/ring.ts`, `packages/tokens/src/native-text-check.ts`,
> `packages/tokens/src/check-ordinals.test.ts` (new), `docs/tokens.md`,
> `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`. No colour, pair,
> floor, metric, shipped theme or runtime behaviour moves.
>
> ## Execution record (2026-10-19)
>
> - Before the fix, the new guard failed as intended: both sentences put
>   “This is the … check” before the function name, so the canonical claim was
>   not found, and the reference had no owner sentence (**2 of 5** cases failed).
> - The first run after the edits still failed one case: the wrapped JSDoc line
>   left a `*` between “is” and “the seventh check”, so the normaliser now strips
>   JSDoc line prefixes before matching. The guard was fixed rather than the
>   sentence wrapped differently.
> - A deliberate wrong-ordinal probe (`ring` back to “tenth”) failed with
>   `AssertionError: ring.ts: themeRingFailures: expected 'tenth' to be 'fifth'`;
>   restoring “fifth” returned the suite to green. That is the both-directions
>   proof for the assertion itself, not only for the wording.
> - After the fix: `check-ordinals.test.ts` **5/5**, the package suite
>   **191 files / 6721 tests**, and `nub run check`, `nub run lint` and
>   `nub run test` are green.

## Why

`themeChecks` is the package's ordered index of the ten checks `themeFailures`
composes, and both the catalogue and the README tell a consumer to iterate it:

```ts
export const themeChecks = [
  "color",      // 1
  "opacity",    // 2
  "typeface",   // 3
  "contrast",   // 4
  "ring",       // 5
  "highlight",  // 6
  "nativeText", // 7
  "hierarchy",  // 8
  "direction",  // 9
  "metric",     // 10
] as const;
```

Two public functions' JSDoc state a different position:

| Function | JSDoc says | `themeChecks` position |
| -------- | ---------- | ---------------------- |
| `themeRingFailures` (`ring.ts`) | “This is the **tenth** check composed by `themeFailures`.” | **fifth** |
| `themeNativeTextFailures` (`native-text-check.ts`) | “This is the **ninth** check: it holds …” | **seventh** |

Both numbers are the order in which the checks were *added* to the package:
`ring` was the last check shipped (plan 611) and `nativeText` the ninth. That is
history, not the contract. The reference's *One check* section lists the
diagnostic order — `contrast`, `ring`, `highlight`, `nativeText`, `hierarchy`,
`direction`, `metric` — and the README's `it("states each check's ordinal from
the index")` case already holds every README ordinal to `themeChecks`. Nothing
holds the source JSDoc, which is the text an IDE shows on hover for the two
functions.

A reader who opens `themeRingFailures` is told it runs after `themeNativeText`;
the package's own index, reference and README say it runs before. One of the two
statements was always false, and no test could see it.

The same guard closes the wider hole: a future check could add an ordinal claim
in its JSDoc and drift the same way, because no test reads the source prose.

## Scope

Documentation truth only. No token value, pair, floor, metric, count, check kind,
platform style, recipe or shipped theme changes.

## Exact files and steps

### 1. `packages/tokens/src/check-ordinals.test.ts` (new)

Guard every ordinal claim in the package's own JSDoc against `themeChecks`.

- Read every `src/*.ts` file except `*.test.ts` and `*.example.ts` with
  `node:fs` (the same pattern as `docs.test.ts` and `readme.test.ts`; the package
  has no runtime dependencies, so `node:fs` in a documentation test is
  deliberate).
- Match the canonical claim shape:
  `/`(theme[A-Za-z]+Failures)` is the ([a-z]+) check/g`.
- Map each function to its `ThemeFailureKind` with a record declared
  `as const satisfies Record<ThemeFailureKind, string>` (the same exhaustive
  map `readme.test.ts` keeps, so adding an eleventh kind fails `check-types`
  until the map is extended).
- Assert:
  1. the two historical offenders are present as guarded claims —
     `themeRingFailures` and `themeNativeTextFailures`;
  2. each word equals `ordinals[themeChecks.indexOf(kind)]`, where `ordinals`
     is `["first", …, "tenth"]`;
  3. each named function is declared in the same file (`export function …`);
  4. `themeChecks.length <= ordinals.length`, so an eleventh check cannot index
     past the word list;
  5. the reference sentence added in step 3 exists in `docs/tokens.md`.

Header comment states the bug being guarded: *the JSDoc counted checks in
addition order while `themeChecks` counts them in the composition order the
package documents.*

### 2. Fix the two claims

- `packages/tokens/src/ring.ts`: replace
  `collapsed ring. This is the tenth check composed by `` `themeFailures` ``.`
  with
  ``collapsed ring. `themeRingFailures` is the fifth check composed by `themeFailures`. ``
- `packages/tokens/src/native-text-check.ts`: replace
  `cannot see them. This is the ninth check: it holds` with
  ``cannot see them. `themeNativeTextFailures` is the seventh check: it holds``

Both sentences now name the function first, which is what the guard matches and
what a reader sees on hover.

### 3. `docs/tokens.md` — name the owner

In *One check*, after the sentence ending “adding a check is one edit at the
index.”, add:

> Each check's own JSDoc names its position in that list, held by
> `check-ordinals.test.ts`.

This is the one sentence the new test's fifth assertion holds.

### 4. `COMPONENTS.md` — the Total theme check row

Append one clause to the existing note:

> Each check's JSDoc names its position in `themeChecks`, held by
> `check-ordinals.test.ts` rather than retyped.

No other row changes: the ring and native-document rows already describe their
pairs, and this unit moves no values.

### 5. Truth files

- `TODO.md`, Design tokens and theming: add a ticked row recording the fix (the
  two JSDoc ordinals, the guard, the numbers), and advance the progress count
  from **302/378** to **303/379** without changing the bar length.
- `.agents/slop/plans/README.md`: add the plan row
  `| [681](./681-check-ordinals.md) | The check ordinals the JSDoc retyped | F | 056, 602, 617 | done |`.
- This plan file: replace the status header with `done 2026-10-19` and add an
  execution record with the real test counts and both-directions evidence.

## Commands and expected results

Run from `workspaces/tokens-theme`:

```sh
# 1. before the source fix: the new guard must fail
nub run --filter @gpuixui/tokens test -- check-ordinals
# expected: FAIL — no `themeRingFailures is the … check` claim (the pre-fix
# text puts "This is the" first), so the historical-claim assertion fails.

# 2. after the source and docs edits
nub run --filter @gpuixui/tokens test -- check-ordinals
# expected: PASS, 5 cases.

# 3. prove the ordinal assertion can fail, not just the shape assertion
#    temporarily write "tenth" in ring.ts; rerun step 2
# expected: FAIL naming themeRingFailures, expected "fifth", received "tenth".
#    restore "fifth" and rerun.

# 4. the package suite
nub run --filter @gpuixui/tokens test
# expected: PASS, 191 files / 6721 tests (190 + 1 file, 6716 + 5 cases).

# 5. the repo gates
nub run check
nub run lint
nub run test
# expected: all green.
```

Exact counts are asserted from the run output in the execution record; the
numbers above are the projection, not a claim until the run happens.

## STOP conditions

Stop and report instead of improvising if:

- `themeChecks` no longer has ten members, or a check function named in a
  JSDoc claim is not exported by the module that claims it;
- the pre-fix guard **passes** (the regex or the file list is wrong; do not
  weaken the guard);
- any token value, pair, floor, metric, count, check kind or shipped theme would
  need to change to make the guard pass;
- a third ordinal claim is found in source or docs that the guard cannot map to
  a check function — record it in this plan and the guard rather than editing
  the claim to fit.

## Test plan

| Case | What it catches | Can it fail? |
| ---- | --------------- | ------------ |
| `finds the ordinal claims it guards` | a deleted or renamed claim, or a regex that silently matches nothing | Yes — pre-fix text fails it |
| `states each check's position in the index` | the original defect: `tenth` for `ring`, `ninth` for `nativeText` | Yes — reverting `fifth` → `tenth` fails it |
| `names a declared check function` | a claim naming a function the module does not export | Yes — rename the function in the sentence only |
| `has an ordinal for every check` | an eleventh kind indexing past `ordinals` | Yes — append a kind to `themeChecks` in a scratch probe |
| `documents the owner in the reference` | the catalogue sentence drifting away | Yes — delete the sentence |

Both directions are run explicitly (step 1 and step 3 above) and recorded.

## Acceptance criteria

- The two JSDoc claims name the position `themeChecks` gives their check
  (`ring` fifth, `nativeText` seventh), not the addition order.
- `check-ordinals.test.ts` fails on the pre-fix wording and on a wrong ordinal,
  and passes after the fix.
- `docs/tokens.md` names the guard, and the guard holds that sentence.
- No token value, pair, floor, metric, count, check kind, platform style, recipe
  or shipped theme moves; the full package and repo gates are green.
