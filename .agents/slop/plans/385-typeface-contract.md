# Plan 385 — the typeface half of an editable theme

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the package), 051 (the one-family rule and its GPUix evidence), 070 (the
type-facts paragraph), 324 (the public type index), 358 (the numeric contract),
371 (the colour-format check), 383 (`themeFailures`).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`docs/tokens.md` states two facts about a theme's families:

> GPUix 0.10.0's `StyleDesc.fontFamily` is a **single** string, not a CSS stack,
> so an entry never contains a comma; a family the machine does not have falls
> back silently.

The first half is guarded **only for the shipped `platformTypes` table**
(`platforms.test.ts`, *"names a single family, never a comma stack"*, plan 051).
Neither half is checked for a theme a consumer edits — the thing the package's
whole extension story is about. The three checks that make up the guarantee —
`themeColorFailures`, `themeContrastFailures`, `themeMetricFailures` — never read
`typography.sans` or `typography.mono`: the first walks `colorRoles`, the second
pairs colour roles, the third walks numbers.

A probe on this branch (`extendTheme(getTheme("light"), { typography: { sans } })`,
all three checks plus `themeFailures`) returns **0 failures for every one of**:

| `sans` | colour | contrast | metric | total |
| ------ | ------ | -------- | ------ | ----- |
| `"Inter, system-ui, sans-serif"` | 0 | 0 | 0 | 0 |
| `""` | 0 | 0 | 0 | 0 |
| `"   "` | 0 | 0 | 0 | 0 |
| `"Helvetica Neue"` | 0 | 0 | 0 | 0 |

The first row is the important one: a **CSS comma stack** is the habit every
consumer brings from the browser, and it is exactly what the docs say a theme
must never name. `fontFamily: "Inter, system-ui, sans-serif"` is one string to
GPUI, no family has that name, and every label paints the system fallback —
a whole theme's typography silently replaced while `themeFailures(theme)`
returns `[]`. The empty and whitespace-only rows are the same failure with no
name at all.

The last row must keep passing: `"Helvetica Neue"` is a legitimate installed
family and the rule is a breakage test, not a house style.

This is the same class plan 371 closed for colours: a documented form the
runtime requires, ungoverned for edited themes because the check that owns the
domain (metrics) is numeric and the check that owns formats (colour) is about
`colors`.

## 2. Decision

1. **A fourth check, not a widened `MetricFailure`.** `MetricFailure.actual` and
   `.bound` are `number`, `metricRules` is the nine numeric rules, and every
   diagnostics table and test reads that shape. A string rule inside it would
   widen a public payload for one rule. The colour-format check is the
   precedent: *"the value is not in the form the runtime/helpers read"* is its
   own check, beside the measurements.
2. **Two rules, both evidenced.**
   - `non-empty` — a family that is empty or whitespace-only names no family;
     GPUI falls back silently (`platforms.test.ts` already asserts a shipped
     family is not `""`).
   - `single-family` — the plan-051 evidence: `StyleDesc.fontFamily` is one
     string, so a comma list names nothing.
   No rule rejects spaces inside a name (`"Helvetica Neue"`), and no rule checks
   whether the machine has the face — the package cannot know, and the docs
   already say so.
3. **A leaf module `typeface.ts`.** `typography.ts` is data and the type scale;
   it cannot import `Theme` without a cycle (`theme.ts` imports `typography.ts`).
   `typeface.ts` imports the `Theme` type only, the way `contrast.ts` and
   `metrics.ts` do, so the dependency direction stays `theme → typography` and
   `check → theme`.
4. **Both unions are ordered indexes** — `typefaceRoles`, `typefaceRules` —
   because the documentation table and any diagnostics row iterate them instead
   of retyping the names. This is the convention plan 372 established for
   `metricRules` after a hand-typed table drifted.
5. **Diagnostic order: `color` → `typeface` → `contrast` → `metric`.** Both
   format checks precede the measurements they can invalidate: a malformed role
   is named before its `NaN` ratios, and a malformed family is named before the
   reader trusts anything about the type scale painted with it.
6. **No shipped value moves.** Every shipped identity theme, platform variant
   and recipe already names one installed family (or the `.SystemUIFont`
   sentinel) per role, so the new check returns `[]` for all of them.

## 3. Exact edits

### 3.1 New `packages/tokens/src/typeface.ts`

