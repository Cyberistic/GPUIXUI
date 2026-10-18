# Plan 370 — a type weight is a paintable number

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
058 (the type table is derived), 358 (the metric contract), 364/368 (every
numeric member must be paint), 367 (the type scale is two ladders).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Two halves of one problem, both in the same member.

**The type forbids weights the runtime accepts.** `FontWeight` is the literal
union `400 | 500 | 600 | 700` (`src/typography.ts:4`). The pinned
`@gpuix/native@0.10.0` `StyleDesc` accepts `fontWeight?: string | number`
(`host.d.ts:114`), and GPUI's `FontWeight` is an `f32`. The CSS weight range is
`1…1000`, which is what a variable font exposes: a brand that installs a
variable family cannot name its `450` body or an `800` display weight through
`extendTheme` without a cast, and the docs teach that a copied theme can change
any type value.

**The checker never reads the weight.** `themeMetricFailures` reads a role's
`fontSize` and `lineHeight`, and it reads `fontWeight` only in the
`body` → `bodyStrong` ladder. A probe on the shipped light theme:

```ts
const broken = extendTheme(lightTheme, {
  typography: { display: { fontWeight: Number.NaN } },
});

themeMetricFailures(broken);   // []  (before this plan)
themeContrastFailures(broken); // []
textStyle(broken, "display").fontWeight; // NaN — straight to the renderer
```

`styles.ts:47` passes `fontWeight` to `StyleDesc` unchanged. Eight roles accept
`NaN`, `0`, `-1` and `1000` with no failure at all; `body` and `bodyStrong` are
caught only incidentally when the weight-variant ladder sees a negative or a
`NaN`, and `body: 0` still passes. So the contract's own sentences are false:

- `metrics.ts` JSDoc: *"Every numeric member of every group must also be
  finite."*
- `docs/tokens.md` §Numeric metrics: *"Every other numeric metric — a type size
  or leading, a border width, … — must be a finite number too."*
- `COMPONENTS.md` **Theme metric check**: "any other non-finite metric it casts
  to a 32-bit float".

A weight is exactly such a metric, and it is the last ungoverned one.

The gap is not fixable without the first half: a test cannot express
`fontWeight: 0` through `extendTheme` while the parameter type is the four
literals, and a test that needs an `as` cast to reach the defect is not a guard
this repo accepts.

## 2. Decision

1. **Widen `FontWeight` to `number`.** Document it as a CSS numeric weight in
   `1…1000`. The shipped scale stays 400/500/600/700 — those are design choices,
   not the type's boundary. This is a widening: every existing assignment and
   every shipped value is unchanged, and no consumer switch over the union exists
   in the package.
2. **Govern every role's weight** in `themeMetricFailures`: finite, at least `1`,
   at most `1000`. A non-finite weight is reported once as `finite` rather than
   also as out of range.
3. Keep the `bodyStrong` heavier-than-`body` rule unchanged.

Rejected alternatives:

- **Keep the literal union and add the rule** — the rule could only be tested
  through a cast, and the type would still refuse a legitimate `450`/`800`; the
  extension story would stay blocked.
- **Hold every weight to the four shipped values** — that is a house style, not
  a paint invariant, and it rejects the variable-font weights the runtime
  supports.
- **Leave the weight ungoverned and delete the totality claim** — the silent
  `NaN` would remain, and the package would abandon a guarantee it already
  states.
- **A new group or rule name** — `typography` is the group and `finite` /
  `at-least` / `at-most` already say what is broken.

Every shipped theme, platform variant and recipe uses a weight in `400…700`, so
this plan moves **no token value, colour, pair or floor**.

## 3. Exact edits

### 3.1 `packages/tokens/src/typography.ts` — the weight type

Replace:

```ts
/** Available font weights. GPUIX accepts numeric weights on `StyleDesc`. */
export type FontWeight = 400 | 500 | 600 | 700;
```

with:

```ts
/**
 * A CSS numeric font weight, `1…1000`. The shipped scale uses four — `400`
 * regular, `500` medium, `600` semibold and `700` bold — but a brand may name
 * any weight its installed family provides, including a variable font's
 * intermediate step. GPUix receives the number on `StyleDesc.fontWeight`.
 */
export type FontWeight = number;
```

No value in `typography` changes.

### 3.2 `packages/tokens/src/metrics.ts` — the weight rule

Add a helper below `fraction` (it is a bounded scalar, so a non-finite value is
reported once instead of three times):

```ts
/**
 * A font weight is a number in the CSS weight range. The runtime selects the
 * nearest weight the family provides, so a weight outside `1…1000` names no
 * weight at all; a non-finite value cannot be compared and is reported as
 * `finite` alone.
 */
const weighable = (
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual)
    ? [
        ...atLeast("typography", member, actual, 1),
        ...atMost("typography", member, actual, 1000),
      ]
    : [failure("typography", member, "finite", actual, 0)];
```

Add the pass after the `bodyStrong` weight ladder (keep the ladder: it still
holds emphasis above body):

```ts
    ...textRoles.flatMap((role) =>
      weighable(`${role}.fontWeight`, typography[role].fontWeight),
    ),
```

Update the typography bullet in the function JSDoc:

> - **typography**: a role needs a size, leading and weight; a line box shorter
>   than its type clips the glyphs, and the weight is a CSS number in `1…1000`
>   the renderer can select. The two documented size ladders …

