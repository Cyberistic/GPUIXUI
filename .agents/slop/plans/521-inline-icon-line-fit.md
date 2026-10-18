# Plan 521 — the inline icon must fit the line it sits in

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the package), 353 (component dimensions), 358 (the numeric contract), 367
(the type-scale contract), 370 (the weight rule), 372 (positive named sizes),
384 (content-box fit), 386 (body-line fit).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

The design system publishes an icon **alignment rule** in §6:

> An icon shares the horizontal flex row of the text it belongs to and is centred
> on the cross axis … Inline icons take `xs` so they do not raise the line box,
> control icons `md`, and toolbar or navigation icons `lg` or `xl`.

`scale.ts` names the two partners of that rule in the icon ladder itself:

```ts
  /** 12px — inline with caption text. */
  readonly xs: number;
  /** 14px — inline with label text. */
  readonly sm: number;
```

Nothing enforces it. `themeMetricFailures` holds the icon ladder to
`non-decreasing` and `positive` (plan 372) and holds `iconSize.md` inside the
smallest control's content box, but the two **inline** sizes are never compared
with the line box they sit in. The following probe on this branch returns `[]`
from every check:

```ts
const cramped = extendTheme(getTheme("light"), {
  // 17 × 18 × 18: the icon ladder still ascends and `md` still fits the control.
  iconSize: { xs: 17, sm: 18, md: 18 },
});
```

`lightTheme.typography.caption` is `{ fontSize: 12, lineHeight: 16 }`, so a 17px
inline glyph is taller than the 16px line box it shares with a caption. The
component centres the icon on the cross axis of a 16px row: the row grows to
17px and every caption line beside a glyph moves. The same edit with
`caption.lineHeight: 11` and `caption.fontSize: 10` does the same without
touching the icon. The second inline size is ungoverned too: `sm` is 14 against
a `label` line of 18, so a theme that raises it to 19 (and `md` to 19, keeping
the ladder ascending) passes every check while a label icon raises its line.

| check | failures for the probe theme |
| ----- | ---------------------------- |
| `themeColorFailures` | 0 |
| `themeTypefaceFailures` | 0 |
| `themeContrastFailures` | 0 |
| `themeTextTierFailures` | 0 |
| `themeDirectionFailures` | 0 |
| `themeMetricFailures` | **0** |

The metric contract exists to report exactly this class: a number a component
paints with that makes a control unusable. A glyph that outgrows its line box
does not paint a larger icon; it reflows the row it is in.

## 2. Decision

1. **Two `at-most` rules, no new rule name.** The failure is
   `iconSize/xs` and `iconSize/sm` with the existing `at-most` rule (already
   emitted by `weighable`), so `metricRules` stays the same nine values and the
   rule index, the tables and the counts in the docs stay true.
2. **The bounds are the theme's own line boxes**, not house literals:
   `iconSize.xs <= typography.caption.lineHeight` and
   `iconSize.sm <= typography.label.lineHeight`. A brand that raises its
   caption leading gets a taller allowance; a brand that raises its inline icons
   must raise the leading with them. This is the coupling plan 386 established
   between `density` and `typography`.
3. **Equality passes.** The rule is "does not raise the line box", so an icon
   exactly the height of its line box is legal; `atMost` is `<=`. A zero-size
   icon stays a separate `positive` failure from plan 372.
4. **No shipped value moves.** Every shipped theme, platform variant and recipe
   shares the identity type scale (`caption` 16, `label` 18) and the icon scale
   (12, 14); 12 ≤ 16 and 14 ≤ 18. Only `structure` on a copied platform style
   can move either, and no shipped style names `typography` or `iconSize` in
   `structure`.
5. **The documents state the check beside the rule.** The catalogue, the design
   system, the README and the ledger already state the alignment rule; each
   gains the sentence that the metric contract now enforces it.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

After the `iconSize` ladder block (the `...ladder("iconSize", …)` call that ends
with `"positive"`) insert:

```ts
    // An inline icon is painted inside the line box of the text it sits with
    // (`scale.ts`: `xs` is inline with a caption, `sm` with a label). A glyph
    // taller than the line raises the row it is centred in, so the two inline
    // sizes are bounded by the theme's own leading — not by a house literal.
    ...atMost("iconSize", "xs", iconSize.xs, typography.caption.lineHeight),
    ...atMost("iconSize", "sm", iconSize.sm, typography.label.lineHeight),
```

