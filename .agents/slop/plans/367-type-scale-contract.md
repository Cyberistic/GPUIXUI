# Plan 367 — the type scale must stay a scale

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
358 (the metric contract), 360/361/364 (the rules' later members), 059
(`textRoles`).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`docs/design-system.md` §5 states the type scale as an invariant, not a mood:

> The scale is two ladders: prose (`display` → `caption`) and code (`code` →
> `codeBlock`). `bodyStrong` shares `body`'s size and is a weight variant, so it
> is on neither ladder.

`themeMetricFailures` governs the typography group with two rules only — a role's
size is positive and its leading is at least its size. The ladder lives in
`packages/tokens/src/typography.test.ts` as two **local** arrays asserted on the
shipped `typography` constant, so nothing holds an **edited** theme to it. A
probe on the shipped light theme returns `[]` from both checkers for four edits:

```ts
// h1 below h2 — a heading that renders smaller than the section under it:
themeMetricFailures(extendTheme(getTheme("light"), {
  typography: { h1: { fontSize: 12, lineHeight: 16 } },
})); // []   (themeContrastFailures also [])

// codeBlock above code — the code ladder inverted:
themeMetricFailures(extendTheme(getTheme("light"), {
  typography: { codeBlock: { fontSize: 14, lineHeight: 20 } },
})); // []

// bodyStrong at body's weight — emphasis that is not visible:
themeMetricFailures(extendTheme(getTheme("light"), {
  typography: { bodyStrong: { fontWeight: 400 } },
})); // []

// bodyStrong below body — an emphasis role smaller than the text it emphasises:
themeMetricFailures(extendTheme(getTheme("light"), {
  typography: { bodyStrong: { fontSize: 12, lineHeight: 16 } },
})); // []
```

The compositions are first-class in the consumer: `textStyle(theme, role)` is how
every component paints type. `packages/components/src/card.tsx:114` paints
`CardTitle` with `h3`, `alert.tsx:160` and `toast/viewport.tsx:134` paint
`bodyStrong` for the panel title, `empty-state.tsx:70` uses `bodyStrong` for the
empty state's title, and `field.tsx:151`/`166` paint field helper and error text
with `caption`. Invert the prose ladder and a card title is smaller than the body
inside it; flatten `bodyStrong`'s weight and an Alert or Toast title becomes
indistinguishable from its description — the name `bodyStrong` promises emphasis
the theme no longer carries, exactly the class of defect plans 358–366 closed for
colour.

Every shipped theme, platform variant and recipe shares the identity
`typography` (platform styles change only the two families), so this plan moves
**no token value**.

## 2. Decision

Three changes, all inside the existing `typography` group — no new group, no new
rule name, no colour or pair change:

1. **Export the two ladders** from `typography.ts` as `proseLadder` and
   `codeLadder`, largest first. `typography.test.ts` stops carrying local copies
   and `metrics.ts` reads the same data, so the shipped design and the
   edited-theme contract cannot list different ladders (the drift plan 305 fixed
   for `themeModes`).
2. **Hold the ladders by size** in `themeMetricFailures`: each ladder, walked in
   **ascending** order, is `non-decreasing`. Equality is allowed — a compact
   theme may set `h2 === h3` — but a role below another may never render larger.
3. **Hold the emphasis pair**: `bodyStrong.fontSize >= body.fontSize` and
   `bodyStrong.fontWeight > body.fontWeight`. The first stops an emphasis role
   shrinking below the text it emphasises; the second is the documented
   "weight variant" — same size, heavier weight, or the emphasis is invisible.

Rejected alternatives, with reasons:

- **Enforce the shipped scale exactly (`increasing`, no equal steps)** — the
  shipped roles step strictly down, and `typography.test.ts` keeps asserting
  that on the identity. An edited theme may legitimately collapse two adjacent
  steps; the contract's job is to catch inversion, not to forbid a house style.
  This is the same split plan 358 chose: radius and motion ship equal steps and
  their rules are `non-decreasing`.
- **Enforce `bodyStrong.fontSize === body.fontSize`** — that is the identity's
  design, not a breakage rule. A theme that renders `bodyStrong` one pixel larger
  still carries emphasis; a theme that renders it smaller does not. The shipped
  equality is asserted in `typography.test.ts` instead.
- **A new `MetricRule` such as `"equal"` or `"descending"`** — the existing
  `non-decreasing` and `increasing` ladders express both rules once the ladders
  are written ascending. A new rule name would change the public `MetricRule`
  union for no extra protection.
- **A runtime validator inside `extendTheme`** — the package deliberately keeps
  `extendTheme` total and side-effect free (plan 358): the contract is a
  test-time check a consumer runs.
- **Guard only in `typography.test.ts`** — that test reads the shipped constant;
  the defect is an edited theme, which only `themeMetricFailures` sees.

## 3. Exact edits

### 3.1 `packages/tokens/src/typography.ts`

After `textRoles` (it defines `TextRole`), add:

```ts
/**
 * The prose size ladder, largest first. `bodyStrong` is a weight variant of
 * `body`, not a step, so it belongs to neither ladder. Exported because the
 * numeric contract, the type-scale test and a documentation table must not
 * retype the order (plan 367).
 */
export const proseLadder = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "label",
  "caption",
] as const satisfies ReadonlyArray<TextRole>;

/** The code size ladder, largest first: `code`, then `codeBlock`. */
export const codeLadder = ["code", "codeBlock"] as const satisfies ReadonlyArray<TextRole>;
```

### 3.2 `packages/tokens/src/metrics.ts`

**a.** Extend the typography import:

```ts
import {
  codeLadder,
  proseLadder,
  textRoles,
  type TextRole,
  type Typography,
} from "./typography.js";
```

**b.** Add a local helper above `themeMetricFailures`:

```ts
/**
 * A documented size ladder walked from its smallest step upwards, because the
 * `ladder` rule steps up and the docs list each ladder largest first.
 */
const ascendingSizes = (
  ladder: ReadonlyArray<TextRole>,
  typography: Typography,
): ReadonlyArray<readonly [string, number]> =>
  ladder
    .toReversed()
    .map((role) => [`${role}.fontSize`, typography[role].fontSize] as const);
```

`TextRole` (not `keyof Typography`) keeps `sans`/`mono` out: those are family
strings, not sizes.

**c.** In `themeMetricFailures`, after the `textRoles.flatMap` block and before
`borderWidth`, add:

```ts
    ...ladder("typography", ascendingSizes(proseLadder, typography), "non-decreasing"),
    ...ladder("typography", ascendingSizes(codeLadder, typography), "non-decreasing"),
    ...ladder(
      "typography",
      [
        ["body.fontSize", typography.body.fontSize],
        ["bodyStrong.fontSize", typography.bodyStrong.fontSize],
      ],
      "non-decreasing",
    ),
    ...ladder(
      "typography",
      [
        ["body.fontWeight", typography.body.fontWeight],
        ["bodyStrong.fontWeight", typography.bodyStrong.fontWeight],
      ],
      "increasing",
    ),
```

**d.** Extend the `themeMetricFailures` JSDoc bullet for typography:

> - **typography**: a role needs a size and leading, and a line box shorter
>   than its type clips the glyphs. The two documented size ladders — prose
>   `proseLadder` and code `codeLadder` — may not be inverted, and
>   `bodyStrong` is the weight variant of `body`: it may not shrink below it and
>   must stay heavier, or emphasis is indistinguishable from body text.

### 3.3 `packages/tokens/src/typography.test.ts`

**a.** Replace the local `proseLadder`/`codeLadder` arrays with the imported
exports (`import { codeLadder, proseLadder, textRoles, typography, ... } from
"./typography.js";`). Keep the local `laddered` and `brokenSteps` helpers.

**b.** Add the identity's stronger design claims the doc states and nothing
asserted:

```ts
  it("makes bodyStrong a weight variant of body", () => {
    expect(typography.bodyStrong.fontSize).toBe(typography.body.fontSize);
    expect(typography.bodyStrong.fontWeight).toBeGreaterThan(
      typography.body.fontWeight,
    );
  });
```

**c.** In "places every role on exactly one ladder", derive the expected set from
the exports:

```ts
    expect(laddered.toSorted()).toEqual([...textRoles].toSorted());
```

already does this; no change beyond the import.

### 3.4 New `packages/tokens/src/type-scale.test.ts`

Header states the guarded bug: the design system publishes two type ladders and
a weight-variant `bodyStrong`, but `themeMetricFailures` returned `[]` for an
inverted prose ladder, an inverted code ladder and a `bodyStrong` that matched
`body`, so an edited theme could ship a heading smaller than body text or
emphasis the reader cannot see while both checkers returned `[]`.

Cases:

1. **The measured gap** — each of the four probe edits returns a failure and
   `themeContrastFailures` stays `[]`:

   ```ts
   it("reports an inverted prose ladder", () => {
     const edited = extendTheme(getTheme("light"), {
       typography: { h1: { fontSize: 12, lineHeight: 16 } },
     });
     expect(themeContrastFailures(edited)).toEqual([]);
     expect(themeMetricFailures(edited)).toEqual([
       { group: "typography", member: "h1.fontSize", rule: "non-decreasing", actual: 12, bound: 20 },
     ]);
   });

   it("reports an inverted code ladder", () => { … member "code.fontSize", bound 14 … });

   it("reports emphasis that matches body text", () => {
     … typography: { bodyStrong: { fontWeight: 400 } } …
     → [{ group: "typography", member: "bodyStrong.fontWeight", rule: "increasing", actual: 400, bound: 400 }]
   });

   it("reports an emphasis role smaller than body", () => {
     … typography: { bodyStrong: { fontSize: 12, lineHeight: 16 } } …
     → [{ group: "typography", member: "bodyStrong.fontSize", rule: "non-decreasing", actual: 12, bound: 14 }]
   });
   ```

2. **The intended edits pass** — `h2.fontSize === h3.fontSize` (with its
   `lineHeight` raised to match) and `bodyStrong.fontSize: 15` with weight `700`
   both return `[]`.

3. **Every shipped set passes** — reuse the shipped list shape from
   `metrics.test.ts` (identity × mode × contrast, platform variants, recipes) and
   expect `[]` for each; this is the "no value moves" proof.

4. **The ladders are the documented ones** — `proseLadder` and `codeLadder`
   together cover every `textRole` except `bodyStrong` exactly once, and the
   exported order matches the design-system sentence (`display` first,
   `caption` last; `code` before `codeBlock`).

`src/metrics.example.ts` gains one executed example, imported by the new suite
(plan 350's convention):

```ts
/**
 * An inverted type scale: `h1` smaller than `h2`, with a leading that still
 * fits. The colour check is empty; the numeric one names the heading.
 */
export const invertedScale = extendTheme(getTheme("light"), {
  typography: { h1: { fontSize: 12, lineHeight: 16 } },
});
export const invertedScaleFailures = themeMetricFailures(invertedScale);
```

and `metrics.test.ts`'s "passes the identity theme and the executed example"
gains `expect(invertedScaleFailures).toHaveLength(1);`.

### 3.5 `docs/tokens.md` — "Typography"

After the sentence "`textRoles` lists the ten roles in this order, so a table can
be generated without retyping them.", add:

> The scale is two exported ladders: `proseLadder` (`display` → `caption`) and
> `codeLadder` (`code` → `codeBlock`). `bodyStrong` shares `body`'s size and is
> a weight variant, so it is on neither. The numeric contract holds an edited
> theme to the same order.

This also satisfies the public-value coverage guard, which requires every value
export to be named in this page.

### 3.6 `docs/tokens.md` — "Numeric metrics"

In the paragraph starting "The rules are breakage tests…", after the type-leading
clause, add:

> the two documented type ladders (`proseLadder` and `codeLadder`) must not be
> inverted — a role below another may not render larger — and `bodyStrong`,
> the weight variant of `body`, may not shrink below it and must stay heavier,
> because an emphasis role the reader cannot distinguish from body text is not
> emphasis;

### 3.7 `docs/design-system.md` §5 "Typography"

After the paragraph that ends "…so the type scale is enumerated in one place.",
add:

> The numeric contract holds an edited theme to the same two ladders and to the
> weight-variant rule: `body` → `bodyStrong` may not shrink and must gain
> weight, so a copied theme cannot flatten emphasis or render a lower role
> larger than the one above it.

### 3.8 `packages/tokens/README.md` — "Checking the numbers"

In the sentence that lists what the edit path can do, extend "clip a type role by
shortening its leading" to "clip a type role by shortening its leading, invert
one of the two type ladders (`proseLadder` / `codeLadder`) or flatten
`bodyStrong` onto `body`'s weight".

### 3.9 `COMPONENTS.md` — the **Theme metric check** row

In the list of what an edited theme cannot do, after "shorten a role's leading
below its size", add:

> invert either documented type ladder or flatten `bodyStrong`'s weight onto
> `body`

The inventory guard requires `${metricGroups.length} groups`, every group name,
`themeMetricFailures(theme)`, "only focus indicator" and "**Theme contrast
check**"; none of those phrases is touched.

### 3.10 `docs.test.ts`

Add one case in the design-system block, beside "summarises every type role with
its real metrics", holding the new sentence to the exports:

```ts
  it("states the type ladders the numeric contract enforces", () => {
    const sentence = `The numeric contract holds an edited theme to the same two ladders and to the weight-variant rule: \`body\` → \`bodyStrong\` may not shrink and must gain weight`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
    expect(designSystem).toContain(proseLadder[0]);
    expect(designSystem).toContain(codeLadder[0]);
  });