The closing sentence ("Every numeric member of every group must also be
finite") then becomes true as written; `fontWeight` is covered by `weighable`
rather than by `finiteMembers`, so do not also add it to the `finiteMembers`
list.

### 3.3 New `packages/tokens/src/font-weight.test.ts`

Header states the guarded bug: `FontWeight` was the four shipped literals, so a
brand could not name `450`/`800`, and `themeMetricFailures` never read the
member — `NaN`, `0`, `-1` and `1001` returned `[]` while `textStyle` handed each
to the renderer.

Cases:

1. A `NaN` weight reports exactly one `finite` failure on `display.fontWeight`;
   `themeContrastFailures` stays `[]`.
2. `0` reports `at-least` with bound `1`.
3. `-1` reports `at-least` with bound `1` (and not `finite`).
4. `1001` reports `at-most` with bound `1000`.
5. `Infinity` reports exactly one `finite` failure — not a range failure too.
6. `800` returns `[]`: a brand may name a weight the shipped scale does not.
7. `450` returns `[]`: the variable-font case.
8. The evidence path: `textStyle(edited, "display").fontWeight` equals the
   authored `800`, so the value the checker governs is the value the renderer
   receives.
9. A `NaN` loop over all ten `textRoles` reports ten failures, one per role, so
   a future role cannot ship ungoverned.
10. Every shipped theme, platform variant and recipe returns `[]`.
11. `bodyStrong` equal to `body` still reports the existing `increasing`
    failure — the new range rule did not replace the variant rule.

### 3.4 `docs/tokens.md`

- Types table: `| \`FontWeight\` | A numeric CSS weight, \`1…1000\`; the shipped scale uses \`400\`, \`500\`, \`600\` and \`700\`. |`
- Typography paragraph: replace *"Weights are `400`, `500`, `600`, `700`."* with
  *"The shipped weights are `400`, `500`, `600` and `700`; `FontWeight` is a
  number in the CSS range `1…1000`, so a brand may name an intermediate weight
  its installed family provides."*
- §Numeric metrics: change "a type size or leading" to "a type size, leading or
  weight" and add: *"A weight is held to `1…1000`: a zero, a negative or a
  `NaN` selects no weight, so the renderer has nothing to paint."*

### 3.5 `docs/design-system.md` — §5

After the two-ladder paragraph add:

> The four weights are a scale choice, not a type restriction: `FontWeight` is a
> number in the CSS range `1…1000`, and `themeMetricFailures` holds a copied
> theme's weights to that range, so a variable family can name its own step.

### 3.6 `packages/tokens/README.md`

In the "same edit path can …" paragraph, add "name a font weight outside the
`1…1000` range the text system can select" beside the other failures. No new
count is introduced, so `readme.test.ts` needs no case.

### 3.7 `COMPONENTS.md` — the **Theme metric check** row

In the typography clause, after "flatten `bodyStrong`'s weight onto `body`", add
", name a font weight outside the `1…1000` range the renderer can select".

### 3.8 `TODO.md` and `.agents/slop/plans/README.md`

- Add one ticked TODO row in the tokens list and move the progress count
  (`137/187` → `138/188`).
- Add the plan row (`370`) after `369` and a closing paragraph in the same
  voice: the union blocked legitimate weights, the checker never read the
  member, the widening, the `weighable` rule, and that no value moves.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/font-weight.test.ts)
# EXPECT: cases 1–5 and 9 FAIL (the pre-fix checker has no weight rule); 6–8,
# 10 and 11 pass — they document the widened type and the existing rules.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/font-weight.test.ts)
# EXPECT: every case passes.

git stash push -- packages/tokens/src/typography.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/font-weight.test.ts)
# EXPECT: the file fails to compile — the pre-fix union cannot express the
# weights the cases are about. That is the type half failing.
git stash pop
```

Then the gate:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: the full tokens suite green (currently 81 files / 4335 tests, plus the
new file); `check:tests` reports every test asserts something; `tsc --noEmit`
clean; oxfmt and oxlint clean.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe gains a metric failure — the
  shipped weights are 400–700 and this plan forbids a token move;
- an existing test asserts that `FontWeight` is the four-literal union, or a
  consumer-shaped type check depends on the narrowing;
- the docs guard (`docs.test.ts`, `readme.test.ts`, `public-types.test.ts`)
  rejects the new sentences — adjust the wording to the guard, never the guard
  to the wording;
- the change appears to need a schema, a new metric group/rule or a runtime
  dependency — it is one type, one helper and four documents;
- a "reports" case passes on the pre-fix `metrics.ts` (see §4).

## 6. Acceptance criteria

- `FontWeight` is `number`, documented as the CSS range `1…1000`; the shipped
  scale is unchanged.
- `themeMetricFailures` reports `finite` on a non-finite weight, `at-least` on
  `< 1`, `at-most` on `> 1000`, for every one of the ten roles.
- `450` and `800` pass and reach `textStyle` unchanged.
- Every shipped set passes; no colour, pair, floor, platform style or recipe
  changes.
- The four documents and the ledger state the range and the scale choice.
- The new cases fail on the pre-fix `metrics.ts`; the type cases fail to compile
  on the pre-fix `typography.ts`.
- No path outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None required. Widening a literal union to `number` is source-compatible: the
consumer packages assign the shipped weights and read them back. The docs sites
build their type tables from `textRoles`/`typography`, not from the union, so
they need no change. A consumer that exhaustively switched on
`400 | 500 | 600 | 700` would see a compile error and should read
`theme.typography[role].fontWeight` as the number it is.