Update the `themeMetricFailures` JSDoc bullet **iconSize**, **avatarSize** from

> named ladders of positive sizes — a zero size paints no icon or identity mark —
> and the default icon fits the smallest control.

to

> named ladders of positive sizes — a zero size paints no icon or identity mark;
> the default icon fits the smallest control, and an inline icon fits the line
> box it shares with text (`xs` a `caption` line, `sm` a `label` line), because
> a taller glyph raises that line.

### 3.2 `packages/tokens/src/inline-icon.example.ts` (new)

```ts
/**
 * An inline icon taller than the caption line it sits in: the colour, typeface,
 * contrast, hierarchy and direction checks are empty, and the numeric one names
 * the raised line. The icon ladder still ascends and the default control icon
 * still fits, so the only defect is the glyph outgrowing its line box.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const crampedInlineIcon = extendTheme(getTheme("light"), {
  iconSize: { xs: 17, sm: 18, md: 18 },
});
export const crampedInlineIconFailures = themeMetricFailures(crampedInlineIcon);
```

### 3.3 `packages/tokens/src/inline-icon-fit.test.ts` (new)

Header comment names the bug guarded: *“Before plan 521 the numeric contract held
`iconSize` to a positive, non-decreasing ladder but never compared the two inline
sizes with the line boxes they share (scale.ts: `xs` inline with a caption, `sm`
with a label). A theme with `iconSize.xs` 17 returned `[]` from every check while
a caption's 16px line box grew to hold the glyph, and a theme with a tighter
`caption.lineHeight` failed the same way with the shipped icon.”*

Cases (use `@effect`-free plain `vitest` like the neighbouring contract suites):

1. **`reports a caption icon taller than its line`** — the executed example
   returns exactly one failure:
   `{ group: "iconSize", member: "xs", rule: "at-most", actual: 17, bound: 16 }`.
2. **`reports a label icon taller than its line`** — `extendTheme(getTheme("light"), { iconSize: { sm: 19, md: 19 } })`
   returns exactly one failure:
   `{ group: "iconSize", member: "sm", rule: "at-most", actual: 19, bound: 18 }`.
   (The ladder stays `12 ≤ 19 ≤ 19 ≤ 20 ≤ 24`; `md` 19 + two 1px borders is 21,
   inside the 28px `sm` control.)
3. **`allows an icon exactly the height of its line`** — a theme with
   `caption: { fontSize: 12, lineHeight: 12 }` and the shipped `xs` 12 returns
   `[]`; raising `xs` to 13 without the leading returns one failure with
   `bound: 12`. This is the equality boundary and the theme-read bound in one
   case.
4. **`reads the theme's own leading, not the shipped one`** — a theme with
   `caption: { fontSize: 10, lineHeight: 11 }` and `iconSize.xs` 12 returns one
   `at-most` failure with `bound: 11`, and its typography rules still pass
   (`lineHeight 11 >= fontSize 10`, caption remains the smallest prose size).
5. **`is invisible to the other checks`** — the cramped theme returns `[]` from
   `themeColorFailures`, `themeTypefaceFailures`, `themeContrastFailures`,
   `themeTextTierFailures` and `themeDirectionFailures`, and `themeFailures`
   returns exactly one entry with `kind: "metric"`. This states the plan-383
   guarantee that a partial check cannot see it.
6. **`passes every shipped set`** — map `shippedThemes` and expect `[]` from
   `themeMetricFailures` for each. Do not rebuild the shipped list by hand (plan
   388's guard fails a suite that claims “every shipped set” without the
   enumeration).

The example is executed by case 1, so `examples.test.ts` and this suite both
prove it runs.

### 3.4 `docs/tokens.md` — numeric contract paragraph

After the sentence that says `iconSize` and `avatarSize` must stay above zero,
insert:

> The two inline sizes are bounded by the line box they share with text —
> `iconSize.xs` by `typography.caption.lineHeight` and `iconSize.sm` by
> `typography.label.lineHeight` (`scale.ts` names those partners) — because a
> glyph taller than its line raises the row the icon is centred in, while the
> colour, typeface and contrast checks stay empty.

### 3.5 `docs/design-system.md` §9 — metric paragraph

Change

> shrink the smallest control below one label line or one body line plus its
> borders

to

> shrink the smallest control below one label line or one body line plus its
> borders, raise an inline icon above the caption or label line it sits in

