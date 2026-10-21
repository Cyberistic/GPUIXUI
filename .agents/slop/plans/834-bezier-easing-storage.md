# 834 — The cubic-bezier easing a stored edit cannot carry

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `685`, `713`,
`727`, `758`, `794` and `834`'s predecessor `744`.

## 1. The defect

`docs/tokens.md` teaches a cubic-bezier easing as a first-class theme value:

```ts
extendTheme(base, { motion: { ease: { enter: [0.4, 0, 0.2, 1] } } })
```

and says it "works without a cast". It does — the theme paints, and
`themeMetricFailures` governs the four control points. But the same theme cannot
be **stored**: `themeOverrides(base, edited)` returns `undefined`, so
`themeEdit(choice, edited)` does too and the editor's copy-and-own path falls
back to keeping a whole theme object.

The cause is one branch in `theme-diff.ts`:

```ts
const sameMembers = (base: unknown, theme: unknown): boolean => {
  if (Array.isArray(base) || Array.isArray(theme)) {
    return Array.isArray(base) && Array.isArray(theme);
  }
  ...
```

The array branch exists for an elevation level — both sides are arrays, so it
returns `true`. A `motion.ease` phase is a **name or a tuple**: the base ships
`"easeOut"` and the edited theme holds `[0.4, 0, 0.2, 1]`, so one side is an
array and the other is not and the function reports "the member sets differ".
`sameMembers`' own JSDoc already states the correct rule — "The member boundary
is the named members of a record; a level's entries are carried by
`changedElevation`" — so the branch contradicts the comment above it.

Two documents describe the `undefined` cases and both are therefore wrong about
the path they exist to teach:

- `docs/tokens.md`: "`undefined` means the pair cannot be expressed, for one of
  two reasons: a different `mode` … or a group whose member set differs from the
  base's — the extra step a brand spreads into a scale".
- `docs/design-system.md`: "A different mode returns `undefined` … and so does a
  group whose member set differs from the base's — a scale a brand widened with
  an extra step".

A bezier easing is a third case today, and it is not a member-set difference at
all: the member is declared, only its *value kind* differs from the shipped one.

Evidence, run on this tree before the fix:

```sh
cd packages/tokens
nub run --filter @gpuixui/tokens test theme-diff
# added case: a bezier easing cannot be expressed -> passes today:
#   expect(themeOverrides(base, extendTheme(base, { motion: { ease: { enter: [0.4, 0, 0.2, 1] } } })))
#     .toBeUndefined();
```

## 2. Decisions

1. **A non-record is a value, not a member map.** Delete the array branch. The
   walk then compares the named members of records only, which is what the JSDoc
   and `themeOverrides`' contract already say; an array and a name are both
   values to the diff, and `changedMotion`'s `easingEquals` is the thing that
   compares them.
2. **The widened-scale refusal is unchanged.** It is a *key set* difference at a
   record, which the remaining walk still refuses (`theme-overrides-members`
   must stay green, all five cases).
3. **Fix the artifact, not only the diff.** `themeEdit` is what a settings screen
   stores, so the regression case walks `themeEdit` → `JSON` → `applyThemeEdit`
   as well as `themeOverrides`.
4. **Correct the type index too.** The `MotionEasing` row says "A
   cubic-bezier control-point tuple", but the type is a name **or** a tuple; the
   plan fixes the row because the same paragraph is the one this bug lives in.
5. **No value moves.** No colour, pair, floor, metric, role or shipped theme.

## 3. Files to change

1. `packages/tokens/src/theme-diff.ts` — `sameMembers` and its JSDoc (§4).
2. `packages/tokens/src/theme-diff.example.ts` — a bezier edit beside the
   existing exported ones (§4.2), so the documented shape is executed.
3. `packages/tokens/src/theme-diff.test.ts` — two cases (§5).
4. `packages/tokens/src/theme-edit.test.ts` — one case: the stored artifact
   survives JSON and replays (§5).
5. `docs/tokens.md` — the motion tuple paragraph, the deriving paragraph and the
   `MotionEasing` type row (§6).
6. `docs/design-system.md` — the `themeOverrides` bullet (§6).
7. `packages/tokens/README.md` — the extending paragraph (§6).
8. `COMPONENTS.md` — one clause in the **Theme extension** row (§6).
9. `TODO.md` — one ticked row, counter `381/456` → `382/457` (§7).
10. `.agents/slop/plans/README.md` — the row and one closing paragraph (§8).

## 4. The code

### 4.1 `sameMembers`

Replace

