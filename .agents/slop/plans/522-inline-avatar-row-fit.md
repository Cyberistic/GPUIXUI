# Plan 522 — an inline avatar must fit the dense row it leads

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the package), 054 (`avatarSize`), 358 (the numeric contract), 360 (a row
holds the default control), 372 (positive named sizes), 386 (body-line fit), 521
(the inline icon's line box).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`scale.ts` names the partner of the smallest avatar tier in the ladder itself:

```ts
export interface AvatarSize {
  /** 20px — inline with a dense row. */
  readonly xs: number;
  /** 26px. */
  readonly sm: number;
  /** 32px — the default. */
  readonly md: number;
  /** 40px — profile headers and detail panes. */
  readonly lg: number;
}
```

The component side of that sentence is real and already shipped: a
`ListItem`'s leading slot is documented as an avatar slot, and a dense row has a
**fixed** height.

`packages/components/src/list.tsx` (read-only evidence from the `components`
worktree):

```tsx
  /** Slot before the text: an avatar, an icon. */
  readonly leading?: ReactNode;
```

```tsx
          height: dense
            ? theme.density.rowHeight
            : theme.density.rowHeight + theme.spacing.md,
```

So the smallest row the library ships is exactly `density.rowHeight`, and the
mark in it is `avatarSize.xs`. Nothing in the numeric contract relates the two.
`themeMetricFailures` holds the avatar ladder to `non-decreasing` and `positive`
(plan 372) and holds `radius.full` to half of the largest avatar (plan 361), but
the **inline** tier is never compared with the row it sits in. The following
probe on this branch returns `[]` from all six checks:

```ts
const tallAvatar = extendTheme(getTheme("light"), {
  // The whole ladder moves together, so no other ladder rule fires.
  avatarSize: { xs: 40, sm: 44, md: 48, lg: 52 },
});
```

`lightTheme.density.rowHeight` is 32, and the compact platform variants (macOS,
Windows XP) ship 28 — both smaller than the 40px "inline" avatar. The row's
height is fixed, so the mark cannot fit inside it: it is centred on a box
shorter than itself (`alignItems: "center"`), paints outside the row's bounds and
overlaps the rows above and below, or is clipped by whatever clips the list. A
40px avatar is not an inline row mark; it is a `lg` profile mark.

| check | failures for the probe theme |
| ----- | ---------------------------- |
| `themeColorFailures` | 0 |
| `themeTypefaceFailures` | 0 |
| `themeContrastFailures` | 0 |
| `themeTextTierFailures` | 0 |
| `themeDirectionFailures` | 0 |
| `themeMetricFailures` | **0** |

The metric contract exists to report exactly this class: a number a component
paints with that makes a control unusable. This is the row half of the rule plan
521 shipped for the line box — an inline glyph must not outgrow the line it
shares, and an inline identity mark must not outgrow the row it leads.

## 2. Decision

1. **One `at-most` rule, no new rule name.** The failure is
   `avatarSize/xs` with the existing `at-most` rule (already emitted by
   `weighable` and the two icon rules), so `metricRules` stays the same nine
   values and the rule index, the tables and the counts in the documents stay
   true.
2. **The bound is the theme's own row, not a house literal:**
   `avatarSize.xs <= density.rowHeight`. A brand that runs a roomier density
   gets a taller allowance; a brand that raises its inline avatar must raise the
   row with it. This is the coupling plan 386 established between `density` and
   `typography`, and plan 521 between `typography` and `iconSize`.
3. **Equality passes.** The rule is "the mark fits the row", so an avatar exactly
   the height of a dense row is legal; `atMost` is `<=`. A zero-size avatar stays
   a separate `positive` failure from plan 372.
4. **Only the `xs` tier is bounded.** `scale.ts` documents `xs` as the inline
   tier and the other three as a facepile size, the default and a profile mark;
   the ledger's dense row also holds `controlHeight.md`, so bounding `md` by
   `rowHeight` would reject the shipped macOS compact variant (28px row, 32px
   default avatar) and turn a designed composition into a failure. The plan
   records the `md`-in-a-dense-row question as a cross-team note (§6) instead of
   a rule.
5. **No shipped value moves.** Every shipped theme, platform variant and recipe:
   `xs` is 20, and `rowHeight` is 28 (macOS, Windows XP) or 32 (identity, Linux,
   Windows, Aero). 20 ≤ 28 with margin.
6. **The documents state the check beside the rule.** The catalogue, the design
   system (§6 and the §9 numeric paragraph), the README and the ledger each gain
   the sentence, and a docs case holds the phrasing to the implementation.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

After the `avatarSize` ladder block — the `...ladder("avatarSize", …, "positive")`
call that ends the avatar group — insert:

```ts
    // The `xs` tier is the inline avatar (`scale.ts`): a dense `ListItem` fixes
    // its height at `density.rowHeight` and documents its leading slot for an
    // avatar, so a mark taller than the row cannot fit the row it leads.
    ...atMost("avatarSize", "xs", avatarSize.xs, density.rowHeight),
```

In the `themeMetricFailures` JSDoc bullet **iconSize**, **avatarSize**, change

> named ladders of positive sizes — a zero size paints no icon or identity mark;
> the default icon fits the smallest control, and an inline icon fits the line
> box it shares with text (`xs` a `caption` line, `sm` a `label` line), because
> a taller glyph raises that line.

to

> named ladders of positive sizes — a zero size paints no icon or identity mark;
> the default icon fits the smallest control, and an inline icon fits the line
> box it shares with text (`xs` a `caption` line, `sm` a `label` line), because
> a taller glyph raises that line. The inline avatar tier (`xs`) fits a dense
> row (`density.rowHeight`), because a `ListItem` fixes that row's height and
> documents its leading slot for an avatar.

### 3.2 `packages/tokens/src/inline-avatar.example.ts` (new)

```ts
/**
 * An inline avatar taller than the dense row it leads: the colour, typeface,
 * contrast, hierarchy and direction checks are empty, and the numeric one names
 * the raised row. The whole avatar ladder moves together and `radius.full`
 * still rounds the largest tier, so the only defect is the mark outgrowing its
 * row.
 */
import { extendTheme, getTheme, themeMetricFailures } from "./index.js";

export const tallInlineAvatar = extendTheme(getTheme("light"), {
  avatarSize: { xs: 40, sm: 44, md: 48, lg: 52 },
});
export const tallInlineAvatarFailures = themeMetricFailures(tallInlineAvatar);
```

### 3.3 `packages/tokens/src/inline-avatar-row-fit.test.ts` (new)

Header comment states the bug being guarded, quoting §1: `scale.ts` calls `xs`
the inline tier, `ListItem` fixes a dense row at `density.rowHeight` and its
`leading` slot is documented for an avatar, and the contract never compared
them; a whole-raised avatar ladder returned `[]` from every check.

Cases:

1. **`reports an inline avatar taller than a dense row`** — the example's
   `tallInlineAvatarFailures` equals
   `[{ group: "avatarSize", member: "xs", rule: "at-most", actual: 40, bound: 32 }]`.
   This executes the example.
2. **`reads the theme's own row, not the shipped one`** — `extendTheme(getTheme("dark"), { density: "compact" })`
   has `rowHeight` 28, so `avatarSize: { xs: 40, sm: 44, md: 48, lg: 52 }` over
   that base fails with `bound: 28`, proving the bound follows the density.
3. **`allows an avatar exactly the height of the row`** — a theme whose
   `rowHeight` equals its `xs` (e.g. `density: { rowHeight: 24 }` with
   `avatarSize.xs` set to 24 and the ladder above it) returns `[]` from
   `themeMetricFailures`; one point over returns one failure. Note: `rowHeight`
   is also held to `controlHeight.md` (plan 360), so the equality case must be
   built by lowering the whole density (`compact` control heights 24/28/32 →
   `rowHeight` 28) **or** by raising `avatarSize.xs` to the row. Use the
   compact preset and `avatarSize: { xs: 28, sm: 30, md: 32, lg: 40 }`, which
   leaves `radius.full ≥ 20` and every other rule green.
4. **`is invisible to the other checks`** — `tallInlineAvatar` returns `[]` from
   `themeColorFailures`, `themeTypefaceFailures`, `themeContrastFailures`,
   `themeTextTierFailures` and `themeDirectionFailures`, and `themeFailures`
   returns exactly one entry with `kind: "metric"`. This is the plan-383
   guarantee that one check alone cannot see the defect.
5. **`passes every shipped set`** — map `shippedThemes` and expect `[]` from
   `themeMetricFailures`. Do not rebuild the list by hand (plan 388's guard).

### 3.4 `docs/tokens.md` — borders, icons and avatars

After

> Icon and avatar sizes are fixed tiers read by name, not density-dependent
> metrics: a 26px person chip is not a density decision.

insert:

> The smallest tier is the inline avatar: `avatarSize.xs` sits in a dense row,
> which `ListItem` fixes at `density.rowHeight`, so the metric contract bounds
> it by that row. The other three tiers are a facepile mark, the default and a
> profile header; they are not row marks.

### 3.5 `docs/tokens.md` — the numeric contract paragraph

After the inline-icon sentence

> the two inline icon sizes are bounded by the line box they share with text —
> `iconSize.xs` by `typography.caption.lineHeight` and `iconSize.sm` by
> `typography.label.lineHeight` … while the colour, typeface and contrast
> checks stay empty;

insert:

> the inline avatar tier is bounded the same way by the row it leads —
> `avatarSize.xs` by `density.rowHeight` — because a dense `ListItem` fixes its
> height at that value and its leading slot carries an avatar or an icon, so a
> person mark taller than the row cannot fit it;

### 3.6 `docs/design-system.md` §6 — icon and avatar tiers

After the alignment paragraph (the one ending "the design system owns the size
tier and the alignment"), insert:

> The inline avatar follows the same rule one row over: `avatarSize.xs` is
> bounded by `density.rowHeight`, because a dense `ListItem` fixes its height at
> `rowHeight` and documents its leading slot for an avatar. A mark taller than
> the row it leads is not inline; the `md` tier is the default face for a card
> header or a message, not a row mark.

### 3.7 `docs/design-system.md` §9 — the numeric paragraph

Change

> shrink the smallest control below one label line or one body line plus its
> borders, raise an inline icon above the caption or label line it sits in, clip a
> row

to

> shrink the smallest control below one label line or one body line plus its
> borders, raise an inline icon above the caption or label line it sits in, raise
> an inline avatar above the dense row it leads, clip a row

### 3.8 `packages/tokens/README.md` — *Checking the numbers*

Change

> raise an inline icon above the caption or label line it sits in,

to

> raise an inline icon above the caption or label line it sits in, raise an
> inline avatar above the dense row it leads,

### 3.9 `COMPONENTS.md` — **Theme metric check** row

Change

> raise an inline icon above the caption or label line it sits in,

to

> raise an inline icon above the caption or label line it sits in, raise an
> inline avatar above the `rowHeight` of the dense row whose leading slot
> carries it,

No count changes: the row names ten groups and nine rules, both unchanged.

### 3.10 `packages/tokens/src/inventory.test.ts`

In the existing `describe("COMPONENTS.md design-system rows")`, add:

```ts
  it("names the inline avatar's row bound", () => {
    const metrics = row("Theme metric check");
    expect(metrics).toContain("`rowHeight`");
    expect(metrics).toContain("inline avatar");
  });
```

### 3.11 `packages/tokens/src/docs.test.ts`

Add a case to the numeric-tables describe block:

```ts
  it("states the inline avatar's row bound", () => {
    const prose: ReadonlyArray<readonly [string, string]> = [
      ["docs/tokens.md", markdownProse],
      ["docs/design-system.md", designSystem],
      ["packages/tokens/README.md", readmeSource.replace(/\s+/g, " ")],
    ];

    prose.forEach(([file, text]) => {
      expect(text, file).toContain("inline avatar");
    });
    [markdownProse, designSystem].forEach((text) => {
      expect(text).toContain("`density.rowHeight`");
    });
  });
```

The README names the rule but not the token, so only the two pages are held to
`density.rowHeight`. Keep the case structural — role names, not numbers — so a
density edit does not break a sentence.

### 3.12 `.agents/slop/plans/README.md`

Add to the plan table, after 521:

| [522](./522-inline-avatar-row-fit.md) | The inline avatar must fit the dense row it leads | F | 054, 358, 360, 372, 386, 521 | done |

and a closing prose paragraph summarising §1–§2: the measured probe, the one
`at-most` rule, the `xs`-only scope with the reason `md` is out, and that no
shipped value moves.

### 3.13 `TODO.md` — design-tokens section

Add and tick:

```
`[x]` Hold an inline avatar to the dense row it leads — `scale.ts` calls
`avatarSize.xs` the inline tier and `ListItem` fixes a dense row at
`density.rowHeight` with its leading slot documented for an avatar, but the
contract never compared them; a theme whose whole avatar ladder rose to
40/44/48/52 returned `[]` from all six checks while the 40px mark could not fit
a 28–32px row. One `at-most` rule bounds `xs` by the theme's own row; the other
three tiers stay unbounded because `md` in a dense row is a composition
decision, not a size error. Every shipped set passes and no value moves
(plan 522)
```

Bump the section bar from `185/247` to `186/248`.

## 4. Test plan and both directions

Commands, from the workspace root:

1. `nub run --filter @gpuixui/tokens test` — every suite green, including the
   new `inline-avatar-row-fit.test.ts`, and `examples.test.ts` green because the
   new example is imported by it.
2. `nub run check` — exit 0.
3. `nub run lint` — exit 0.
4. `nub run fmt` — exit 0 (run `nub run fmt:fix` first if it reports).

**Direction 1 — the rule can fail.** Temporarily delete the `atMost` line from
`metrics.ts` and run, from `packages/tokens`:
`nub exec vitest run src/inline-avatar-row-fit.test.ts`.
Expect cases 1, 2, 3 (the one-over half) and 4 to fail; restore the line and
re-run: green.

**Direction 2 — the shipped values pass it.** With the fix in place, run the same
file; the `passes every shipped set` case must be green. A shipped set that
fails means the plan's assumption is wrong: STOP, do not move a token to satisfy
the check.

Record the exact command output in the commit message; do not claim a run that
did not happen.

## 5. STOP conditions

Stop and report, without improvising, if:

- any shipped identity theme, platform variant or recipe fails the new bound —
  record which set, its `rowHeight` and `avatarSize.xs`, and do not change a
  shipped value without a new plan;
- the probe already reports a failure today — the gap is smaller than described
  and the plan needs re-scoping;
- `metricRules` or the documents' rule counts would have to change — they must
  not; the rule is `at-most`, already published;
- another suite asserts a failure list that this rule changes (grep `avatarSize`
  and `rowHeight` in `metrics.test.ts`, `positive-sizes.test.ts`,
  `theme-merge.test.ts`, `platform-extension.test.ts`); update only a case whose
  meaning this rule genuinely changes, and report any other;
- `themeFailures` cannot surface the new failure as `kind: "metric"`;
- a gate fails for a reason outside the files in §3 — report it.

## 6. Cross-team note (do not implement here)

`components` owns the composition this rule describes. A dense `ListItem`
(`theme.density.rowHeight`, 28 on macOS and XP) with the **default** `md` avatar
(32) already overflows today; the token cannot fix that by bounding `md`, because
`md` is the default face for card headers and messages too. If the library wants
a default-sized avatar in a dense row, the row grows to `rowHeight + spacing.md`
(the non-dense height) or the component in that slot takes `xs`. Record it under
`TODO.md` only if a shipped example paints it; the audit here found the
`components` list example painting a caption glyph, not an avatar, in the leading
slot.

## 7. Acceptance criteria

- `themeMetricFailures` reports an `avatarSize.xs` taller than
  `density.rowHeight`, with the theme's own row as the bound.
- Equality passes, and the bound follows a compact density (28) rather than the
  shipped comfortable one (32).
- Every shipped theme, platform variant and recipe still returns `[]`; no
  colour, family, pair, floor or token value moves.
- The new suite proves the rule can fail, the theme-read bound, the equality
  boundary, the other checks' blindness and the executed example.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md`, `TODO.md` and the plan index all state the rule, and the docs
  and ledger guards fail if the sentence disappears.
