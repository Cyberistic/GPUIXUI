# Plan 518 — The shipped weight set, in one index and two last claims

| Field | Value |
| ----- | ----- |
| Workstream | `tokens-theme` |
| Block | `500–599` (tokens overflow) |
| Phase | F — integration and polish (docs truth) |
| Depends on | `011`, `367`, `370`, `387`, `391`, `396` |
| Files owned | `packages/tokens/src/typography.ts`, `packages/tokens/src/docs.test.ts`, `packages/tokens/src/font-weights.test.ts` (new), `packages/tokens/src/font-weights.example.ts` (new), `packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md` |
| Status | done |

## 1. The defect

The shipped type scale uses **three** weights, not four:

| Role | Weight |
| ---- | ------ |
| `display`, `h1`, `h2`, `h3`, `bodyStrong` | 600 |
| `body`, `caption`, `code`, `codeBlock` | 400 |
| `label` | 500 |

`docs/tokens.md` states the truth (`shipped weights are 400, 500 and 600`, line
561) and `docs.test.ts` derives that sentence from `typography`. Two surfaces
are outside that guard and still claim the pre-370 set:

1. **`packages/tokens/src/typography.ts`, the `FontWeight` JSDoc** — the
   paragraph a doc generator renders for the public type:
   ```
   A CSS numeric font weight, `1…1000`. The shipped scale uses four — `400`
   regular, `500` medium, `600` semibold and `700` bold — but a brand may name
   any weight its installed family provides …
   ```
   No shipped role uses `700`. Plan 396 corrected the same sentence in
   `docs/tokens.md` and the `FontWeight` row of the type index but did not read
   the source JSDoc.

2. **`docs/design-system.md`, §3 “Typography”**, line 140:
   ```
   The four weights are a scale choice, not a type restriction: `FontWeight` is a
   ```
   This is the document the package points a designer at. Nothing reads this
   paragraph; `docs.test.ts` guards the design-system's inventory, figures,
   elevation paragraph, floor table and invalid-colour row, but not this
   sentence.

The weights are also the one shipped scale with no public ordered index. A docs
type table or a font bundle has to re-derive them from `textRoles` (the
`docs.test.ts` suite does exactly that locally). Every other scale has an owner:
`colorRoles`, `textRoles`, `densityNames`, `controlSizes`, `statusTones`,
`motion`, `iconSize`, `avatarSize`. The shipped weight set should have one too.

**Measured, on this branch:** `fontWeights` does not exist;
`themeFailures` returns `[]` for every shipped set; the two surfaces above are
the only occurrences of “four weights” in the tree (grep evidence in §2).

## 2. Evidence commands

Run from the worktree root and keep the output in the commit message body:

```sh
grep -rn "four weights" docs packages/tokens/src packages/tokens/README.md
# expected before: docs/design-system.md:140 only
grep -rn "700" packages/tokens/src/typography.ts
# expected before: line 7, "`700` bold"
nub run --filter @gpuixui/tokens test
# expected before: 110 files / 5361 tests green
```

## 3. Decision

Ship one derived index and fix the two claims. **Do not** turn `FontWeight`
back into a literal union: plan 370 made it a CSS number in `1…1000` so a brand
can name `450` or `800`, and that decision stands.

### 3.1 `fontWeights` in `typography.ts`

Place it **after** the `typography` constant (it reads the roles), not before:

```ts
/**
 * The font weights the shipped type scale uses, ascending. This is the set to
 * load for the shipped scale; it is not a restriction — {@link FontWeight}
 * accepts any CSS weight in `1…1000`, and a brand's own role may name another.
 */
export const fontWeights: ReadonlyArray<FontWeight> = [
  ...new Set(textRoles.map((role) => typography[role].fontWeight)),
].toSorted((left, right) => left - right);
```

Why derived rather than a hard-coded `[400, 500, 600]`: a literal duplicates
the scale and would drift the way the two sentences did. This is the
`shippedThemes` pattern (`shipped-themes.ts`), not a second source of truth.

### 3.2 The two claims

`packages/tokens/src/typography.ts` — rewrite the `FontWeight` JSDoc to:

```ts
/**
 * A CSS numeric font weight, `1…1000`. The shipped scale uses `400` regular,
 * `500` medium and `600` semibold — {@link fontWeights} is that set — but a
 * brand may name any weight its installed family provides, including a
 * variable font's intermediate step. GPUix receives the number on
 * `StyleDesc.fontWeight`.
 */
```

`docs/design-system.md` line 140–142 — replace the sentence with:

```
The three shipped weights — `400`, `500` and `600` — are a scale choice, not a
type restriction: `FontWeight` is a number in the CSS range `1…1000`, and
`themeMetricFailures` holds a copied theme's weights to that range, so a
variable family can name its own step.
```

No other prose changes. Do **not** reword `docs/tokens.md` (already true and
guarded) beyond the one new sentence in §3.3.

### 3.3 Public documentation

- `docs/tokens.md`, `## Typography` after the role table and before the ladders
  paragraph:
  ```
  `fontWeights` is the ascending set the shipped scale uses — `400`, `500` and
  `600` — and the weights a bundled font has to provide; it is derived from the
  roles, not a second list. A brand may still name any weight in `1…1000`.
  ```