```

Import `proseLadder` and `codeLadder` beside the existing `textRoles` import.

### 3.11 `.agents/slop/plans/README.md`

- Add the table row:

```
| [367](./367-type-scale-contract.md) | The type scale must stay a scale | F | 058, 059, 358, 360 | done |
```

- Add a closing paragraph after plan 366's, in the same voice: the doc sentence,
  the four probe edits that returned `[]`, the two exported ladders, the three
  rules and that no shipped value moves.

### 3.12 `TODO.md`

- Add one ticked row under "Design tokens and theming (`tokens-theme`)" naming
  the gap, the probe, the exported ladders and the rules.
- Update the section progress bar and count (`134/184` → `135/185`).

## 4. Test plan and both directions

Prove the new cases fail without the rules (git, because
`scripts/verify-two-directions.sh` drives `jj`, absent per PLAN D1):

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/type-scale.test.ts)
# EXPECT: the four "reports …" cases FAIL (the pre-fix checker returns []),
# and the "passes" cases pass. A failure case that passes here does not guard
# the fix — STOP and rewrite it.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/type-scale.test.ts)
# EXPECT: every case passes.
```

Then the full gate:

```sh
nub run --filter @gpuixui/tokens test
# EXPECT: all files pass; the suite gains type-scale.test.ts and cases in
# metrics.test.ts.
nub run check
nub run lint
```

