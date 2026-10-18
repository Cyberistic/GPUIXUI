# Plan 391 — the contrast reference names its lists

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
071 (the contract), 086 (totality), 307 (inactive surfaces), 344/382 (the
inverse veil), 375 (the scrim), 355/356 (the documentation guards).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeContrastFailures`' JSDoc is the published API reference — a doc generator
renders it and a reader deciding whether to trust the check reads it first. It
duplicates the contract instead of naming it, and it has drifted twice:

```
the inactive label on the nine surfaces a disabled control
paints, …
```

`inactiveSurfaces` has **13** entries since plan 307 added the four soft status
fills, so the sentence is false. And:

```
Content painted on a filled
action uses `selectionOnFill`, a neutral veil measured on `primary`,
`secondary` and `destructive`, …
```

`selectionFillPairs` and `selectionFillWashPairs` derive from
`filledControlFamilies`, which has **four** members since plan 382 — `accent`
was missing from the sentence.

Nothing reads source prose. `snippets.test.ts` checks the fenced `@example`
blocks (plans 355/356); `docs.test.ts` checks the two Markdown pages; the
`contrast.ts` paragraph is outside both. The same failure mode the series closed
for the catalogue, the design system, the README and the JSDoc *examples* is
still open for the JSDoc *prose*, and this is the paragraph a consumer reads
before running the check the whole extension story rests on.

The rest of the block is also hard to keep true by construction: it names every
surface, family and wash in a ~30-line run-on paragraph, so every plan that
widens the contract (079–095, 300–382) had to remember to edit it. The two
drifts above are the proof that this does not scale.

## 2. Decision

One documentation change and one guard, no contract change:

1. **Name the exported lists instead of restating them.** The paragraph becomes
   a short reference: `contrastPairs` for the plain pairs and their classes, the
   five selection lists by name, the two inverse-veil lists, and
   `overlayWashPairs` for the scrim, plus the `filledControlFamilies` index the
   veil derives from and `themeColorFailures` for the format half. A list that
   grows takes this sentence with it only by name, not by count.
2. **State no surface or family count** in that paragraph. A count is the thing
   that drifts; the lists are the source.
3. **Guard the paragraph against the function's own composition.** A new suite
   reads the module with `node:fs`, slices the `themeContrastFailures` JSDoc and
   fails if it stops naming a list the function applies, names a family list
   without `filledControlFamilies`, or restates a count ("nine surfaces",
   "three filled families"). The list of applied names is derived in the test
   from a literal list of the function's imports — the same one-way rule the
   docs guards use.

Rejected alternatives, with reasons:

- **Fix the two sentences only** — they would drift again on the next contract
  plan; the point is to stop restating.
- **Move the prose into `docs/tokens.md` only** — the JSDoc is what a doc
  generator publishes for the function; deleting it leaves the API page with no
  description.
- **Parse the function body and infer which lists it applies** — fragile source
  parsing for no gain; the function's composition is nine names and a test
  literal keeps the guard honest when the paragraph and the call disagree.
- **Guard every source JSDoc in the package** — a large, vague job; this plan
  covers the one function whose prose duplicates the widest contract, and the
  technique can be repeated when another block drifts.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

Replace the `themeContrastFailures` JSDoc (everything from `/**` before
`Every documented pair a theme misses` to the `*/` before the function) with:

```ts
/**
 * Every documented pair a theme misses.
 *
 * The check is the union of the published pair lists, so it is total over the
 * compositions the library documents rather than a curated sample:
 *
 * - `contrastPairs` — body and secondary text on the plain surfaces, the field,
 *   the row washes and the soft status fills; the control boundary, focus ring
 *   and dividers; the inactive label; the marks and the value track; every
 *   interactive fill against the panel it paints on; and the state steps of the
 *   filled families, the generic washes and the selected row.
 * - `selectionPairs`, `selectionStatusPairs`, `selectionWashPairs`,
 *   `selectionSoftPairs` and `selectionSoftWashPairs` — text, status text and
 *   the wash's own perceivability through the composited `selection` colour.
 * - `selectionFillPairs` and `selectionFillWashPairs` — the inverse
 *   `selectionOnFill` veil on every filled family; the list derives from
 *   `filledControlFamilies`, so `accent` is included.
 * - `overlayWashPairs` — the modal scrim composited over every surface a window
 *   shows.
 *
 * A missed pair is returned with both roles, the class whose floor it missed,
 * the floor and the measured ratio; a pair through a wash also names the wash.
 * The level defaults to the one the theme declares, so a high-contrast theme is
 * checked against its own floors. An empty array is the library's guarantee,
 * and a role whose value the token maths cannot parse is reported as `NaN` by
 * this check and by {@link themeColorFailures}.
 *
 * @example
 * ```ts
 * import { getTheme, themeContrastFailures } from "@gpuixui/tokens";
 *
 * themeContrastFailures(getTheme("dark")); // []
 * themeContrastFailures(getTheme("dark"), "high"); // the same theme at AAA
 * ```
 */