```ts
/**
 * The typeface half of the theme contract.
 *
 * `typography.sans` and `typography.mono` are painted as
 * `StyleDesc.fontFamily`, which GPUix 0.10.0 takes as **one** family string —
 * not a CSS stack — and GPUI resolves by name, falling back silently when the
 * name is unknown (plan 051). A copied theme therefore has a silent failure
 * mode the colour, contrast and metric checks cannot see: `sans: "Inter,
 * system-ui, sans-serif"` (the CSS habit) or `sans: ""` paints every label in a
 * face the author did not choose while `themeFailures` returns `[]`.
 */

import type { Theme } from "./theme.js";

/** The family fields a theme paints with, in documentation order. */
export const typefaceRoles = ["sans", "mono"] as const;

/** A family field a theme paints with. */
export type TypefaceRole = (typeof typefaceRoles)[number];

/** The forms a family name must hold, in documentation order. */
export const typefaceRules = ["non-empty", "single-family"] as const;

/** A form a family name can miss. */
export type TypefaceRule = (typeof typefaceRules)[number];

/** One family name that misses a form in a theme. */
export interface TypefaceFailure {
  /** The family field, `sans` or `mono`. */
  readonly role: TypefaceRole;
  /** The form the value broke. */
  readonly rule: TypefaceRule;
  /** The value the theme carried. */
  readonly value: string;
}

/**
 * Every family name in a theme the runtime cannot resolve as written.
 *
 * A `single-family` failure is a value containing a comma: `fontFamily` is one
 * string, so a CSS stack names a family no machine has and the text falls back
 * silently. A `non-empty` failure is a value that is empty or whitespace-only,
 * which names nothing at all. A name with spaces inside it (`Helvetica Neue`)
 * is a valid single family and is not reported.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeTypefaceFailures } from "@gpuixui/tokens";
 *
 * const stacked = extendTheme(getTheme("light"), {
 *   typography: { sans: "Inter, system-ui, sans-serif" },
 * });
 *
 * themeTypefaceFailures(stacked); // [{ role: "sans", rule: "single-family", … }]
 * ```
 */
export function themeTypefaceFailures(
  theme: Theme,
): ReadonlyArray<TypefaceFailure> {
  return typefaceRoles.flatMap((role): ReadonlyArray<TypefaceFailure> => {
    const value = theme.typography[role];
    return [
      ...(value.trim() === ""
        ? [{ role, rule: "non-empty" as const, value }]
        : []),
      ...(value.includes(",")
        ? [{ role, rule: "single-family" as const, value }]
        : []),
    ];
  });
}
```

### 3.2 `packages/tokens/src/index.ts`

Add `export * from "./typeface.js";` between `./theme.js` and `./typography.js`
(alphabetical).

### 3.3 `packages/tokens/src/theme-check.ts`

- Import `themeTypefaceFailures` and `type TypefaceFailure` from `./typeface.js`.
- Add the union member after the colour one:

```ts
export type ThemeFailure =
  | (ColorFailure & { readonly kind: "color" })
  | (TypefaceFailure & { readonly kind: "typeface" })
  | (ContrastFailure & { readonly kind: "contrast" })
  | (MetricFailure & { readonly kind: "metric" });
```

- In `themeFailures`, insert the half between colour and contrast:

```ts
    ...themeTypefaceFailures(theme).map(
      (failure): ThemeFailure => ({ kind: "typeface", ...failure }),
    ),
```

- Update the JSDoc: *"The extension mechanism's guarantee is only whole when the
  colour-format, typeface, contrast and metric checks all run"*; the order
  sentence becomes *"format first — colour, then typeface, so a malformed role
  is named before the `NaN` ratios it causes and a malformed family before the
  type scale painted with it — then contrast, then metrics"*. `TypefaceFailure`
  is named in the `ThemeFailure` sentence.

### 3.4 `packages/tokens/src/theme-check.example.ts`

Add the fourth defect to `brokenTheme` and update the header comment:

```ts
export const brokenTheme = extendTheme(getTheme("light"), {
  name: "Broken",
  colors: {
    shadow: "black",
    mutedForeground: getTheme("light").colors.background,
  },
  typography: { sans: "Inter, system-ui, sans-serif" },
  borderWidth: { strong: 0 },
});
```

`brokenFailures` then carries all four kinds; its comment becomes *"All four
checks report through one call, in colour → typeface → contrast → metric
order."*

### 3.5 New `packages/tokens/src/typeface.example.ts`

```ts
import {
  extendTheme,
  getTheme,
  themeTypefaceFailures,
} from "./index.js";