Expected: `check` reports "every test asserts something", oxfmt and oxlint clean,
`tsc --noEmit` clean for `packages/tokens` and `packages/deploy`; `lint` clean.

Also run the guarded documents:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts src/metrics.test.ts
# EXPECT: all pass.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails a new rule (that would mean
  a shipped value must move, which this plan forbids);
- `docs.test.ts` rejects the new design-system sentence (re-read the guard; do
  not delete a guarded phrase — the existing type-summary sentences are exact);
- the public-value coverage guard rejects the two new exports after §3.5 (the
  names must appear in `docs/tokens.md` as whole identifiers);
- a new rule needs a new `MetricRule` member or a second rule helper — the plan
  is four `ladder(...)` calls;
- a "reports …" case passes on the pre-fix `metrics.ts`;
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- The four probe edits each return exactly one `typography` failure with the
  member, rule and bound named in §3.4, and `themeContrastFailures` still
  returns `[]` for each.
- `h2.fontSize === h3.fontSize` and `bodyStrong: { fontSize: 15, fontWeight: 700 }`
  return `[]`.
- Every shipped theme, platform variant and recipe returns `[]`.
- `proseLadder` and `codeLadder` are exported, named in `docs/tokens.md`, and
  cover every `textRole` except `bodyStrong` exactly once.
- `typography.test.ts` no longer carries local ladder copies and asserts the
  identity's `bodyStrong` sharing and heavier weight.
- Both docs pages, the package README, the ledger row and the plan index state
  the type-scale rules; `docs.test.ts`, `inventory.test.ts`, `readme.test.ts` and
  the full `@gpuixui/tokens` suite pass.
- The new cases fail on the pre-fix `metrics.ts` (proven with §4) and pass after.
- No token value, colour pair, floor, platform style or recipe changes; no path
  outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. `packages/components` and `packages/primitives` already paint every role
through `textStyle(theme, role)`; the contract describes the invariant those
calls assume. No consumer migration is implied.