```

Keep the function body untouched.

### 3.2 New `packages/tokens/src/contrast-reference.test.ts`

Header comment states the guarded bug: **the published reference for
`themeContrastFailures` repeated the contract's surfaces and families instead of
naming its lists, so it said "nine surfaces" after plan 307 grew the inactive
list to thirteen and named three filled families after plan 382 added a fourth;
no test read the prose.**

The suite reads the source with `node:fs` (the convention `docs.test.ts` and
`snippets.test.ts` already use for tree-local documentation) and slices the
block between `/**` and `*/` immediately before
`export function themeContrastFailures`.

Cases:

1. **Names every list the function applies** — the literal list
   `["contrastPairs", "selectionPairs", "selectionStatusPairs",
   "selectionWashPairs", "selectionSoftPairs", "selectionSoftWashPairs",
   "selectionFillPairs", "selectionFillWashPairs", "overlayWashPairs"]` is a
   subset of the names in the block. This fails on the pre-fix block (it names
   only `selectionStatusPairs` and `markPairs`).
2. **Names the family index, not the families** — the block contains
   `filledControlFamilies` and contains none of the family literals it used to
   list (`"`primary`, `secondary` and `destructive`"`).
3. **States no drifting count** — the block does not match
   `/\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen)\b[^.]*\b(surfaces?|families|pairs)\b/i`
   except inside the two `@example` lines. The `@example` fences are stripped
   before the check so the pair count example cannot trip it.
4. **The paragraph is present and opens as documented** — the slice is non-empty
   and starts with `Every documented pair a theme misses.`; a formatter or a
   merge that drops the description fails here instead of silently publishing
   nothing. (The old paragraph opened with an em dash, so this case also fails
   pre-fix and pins the rewritten opening.)

### 3.3 `.agents/slop/plans/README.md`

- Add the row after 390:

```
| [391](./391-contrast-reference.md) | The contrast reference names its lists | F | 071, 086, 307, 344, 375, 382 | done |
```

- Add a closing paragraph in the established voice: the two false sentences, the
  guard, and that no contract or value changes.

### 3.4 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)" naming the
drift, the reference rewrite and the guard, and bump the section progress count
by one.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/contrast.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/contrast-reference.test.ts)
# EXPECT: all four cases FAIL on the pre-fix paragraph — it opens with an em
# dash rather than the documented sentence, names only one of the nine lists,
# lists no family index and restates counts ("nine surfaces", "three filled
# families"). A case that passes here does not guard the rewrite — STOP and
# rewrite it.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/contrast-reference.test.ts)
# EXPECT: every case passes.
```

Then the package suite and the gate:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Also run the existing documentation suites, because the JSDoc sits beside them
and the source walk must stay green:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/snippets.test.ts src/docs.test.ts src/contrast.test.ts
```

Expected: all pass.

## 5. STOP conditions

Stop and report, do not improvise, if:

- a case passes on the pre-fix `contrast.ts` (the guard does not guard);
- the slice helper picks up a different JSDoc block (verify the function's
  preceding `*/` is the intended one);
- the count regex fires on a legitimate sentence that is not a restated count
  (narrow it rather than deleting the case);
- `snippets.test.ts` rejects the rewritten `@example` (both imports must stay);
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- The published `themeContrastFailures` JSDoc names all nine applied lists and
  `filledControlFamilies`, states no drifting surface or family count, and keeps
  its executable example.
- `contrast-reference.test.ts` fails on the pre-fix paragraph and passes after.
- No colour role, pair, floor, metric, platform style or recipe changes; the
  function body is untouched.
- No path outside `packages/tokens/src/contrast.ts`,
  `packages/tokens/src/contrast-reference.test.ts`, `TODO.md` and
  `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The lists are already public; naming them in the function's reference is
descriptive, not an API change.