/** A copied theme with the CSS habit: one string, several families. */
export const stackedTheme = extendTheme(getTheme("light"), {
  typography: { sans: "Inter, system-ui, sans-serif" },
});

/** Both fields are checked; only `sans` carries the stack. */
export const stackedFailures = themeTypefaceFailures(stackedTheme);

/** An installed family with a space in its name is one family, and passes. */
export const installedTheme = extendTheme(getTheme("dark"), {
  typography: { sans: "Helvetica Neue" },
});

/** The empty array a usable brand theme earns. */
export const installedFailures = themeTypefaceFailures(installedTheme);
```

### 3.6 New `packages/tokens/src/typeface.test.ts`

Header comment names the bug guarded: *"Before plan 385 a copied theme with
`typography.sans: "Inter, system-ui, sans-serif"` or an empty family passed
`themeColorFailures`, `themeContrastFailures`, `themeMetricFailures` and
`themeFailures` — every family check was about the shipped `platformTypes`
table, never about an edited theme."*

Cases (import `./typeface.example.js` too, so `examples.test.ts` is satisfied):

1. `reports a CSS stack as a single-family failure` — exactly
   `[{ role: "sans", rule: "single-family", value: "Inter, system-ui, sans-serif" }]`.
2. `reports an empty family` — `""` → one `non-empty` failure on `sans`.
3. `reports a whitespace-only family` — `"   "` → one `non-empty` failure.
4. `checks both fields` — a comma `mono` and an empty `sans` both reported, in
   `typefaceRoles` order.
5. `accepts a single installed family` — `"Helvetica Neue"` → `[]`.
6. `accepts the shipped system sentinel` — `getTheme("light")` → `[]`.
7. `passes every shipped identity theme, platform variant and recipe` — loop the
   same 20-set list `theme-check.test.ts` builds (`themeContrasts × themeModes`,
   real `platformNames × themeContrasts × themeModes`, `platformRecipeNames ×
   themeModes`) and expect `[]`.
8. `is invisible to the other three checks` — the stack theme returns `[]` from
   `themeColorFailures`, `themeContrastFailures` and `themeMetricFailures`, and
   `themeFailures` returns exactly `["typeface"]` kinds. This is the plan-383
   proof that a partial check cannot see it.
9. `uses the rule and role indexes` — every rule a failure carries is in
   `typefaceRules`, and every role in `typefaceRoles`; `typefaceRoles` equals the
   two family keys of `Typography` (built from `typography`, no retyped union).
10. `runs the executed example` — `stackedFailures` is the single-family failure,
    `installedFailures` is `[]`.

### 3.7 `packages/tokens/src/theme-check.test.ts`

- Import `themeTypefaceFailures`.
- `returns exactly the three checks' failures` → `…the four checks' failures…`,
  and the sum adds `themeTypefaceFailures(brokenTheme).length`.
- The kinds set becomes `["color", "typeface", "contrast", "metric"]` in both
  places it is asserted, and the order assertions insert
  `lastContrastBefore` as: `lastColor < firstTypeface`,
  `lastTypeface < firstContrast`, `lastContrast < firstMetric`.
- `names each failure's payload` gains
  `{ kind: "typeface", role: "sans", rule: "single-family", value: "Inter, system-ui, sans-serif" }`.
- New case `catches a typeface-only defect the contrast check alone passes`:
  a stack theme → `themeContrastFailures` `[]`, `kinds(themeFailures)` `["typeface"]`.
- Header comment: *"three checks"* → *"four checks (colour format, typeface,
  contrast and numeric metrics)"*.

### 3.8 `packages/tokens/src/docs.test.ts`

Add one describe after `docs/tokens.md colour format contract`:

```ts
describe("docs/tokens.md typeface contract", () => {
  it("names the check, the failure type and both indexes", () => {
    ["themeTypefaceFailures", "TypefaceFailure", "typefaceRoles", "typefaceRules"]
      .forEach((name) => {
        expect(markdown).toContain(name);
      });
  });

  it("states both rules from the index", () => {
    typefaceRules.forEach((rule) => {
      expect(markdown).toContain(`\`${rule}\``);
    });
  });

  it("states why the runtime needs one family", () => {
    expect(markdownProse).toContain(
      "`StyleDesc.fontFamily` is **one** string, not a CSS stack",
    );
    expect(markdownProse).toContain("falls back silently");
  });

  it("names the check in the design-system's extension section", () => {
    // Read the section the same way the inventory guard reads its row.
    expect(designSystem).toContain("`themeTypefaceFailures`");
  });
});
```

`designSystem` is built like `markdown` in that file (`readFileSync` of
`../../../docs/design-system.md`); check whether the file already reads it and
reuse that constant rather than adding a second read.

### 3.9 `docs/tokens.md`

1. **`## Types` index** — insert three rows before `Typography`, alphabetically:

```
| `TypefaceFailure` | A family name that is not one non-empty family. |
| `TypefaceRole` | `sans` or `mono`, a key of `typefaceRoles`. |
| `TypefaceRule` | `non-empty` or `single-family`, a key of `typefaceRules`. |
```

   and change the `ThemeFailure` row's purpose to *"One defect from
   `themeFailures`, tagged `color`, `typeface`, `contrast` or `metric`."*

2. **New `#### Typeface` subsection** after `#### Colour format` (before
   `#### One check`), containing exactly:

   - the reason: `typography.sans`/`mono` are `StyleDesc.fontFamily`; GPUix
     0.10.0's `StyleDesc.fontFamily` is **one** string, not a CSS stack, and an
     unknown name falls back silently;
   - the two rules, naming `typefaceRules` and `typefaceRoles`;
   - the snippet (identical to the executed example's first half):

```ts
import {
  extendTheme,
  getTheme,
  themeTypefaceFailures,
} from "@gpuixui/tokens";

const stacked = extendTheme(getTheme("light"), {
  typography: { sans: "Inter, system-ui, sans-serif" },
});

themeTypefaceFailures(stacked);
// [{ role: "sans", rule: "single-family", value: "Inter, system-ui, sans-serif" }]
```

   - the two consequences: a comma stack names a family no machine has, so every
     label paints the fallback; a whitespace-only name names nothing. A name with
     spaces inside it (`Helvetica Neue`) is one family and passes, and the
     package does not check whether the machine has the face — the docs already
     say an unknown family falls back silently.
   - the reach: every shipped identity theme, platform variant and recipe passes,
     so no family moves; `platforms.test.ts` already holds the shipped platform
     table to the same form.

3. **`#### One check`** — *"Running one of the three checks"* → *"Running one of
   the four checks"*; the gap example gains the comma stack beside the zero ring
   and the `shadow` tint; the output comment becomes
   `// [ { kind: "color", … }, { kind: "typeface", … }, { kind: "metric", … } ]`;
   the order sentence becomes colour → typeface → contrast → metric; the
   `ThemeFailure` sentence names `TypefaceFailure`; *"composes all three"* →
   *"composes all four"*.

4. **Type facts paragraph** (around the `.SystemUIFont` sentence) gains one
   clause: *"`themeTypefaceFailures` holds an edited theme to that form."*

### 3.10 `docs/design-system.md` §11

Replace *"it composes the colour format, contrast and numeric metric checks"*
with the four, and replace *"The three parts are available on their own —
`themeColorFailures`, `themeContrastFailures` and `themeMetricFailures`"* with
the four names, adding one sentence: *"A family name is one non-empty family,
never a CSS comma stack: `StyleDesc.fontFamily` is a single string and an
unknown name falls back silently, so `themeTypefaceFailures` reports a stack or
an empty name that the other three checks cannot see."*

### 3.11 `packages/tokens/README.md`

In the guarantee section, add one paragraph beside the colour-format one:

> The two families are held to the form the runtime reads:
> `themeTypefaceFailures(theme)` reports a name that is empty or a CSS comma
> stack, because GPUix 0.10.0's `StyleDesc.fontFamily` is one string and an
> unknown name falls back silently. A copied theme with
> `sans: "Inter, system-ui, sans-serif"` used to pass every check and paint the
> system fallback; `typefaceRoles` and `typefaceRules` are the ordered indexes,
> and all 20 shipped sets pass.

And update any sentence that says the guarantee is three checks to four.

### 3.12 `packages/tokens/src/readme.test.ts`

Add one case:

```ts
it("states the typeface check and both rules", () => {
  expect(readme).toContain("`themeTypefaceFailures(theme)`");
  expect(readme).toContain(
    "GPUix 0.10.0's `StyleDesc.fontFamily` is one string",
  );
  expect(readme).toContain("`typefaceRoles` and `typefaceRules`");
});
```

### 3.13 `COMPONENTS.md`

1. New row after **Theme colour check**:

```
| Theme typeface check | done | yes (values in a `Theme`) | `themeTypefaceFailures(theme)` holds the two family names to the form the runtime reads — non-empty and one family, never a CSS comma stack — because GPUix 0.10.0's `StyleDesc.fontFamily` is one string and an unknown name falls back silently. `typefaceRoles` and `typefaceRules` are the ordered indexes; a copied theme whose `sans` is `"Inter, system-ui, sans-serif"` or `""` used to pass all three other checks and paint the system fallback. Every shipped identity theme, platform variant and recipe passes, so no family moves. Docs in `docs/tokens.md`; `typeface.test.ts` states both regressions. |
```

2. **Total theme check** row: *"composes `themeColorFailures`, `themeContrastFailures` and `themeMetricFailures`"* → four, in the documented order, and *"each is total over its own domain"* stays.

3. **Theme extension** row: wherever it says the guarantee is three checks
   (search *"three checks"*, *"all three"*), make it four.

### 3.14 `packages/tokens/src/inventory.test.ts`

- Rename `states the colour-format check beside the other two` →
  `beside the other format half`.
- Add:

```ts
it("states the typeface check and both indexes", () => {
  const typeface = row("Theme typeface check");
  expect(typeface).toContain("`themeTypefaceFailures(theme)`");
  expect(typeface).toContain("`typefaceRoles`");
  expect(typeface).toContain("`typefaceRules`");
  typefaceRules.forEach((rule) => {
    expect(typeface, rule).toContain(rule);
  });
});
```

  with `typefaceRules` imported from `./typeface.js`.

### 3.15 `TODO.md`, `.agents/slop/plans/README.md`

- Tick a new row in the design-tokens section, phrased as the defect:
  `[x]` *Hold a copied theme's family names to the form the runtime reads — ...*.
- Add the plan to the index table with status `done` and a one-paragraph
  summary in the prose block, matching the existing entries.

## 4. Test plan and both directions

Commands (from the workspace root unless stated):

1. `nub run --filter @gpuixui/tokens test` — expect every suite green,
   including the new `typeface.test.ts`.
2. `nub run check` — expect exit 0.
3. `nub run lint` — expect exit 0.
4. `nub run fmt` — expect exit 0 (run `nub run fmt:fix` first if it reports).

**Direction 1 — the rule can fail.** Temporarily change the comma branch in
`themeTypefaceFailures` to `false`:
`cd packages/tokens && nub exec vitest run src/typeface.test.ts`.
Expect the `single-family` cases (1, 4, 9, 10) to fail and the rest to pass.
Restore the line and re-run: green.

**Direction 2 — the composition can fail.** Temporarily delete the
`...themeTypefaceFailures(theme).map(…)` spread from `theme-check.ts` and run
`nub exec vitest run src/theme-check.test.ts`.
Expect the *"returns exactly the four checks' failures"*, the order assertion and
the typeface-only case to fail. Restore and re-run: green.

Note the exact outputs in the commit message; do not claim a run that did not
happen.

## 5. STOP conditions

Stop and report, without improvising, if:

- any shipped theme, platform variant or recipe fails the new check — that means
  a shipped family is not the form this plan assumed; record which one and do
  not change a shipped value to make the check pass without a new plan;
- the probe shows one of the "before" rows already returning a failure — the gap
  is smaller than described and the plan needs re-scoping;
- `public-types.test.ts` or the `docs.test.ts` value-coverage case fails for a
  name not listed in §3.9 — the API surface changed beyond this plan;
- a gate fails for a reason outside the files in §3 — report it;
- `themeFailures` cannot gain a fourth kind without breaking a consumer shape
  the plan did not name (the `ThemeFailure` union is public).

## 6. Acceptance criteria

- `themeTypefaceFailures` reports a comma stack and an empty/whitespace family,
  for both `sans` and `mono`, and accepts `"Helvetica Neue"` and `.SystemUIFont`.
- All 20 shipped sets return `[]`.
- `themeFailures` returns `kind: "typeface"` entries in
  colour → typeface → contrast → metric order and still returns `[]` for every
  shipped set.
- The type index, the value coverage, the README, both documents, the ledger and
  the index guard all name the new API; no doc claims "three checks".
- `nub run check`, `nub run lint` and `nub run test` pass, and both failing
  directions were observed and reported.

## 7. Cross-team

None. The check reads the `Theme` only; no consumer package needs a change,
because no shipped theme moves. A consumer with a comma stack starts failing
their own `themeFailures` assertion — which is the point: it is the line that
silently painted the wrong face.