```ts
/**
 * Whether two themes declare the same members, at every depth. `extendTheme`
 * merges with a spread, so a brand can widen a scale — `{ ...spacing, "6xl":
 * 96 }` — and the numeric contract accepts the result as a `Theme`. A
 * `ThemeOverrides` names only the declared members, so the diff cannot carry an
 * added step back; refusing the pair is what keeps a returned set able to
 * rebuild the theme it was measured against.
 *
 * An array is a value, not a member map: `extendTheme` replaces an elevation
 * level whole, so a defined `overlay` — a level the identity ships empty and
 * the metric contract governs — travels in the diff instead of being refused.
 * The member boundary is the named members of a record; a level's entries are
 * carried by `changedElevation`.
 */
const sameMembers = (base: unknown, theme: unknown): boolean => {
  if (Array.isArray(base) || Array.isArray(theme)) {
    return Array.isArray(base) && Array.isArray(theme);
  }
  if (isRecord(base) && isRecord(theme)) {
```

with

```ts
/**
 * Whether two themes declare the same members, at every depth. `extendTheme`
 * merges with a spread, so a brand can widen a scale — `{ ...spacing, "6xl":
 * 96 }` — and the numeric contract accepts the result as a `Theme`. A
 * `ThemeOverrides` names only the declared members, so the diff cannot carry an
 * added step back; refusing the pair is what keeps a returned set able to
 * rebuild the theme it was measured against.
 *
 * The member boundary is the named members of a **record**. Everything else is a
 * value, whatever its kind: an elevation level is a list `extendTheme` replaces
 * whole — so a defined `overlay`, which the identity ships empty, travels in the
 * diff — and an easing phase is a name in the shipped themes and a
 * cubic-bezier tuple in an edited one, which `changedMotion` compares. Reading
 * either as a member map refuses an edit the merge accepts.
 */
const sameMembers = (base: unknown, theme: unknown): boolean => {
  if (isRecord(base) && isRecord(theme)) {
```

(`isRecord` excludes arrays, so an array never enters the key walk and is
already a value on both sides.)

### 4.2 `theme-diff.example.ts`

Append, after `exportedOverlayOverrides`:

```ts
/**
 * A bezier easing is a value, not a member set: the shipped phase is a name and
 * the edit is a tuple, and the diff carries it like any other value. The stored
 * pair is the shape an editor persists, so this is the path plan `834` fixed.
 */
export const exportedBezierTheme = extendTheme(exportedBase, {
  motion: { ease: { enter: [0.4, 0, 0.2, 1] } },
});

/** The one-phase diff that rebuilds {@link exportedBezierTheme}. */
export const exportedBezierOverrides = themeOverrides(
  exportedBase,
  exportedBezierTheme,
);
```

The file's header already says it is asserted in `theme-diff.test.ts` and
`theme-edit.test.ts`; no header change is needed.

## 5. Tests

### 5.1 `theme-diff.test.ts`

Add a `describe("a value is not a member set")` block with two cases, and extend
the existing "reproduces an edit that touches every expressible group" case by
moving one phase to a tuple — `motion: { fast: 150, ease: { enter: "linear" } }`
becomes `motion: { fast: 150, ease: { enter: "linear", standard: [0.4, 0, 0.2, 1] } }`
— so the every-group case covers both easing kinds.

1. **A bezier easing round-trips**, built from the executed example:

   ```ts
   expect(exportedBezierOverrides).toEqual({
     motion: { ease: { enter: [0.4, 0, 0.2, 1] } },
   });
   expect(extendTheme(exportedBase, exportedBezierOverrides ?? {})).toEqual(
     exportedBezierTheme,
   );
   ```

   `?? {}` is deliberate: it makes the pre-fix run fail on the *value* rather
   than on a type error, so the two-direction proof is a real assertion. The
   `toEqual` on `exportedBezierOverrides` fails first today, because the const
   is `undefined`.

2. **The named form still round-trips** through the same block, so a future
   "treat every easing as a tuple" change fails:

   ```ts
   const named = extendTheme(exportedBase, { motion: { ease: { enter: "linear" } } });
   expect(overridesOf(exportedBase, named)).toEqual({
     motion: { ease: { enter: "linear" } },
   });
   ```

### 5.2 `theme-edit.test.ts`

Add one case to `describe("a stored edit records its base")`:

```ts
it("carries a bezier easing through storage", () => {
  const choice = { mode: "light" as const };
  const base = resolveThemeChoice(choice);
  const edited = extendTheme(base, {
    motion: { ease: { enter: [0.4, 0, 0.2, 1] } },
  });

  const stored = editOf(choice, edited);
  const parsed: unknown = JSON.parse(JSON.stringify(stored));

  expect(parsed).toEqual(stored);
  expect(applyThemeEdit(stored)).toEqual(edited);
});
```

The `JSON` round trip is the point: a settings screen stores the artifact as
text, and a tuple survives it. Keep the header comment's defect narrative and
add one sentence naming plan `834`.

A third case guards the two catalogue sentences the fix adds, because the
`undefined` reasons were prose no suite read: the page says the diff carries a
tuple, and that a value is not a member. Assert the two phrases on the
whitespace-flattened page, the way `theme-edit.test.ts` already holds the
plan-744 sentence.

Every case asserts a value the fix produces; none asserts a literal against
itself.

## 6. Documents