- `packages/tokens/README.md`, `## For documentation sites` after the
  `textRoles` snippet: one sentence naming `fontWeights` as the derived weight
  set to load.
- `COMPONENTS.md`, the `Density, type and spacing scales` row: append
  `` `fontWeights` indexes the weights the shipped roles use ``.

## 4. The example

Create `packages/tokens/src/font-weights.example.ts`:

```ts
import { fontWeights, textRoles, typography } from "./index.js";

/**
 * The font manifest for the shipped type scale: the weights to load and the
 * role that selects each. A bundled font provides `weights`; a brand with its
 * own scale replaces the manifest, because `FontWeight` accepts any CSS weight.
 */
export const shippedTypeManifest = () => ({
  weights: fontWeights,
  roles: textRoles.map((role) => ({
    role,
    weight: typography[role].fontWeight,
  })),
});
```

`examples.test.ts` requires every `*.example.ts` to be imported by a test; the
new suite imports and executes it, so the snippet runs rather than merely
compiling.

## 5. The guard

Create `packages/tokens/src/font-weights.test.ts`. Header comment must state the
bug guarded (the two unguarded surfaces and the missing index) and the date.

It uses `node:fs` deliberately, like `docs.test.ts`, `snippets.test.ts` and
`public-types.test.ts`: this is a policy check over the tree's own documents,
and the package ships zero runtime dependencies.

Cases:

1. **`fontWeights` is an ascending, duplicate-free set of CSS weights.** Build
   the expected list from `textRoles` + `typography`, sort it, and compare. Also
   assert every entry is a positive number `<= 1000`. This fails if the
   derivation is replaced by a stale literal.
2. **The `FontWeight` JSDoc names exactly the shipped weights.** Read
   `typography.ts`, slice the block before `export type FontWeight`
   (`/\*\*[\s\S]*?\*\/\s*export type FontWeight/`), collect every backticked
   three-digit number (``/`(\d{3})`/g``), and compare the set with
   `fontWeights`. It must also contain `{@link fontWeights}`. **Fails on the
   pre-fix JSDoc** because it names `700`.
3. **`docs/design-system.md` names exactly the shipped weights and their
   count.** Read the file, locate the paragraph beginning “The … shipped
   weights”, assert it contains `The ${countWord(fontWeights.length)} shipped
   weights`, collect its backticked three-digit numbers and compare with
   `fontWeights`. **Fails on the pre-fix “The four weights” sentence.**
4. **The example matches the scale.** Execute `shippedTypeManifest()`; assert
   `weights` equals `fontWeights` and every `roles` entry's weight is a member
   of `fontWeights` and equals `typography[role].fontWeight`.
5. **The catalogue and the index agree.** Assert `docs/tokens.md` contains the
   same derived list sentence the `docs.test.ts` guard builds (keeps this file
   honest even when the other suite changes).

Then edit `packages/tokens/src/docs.test.ts`:

- import `fontWeights` from `./typography.js`;
- delete the local `shippedWeights` derivation (`const shippedWeights = [ ...new
  Set(...) ]`) and use `fontWeights` in the “names exactly the font weights”
  case.

This makes the index the one owner the docs test reads; the two new surfaces
join the same owner.

**Test can fail / passes:** before the source edits, case 2 reports `700` and
case 3 reports “four”; after, both pass. For the guard-both-directions proof,
temporarily add `` `800` `` to the JSDoc and to the design-system sentence and
watch the same two cases fail, then revert.

## 6. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

```sh
nub run --filter @gpuixui/tokens test
```
Expected: `Test Files 111 passed`, `Tests 5366 passed` (one new file, five new
cases; the exact total may move by one if a case is split — record the real
number in the commit body).

```sh
nub run --filter @gpuixui/tokens check-types
```
Expected: no output, exit 0.

```sh
nub run lint
nub run fmt
nub run check:tests
```
Expected: all exit 0.

```sh
nub run check
nub run lint
nub run test
```
Expected: the completion gate, all green. If `nub run test` runs packages that
are mid-edit in other worktrees, record which package failed and why; do not
edit another workstream's path. STOP if the failure is in `packages/tokens`.

## 7. STOP conditions

Stop and report, with the command output, if:

- the grep in §2 finds a third “four weights” surface, or a `700` claim outside
  the two named here;
- `fontWeights` cannot be derived without importing `typography` before its
  declaration (ES module order);
- adding the public value changes the package's export shape in a way another
  suite rejects beyond a documentation mention (for example `public-types` or
  `snippets`), and the fix is not a one-line documentation update;
- `nub run --filter @gpuixui/tokens test` fails outside the new file;
- the gates in §6 stay red after the plan's own edits.

Do not silence a failure by deleting a case or by weakening a floor.

## 8. Acceptance

- `fontWeights` is exported from `@gpuixui/tokens`, derived from the roles, and
  named in `docs/tokens.md` and the README.
- The `FontWeight` JSDoc and `docs/design-system.md` name exactly the shipped
  weights; no surface claims a `700`.
- `font-weights.test.ts` fails on the pre-fix sentences and on a stale
  `fontWeights` literal, and passes on the fixed tree.
- `font-weights.example.ts` runs in the suite.
- `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/README.md` are updated.
- The three completion gates are green.