### 3.6 `packages/tokens/README.md` — *Checking the numbers*

Change

> fit an icon, a field adornment or a chip into a content box shorter or narrower
> than they are

to

> fit an icon, a field adornment or a chip into a content box shorter or narrower
> than they are, raise an inline icon above the caption or label line it sits in

### 3.7 `COMPONENTS.md` — **Theme metric check** row

Change

> shrink the smallest control below one label line or one body line, clip a row
> below the default `md` control it holds

to

> shrink the smallest control below one label line or one body line, raise an
> inline icon above the caption or label line it sits in, clip a row below the
> default `md` control it holds

No count changes: the row names ten groups and nine rules, both unchanged.

### 3.8 `TODO.md` — design-tokens section

Add and tick:

```
`[x]` Hold an inline icon to its line box — `iconSize` was a positive,
non-decreasing ladder, but `scale.ts` describes `xs` as inline with a caption and
`sm` with a label and the design system says inline icons "do not raise the line
box"; a theme with `iconSize.xs` 17, or with a tighter `caption.lineHeight`,
returned `[]` from every check while a caption line grew to hold the glyph. Two
`at-most` rules bound the inline sizes by the theme's own leading; every shipped
set passes and no value moves (plan 521)
```

### 3.9 `.agents/slop/plans/README.md`

Add to the plan table:

| [521](./521-inline-icon-line-fit.md) | The inline icon must fit its line box | F | 353, 358, 367, 372, 384, 386 | done |

and a closing paragraph in the prose block that summarises §1–§2: the two
`at-most` rules, the measured probe, the equality boundary, and that no shipped
value moves.

## 4. Test plan and both directions

Commands, from the workspace root:

1. `nub run --filter @gpuixui/tokens test` — every suite green, including the
   new `inline-icon-fit.test.ts`, and `examples.test.ts` green because the new
   example is imported by it.
2. `nub run check` — exit 0.
3. `nub run lint` — exit 0.
4. `nub run fmt` — exit 0 (run `nub run fmt:fix` first if it reports).

**Direction 1 — the rule can fail.** Temporarily delete the two `atMost` lines
from `metrics.ts` and run, from `packages/tokens`:
`nub exec vitest run src/inline-icon-fit.test.ts`.
Expect cases 1, 2, 4, 5 and the second half of case 3 to fail; restore the lines
and re-run: green.

**Direction 2 — the shipped values pass it.** With the fix in place, run the same
file; the `passes every shipped set` case must be green. A shipped set that
fails means the plan's assumption is wrong: STOP, do not move a token to satisfy
the check.

Record the exact command output in the commit message; do not claim a run that
did not happen.

## 5. STOP conditions

Stop and report, without improvising, if:

- any shipped identity theme, platform variant or recipe fails a new bound —
  record which set, its `iconSize.xs`/`sm` and `caption`/`label` leading, and do
  not change a shipped value without a new plan;
- the probe already reports a failure today — the gap is smaller than described
  and the plan needs re-scoping;
- `metricRules` or the docs' rule counts would have to change — they must not;
  the rule is `at-most`, already published;
- another suite asserts the old behaviour (grep `iconSize` in
  `metrics.test.ts`, `positive-sizes.test.ts`, `docs.test.ts`); update only a
  case whose meaning this rule genuinely changes, and report any other;
- `themeFailures` cannot surface the new failures as `kind: "metric"`;
- a gate fails for a reason outside the files in §3 — report it.

## 6. Acceptance criteria

- `themeMetricFailures` reports an `iconSize.xs` taller than
  `typography.caption.lineHeight` and an `iconSize.sm` taller than
  `typography.label.lineHeight`, with the theme's own bound in the failure.
- Equality passes, and a theme that lowers its leading below its inline icon is
  reported without a second typography failure.
- Every shipped theme, platform variant and recipe still returns `[]`; no
  colour, family, pair, floor or token value moves.
- The new suite proves the rule can fail, the theme-read bound, the equality
  boundary, the other checks' blindness and the executed example.
- The catalogue, the design system, the README and the ledger state the rule;
  `metricRules` stays the same nine values.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

None. The rule reads the `Theme` only. A consumer theme whose inline glyph is
larger than its leading starts failing its own `themeFailures` assertion, which
is the point; the component side already follows the alignment rule in §6 of the
design system.