1. `docs/tokens.md`, motion paragraph — after "works without a cast", add:

   ```
   A tuple is also a value the diff carries: `themeOverrides(base, edited)`
   returns `{ motion: { ease: { enter: [...] } } }` like any other change, so a
   theme editor can store a bezier easing (plan 834).
   ```

2. `docs/tokens.md`, deriving paragraph — after the `overlay` sentence, add:

   ```
   A value is not a member: an easing phase may be a name in the base and a
   cubic-bezier tuple in the edit, and the tuple travels in the overrides.
   ```

3. `docs/tokens.md`, type index — replace the `MotionEasing` row with:

   ```
   | `MotionEasing` | A named easing (`linear`, `ease`, `easeIn`, `easeOut`, `easeInOut`) or a cubic-bezier control-point tuple. |
   ```

4. `docs/design-system.md`, `themeOverrides` bullet — after "a defined `overlay`
   travels in the overrides", add: "A bezier easing is a value too: a phase may
   be a name in the base and a tuple in the edit, and the diff carries it."

5. `packages/tokens/README.md`, extending paragraph — after "A runnable example
   lives in `src/theme-diff.example.ts`", add: "A cubic-bezier easing is a value
   the diff carries, so an editor that stores an edit keeps a tuple."

6. `COMPONENTS.md`, **Theme extension** row — inside the clause naming
   `themeEdit`/`applyThemeEdit`, add: "a bezier easing is a value rather than a
   member, so an edit that replaces a named phase with a tuple round-trips and
   is stored (plan 834)".

The `docs.test.ts` value-coverage walk needs no change: no value or type is
added. `snippets.test.ts` needs no change: every new snippet imports
`themeOverrides`/`extendTheme`, which its block names.

## 7. `TODO.md`

Add, above the plan-833 row:

```
`[x]` Carry a cubic-bezier easing through the edit artifact — `sameMembers`
refused the pair because the shipped phase is a name and an edited one is a
tuple, so `themeOverrides`/`themeEdit` returned `undefined` for the easing the
catalogue teaches to author; a non-record is a value, not a member map, the
widened-scale refusal is unchanged, and `theme-diff.example.ts` +
`theme-edit.test.ts` hold the diff and the stored pair; the `MotionEasing` type
row now names both forms (plan 834)
```

and bump the section counter `381/456` → `382/457`.

## 8. The index

```
| [834](./834-bezier-easing-storage.md) | The cubic-bezier easing a stored edit cannot carry | F | 685, 713, 727, 744, 758, 794 | done |
```

and one closing paragraph after the plan-833 sentence: the array branch was
written for an elevation level, fired for the one member whose value kind is a
union, and the docs listed two `undefined` reasons for a function that had
three; deleting the branch makes the walk match its own comment, with the
widened-scale refusal intact.

## 9. Commands, expected results and both directions

```sh
cd packages/tokens
nub run --filter @gpuixui/tokens test theme-diff
nub run --filter @gpuixui/tokens test theme-edit
nub run --filter @gpuixui/tokens test theme-overrides-members
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
cd ../..
nub run check
```

Expected: the package green (the pre-fix suite is 227 files / 7200 tests; this
plan adds four cases — two in `theme-diff.test.ts`, two in `theme-edit.test.ts`
— and extends the every-group case), and the root gates green.

Both directions:

1. **Fails before the fix.** Add the cases and the example first, run
   `test theme-diff` with the array branch still in place: the bezier case fails
   on `undefined` (the `?? {}` keeps it an assertion, not a type error) and the
   every-group case fails on the added `standard` phase. Record the failure
   output in the commit message.
2. **Passes after.** Delete the branch, re-run: both files green, then the whole
   package and `nub run check`.
3. **The refusal still bites.** `theme-overrides-members` must stay green —
   five widened groups, the reversed pair and the identity diff. If any of those
   becomes `undefined`-free, STOP: the key-set walk was damaged, not fixed.

**Native scenarios.** None; this changes a pure diff. Record "no scenario ran".

## 10. STOP conditions

- Stop if removing the branch changes any behaviour other than a
  name/tuple easing pair. Run `theme-overrides-members` and `theme-edit` before
  going further; the widened-group refusals and every shipped round trip must be
  identical.
- Stop if a shipped theme's diff changes. `theme-diff.test.ts`'s shipped cases
  must report the same overrides as before; the branch only fires on a kind
  mismatch, and no shipped theme has one.
- Stop if the new case can pass without the fix (for example by asserting
  `undefined`). The assertion must be the rebuilt theme.
- Stop if `nub run check` reports a test with no assertion, or if
  `check-types` needs a cast to write the case.

## 11. Not changed

- Every `Theme` value, colour, pair, floor, metric and shipped set; the
  contrast and metric contracts; `docs/tokens.md`'s figure tables.
- `extendTheme`, `mergeMotion`, `easingEquals`, `changedMotion`, `themeEdit` and
  `applyThemeEdit`: the fix is the member walk only.
- `packages/components`, `packages/primitives`, `apps/*`; the `docs-site`
  interlocks stay cross-team rows.
