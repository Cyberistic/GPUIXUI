# Plan 568 — the largest and smallest are the theme's own

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
361 (`full` joined the avatar bound), 372 (a named size is a positive size),
531 (`metricMembers` is the walked domain), 552 (every size ladder walks the
theme's own scale), 554 (surface metrics and border widths walk the group),
566 (a defined `overlay` joined the feather ladder).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

Plans 552 and 554 made the numeric contract total over the theme's **own** group
values: a step a brand adds to `spacing`, `radius`, `iconSize`, `avatarSize`,
`controlHeight` or `controlPaddingX` is walked, order-checked and
finite-checked. Four rules were not migrated with them. Each one reads the
**shipped member's name** while its documentation says "largest" or "smallest":

| Rule in `metrics.ts` | Reads | Documentation says |
| -------------------- | ----- | ------------------ |
| `radius.full ≥ radius.xl` | shipped `xl` | "must round the largest radius" (`docs/tokens.md` §Numeric metrics) |
| `radius.full ≥ density.controlHeight.lg / 2` | shipped `lg` | "half of the taller of the largest control and the largest avatar" (same paragraph); "half of the larger of the largest control and the largest avatar" (`docs/design-system.md` §7) |
| `radius.full ≥ avatarSize.lg / 2` | shipped `lg` | same two sentences |
| `avatarPresenceDotSize ≤ avatarSize.xs / 2` | shipped `xs` | "at most half the smallest avatar" (`docs/design-system.md` §6, the dimensions table in `docs/tokens.md`, and the JSDoc) |

A theme can carry a wider scale: `extendTheme` copies the group, a copy that
passed through JSON or a spread keeps every key, and plans 531/552 already treat
that as a supported shape (the ladder and finite rules walk it). Measured on this
branch, each of these edits returns `[]` from `themeMetricFailures` today:

```ts
// 1. A brand adds a 80px avatar; its pill radius stays at 20 (half of the
//    shipped 40px `lg`), so the new avatar paints as a rounded square.
extendTheme(getTheme("light"), {
  avatarSize: { ...avatarSize, xl: 80 },
  radius: { full: 20 },
});

// 2. A brand adds a 48px control; `full` 20 is short of 24, so it is a
//    rounded square at the largest control.
extendTheme(getTheme("light"), {
  density: { controlHeight: { ...densityPresets.comfortable.controlHeight, xl: 48 } },
  radius: { full: 20 },
});

// 3. A brand adds a 24px corner step; `full` 20 no longer rounds it.
extendTheme(getTheme("light"), {
  radius: { ...radius, "2xl": 24, full: 20 },
});

// 4. A decoded theme orders an 8px avatar before the shipped tiers; the 10px
//    presence dot is larger than half of it. (The builder appends an added key,
//    so this shape arrives as a copied `Theme` value, the boundary the docs
//    name for a theme loaded from a file.)
({ ...lightTheme, avatarSize: { xxs: 8, ...avatarSize } });
```

The builder appends a key after the shipped ones, so case 4 is constructed as a
`Theme` value: a decoded or copied scale can order the smaller tier first and the
ladder still passes.

This is the same defect class as plan 552 (a hand-typed member name standing in
for an extreme) and plan 361 (`full` was bounded by the largest control but not
the largest avatar). The consequence is real, if narrow: the contract's own
sentence — and the design system's — is false for the one kind of theme they
invite, a brand with a wider scale.

No shipped theme carries an extra step, so **no shipped value, pair, floor or
metric moves**. The fix changes only which values the bounds read.

## 2. Decision

Derive each extreme from the theme's own group, by value, not by insertion
order:

- `largestCorner` — the largest numeric `radius` member excluding `none` and
  `full` (the same exclusion the ladder uses).
- `largestControl` — the largest numeric `density.controlHeight` member.
- `largestAvatar` / `smallestAvatar` — the largest and smallest numeric
  `avatarSize` members.

`Math.min`/`Math.max` over values, so a decoded scale whose keys are in any order
still yields the same extreme. A non-finite member is skipped here: the finite
rule already reports it, and a comparison against it must not blame `full` or
the dot (the "one cause, one diagnostic" rule plan 532 established). A non-positive
extreme is skipped through the existing `usableBound` guard, because the positive
rule is already its diagnostic.

An **unordered** scale yields no extreme. The first cut derived the minimum of
`avatarSize` from every value, and `scale-ladder-totality.test.ts`'s case that
appends `xl: 1` then produced a second failure on the presence dot (bound
`0.5`) beside the ladder failure — one broken step blamed on a different rule.
A shape bound derived from a scale whose order is already a diagnostic is not a
shape the theme designed, so `orderedScale` gates the derivation and the ladder
failure stays the one report. This also keeps the `radius` check on the same
exclusions its ladder uses (`none`/`full`).

Rejected alternatives:

- **Keep the shipped names and soften the docs to "the largest shipped tier".**
  It would make the contract describe a narrower product than it ships: the
  ladder and finite rules already treat a widened scale as the theme's domain.
- **Use insertion order (`steps.at(-1)`).** A decoded or hand-ordered scale can
  put a smaller step last; only a value comparison is order-free.
- **Also derive the smallest control for the fit rules.** `controlSizes` is a
  fixed union (`sm`/`md`/`lg`) that every component requests by name, so "the
  smallest control" there means the smallest **supported** size, not the smallest
  key a theme happens to carry. Changing it would report a ladder's bad step
  twice and would rewrite `scale-ladder-totality.test.ts`'s exact expectation
  for no gain. The docs sentence keeps saying "smallest control"; this plan only
  touches the two shape bounds whose documentation says "largest"/"smallest".
- **Add a `source` member to `MetricFailure` naming which step set the bound.**
  The type is public and the payload is already enough to diagnose and fix;
  widening the contract for a diagnostic nicety is not justified.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts` — the helpers

Insert after `scaleSteps` (currently lines 368–370), before `sizeSteps`:

```ts
/**
 * The smallest or largest finite value a named scale the theme carries. A rule
 * that says "the largest avatar" or "the smallest avatar" means the theme's own
 * extreme, not the shipped member's name: `extendTheme` keeps a widened scale,
 * and the ladders walk it. A non-finite member is the finite rule's diagnostic,
 * so it is not compared here.
 */
const extremeSize = (
  scale: unknown,
  kind: "smallest" | "largest",
  excluded: ReadonlyArray<string> = [],
): number | undefined =>
  scaleSteps(scale)
    .flatMap(([member, value]) =>
      excluded.includes(member) || !Number.isFinite(value) ? [] : [value],
    )
    .reduce<number | undefined>(
      (extreme, value) =>
        extreme === undefined
          ? value
          : kind === "smallest"
            ? Math.min(extreme, value)
            : Math.max(extreme, value),
      undefined,
    );

/**
 * Whether a named scale is ordered as its ladder rule requires. A shape bound
 * derived from a broken scale would blame `full` or the presence dot for the
 * scale's own defect, so an unordered scale yields no extreme (the ladder
 * failure is the diagnostic).
 */
const orderedScale = (
  scale: unknown,
  excluded: ReadonlyArray<string> = [],
): boolean => {
  const steps = scaleSteps(scale).filter(
    ([member]) => !excluded.includes(member),
  );
  return steps.every(([, value], index) => {
    const previous = steps[index - 1];
    return (
      previous === undefined ||
      !Number.isFinite(value) ||
      !Number.isFinite(previous[1]) ||
      value >= previous[1]
    );
  });
};
```

### 3.2 `packages/tokens/src/metrics.ts` — the four bounds

In `themeMetricFailures`, immediately after the destructuring block (currently
ends at line 521), add:

```ts
  // The shape bounds name an extreme, not a shipped member: a copied scale may
  // carry a larger corner, control or avatar, or a smaller avatar, and the
  // ladder rules already govern that member. A broken scale yields no bound, so
  // its ladder failure stays the one diagnostic.
  const largestCorner = orderedScale(radius, ["none", "full"])
    ? extremeSize(radius, "largest", ["none", "full"])
    : undefined;
  const largestControl = orderedScale(density.controlHeight)
    ? extremeSize(density.controlHeight, "largest")
    : undefined;
  const largestAvatar = orderedScale(avatarSize)
    ? extremeSize(avatarSize, "largest")
    : undefined;
  const smallestAvatar = orderedScale(avatarSize)
    ? extremeSize(avatarSize, "smallest")
    : undefined;
```

Replace the three `radius.full` lines (currently 663–665):

```ts
    ...atLeast("radius", "full", radius.full, radius.xl),
    ...atLeast("radius", "full", radius.full, density.controlHeight.lg / 2),
    ...atLeast("radius", "full", radius.full, avatarSize.lg / 2),
```

with:

```ts
    // `full` rounds the largest corner step the theme carries and half the
    // largest control and avatar it carries — not the shipped `xl`/`lg`.
    ...(usableBound(largestCorner)
      ? atLeast("radius", "full", radius.full, largestCorner)
      : []),
    ...(usableBound(largestControl)
      ? atLeast("radius", "full", radius.full, largestControl / 2)
      : []),
    ...(usableBound(largestAvatar)
      ? atLeast("radius", "full", radius.full, largestAvatar / 2)
      : []),
```

Replace the presence-dot bound (currently 785–795) with:

```ts
    // A presence dot sits on the smallest avatar's corner, so it may not be
    // larger than half that avatar — the smallest the theme carries, not the
    // shipped `xs`.
    ...(usableBound(smallestAvatar)
      ? atMost(
          "dimensions",
          "avatarPresenceDotSize",
          dimensions.avatarPresenceDotSize,
          smallestAvatar / 2,
        )
      : []),
```

The shipped values resolve to the same bounds: largest corner 12, largest
control 36/2 = 18, largest avatar 40/2 = 20, smallest avatar 20/2 = 10.

### 3.3 `packages/tokens/src/metrics.ts` — the JSDoc

Two bullets in `themeMetricFailures`' doc comment:

- **dimensions** (currently line 459–460): change "an avatar's presence dot is
  at most half the smallest avatar." to "an avatar's presence dot is at most
  half the smallest avatar the theme carries.".
- **radius** (currently line 468–470): change "`full` rounds the largest radius,
  half the largest control and half the largest avatar — a 40px avatar at a
  smaller radius is a rounded square." to "`full` rounds the largest corner step
  the theme carries, half the largest control and half the largest avatar — each
  read from the theme's own scale, so a brand that adds a step moves the bound,
  and a 40px avatar at a smaller radius is a rounded square.".

### 3.4 `docs/tokens.md` — three claims

1. In the dimensions table (currently line 1063), change the presence-dot row's
   description from "at most half `avatarSize.xs`" to "at most half the smallest
   avatar the theme carries". The rest of the row (`| \`dimensions.avatarPresenceDotSize\` | 10 | ... |`)
   is unchanged.
2. In the paragraph after the table (currently lines 1073–1076), change "at most
   half the smallest avatar, because it sits on that avatar's corner" to "at
   most half the smallest avatar the theme carries, because it sits on that
   avatar's corner".
3. In the numeric-metrics section (currently lines 1981–1983), change
   "`radius.full` must round the largest radius and half of the taller of the
   largest control and the largest avatar — a 40px avatar painted at a smaller
   radius is a rounded square, not a circle;" to "`radius.full` must round the
   largest corner step the theme carries and half of the taller of the largest
   control and the largest avatar — each read from the theme's own scale, so a
   step a brand adds moves the bound, and a 40px avatar painted at a smaller
   radius is a rounded square, not a circle;".

Do not restate any count; the section's counts are owned by other guards.

### 3.5 `docs/design-system.md` — two claims

1. §6's presence sentence (currently lines 245–248) ends "— at most half the
   smallest avatar." Change it to "— at most half the smallest avatar the theme
   carries." The rest of the sentence is held verbatim by
   `docs.test.ts` ("states the dialog, calendar, time and presence
   dimensions"); update that expected string identically (see §3.6).
2. §7 (currently lines 254–256): change "The numeric contract holds `full` to at
   least half of the larger of the largest control and the largest avatar, so a
   theme that shrinks it cannot turn a 40px avatar into a rounded square." to
   "The numeric contract holds `full` to the largest corner step the theme
   carries and to at least half of the larger of the largest control and the
   largest avatar — each read from the theme's own scale, so a brand that adds a
   step moves the bound — so a theme that shrinks it cannot turn a 40px avatar
   into a rounded square.".

### 3.6 `packages/tokens/src/docs.test.ts` — the guarded sentence and one new case

- Update the expected sentence in "states the dialog, calendar, time and
  presence dimensions" (line 2492): replace the trailing "— at most half the
  smallest avatar." with "— at most half the smallest avatar the theme carries."
- Add one case after it:

```ts
  it("states that the shape bounds read the theme's own extremes", () => {
    const prose = (text: string) => text.replace(/\s+/g, " ");

    expect(prose(markdown)).toContain(
      "`radius.full` must round the largest corner step the theme carries",
    );
    expect(prose(markdown)).toContain(
      "half the smallest avatar the theme carries",
    );
    expect(prose(designSystem)).toContain(
      "holds `full` to the largest corner step the theme carries",
    );
    expect(prose(designSystem)).toContain(
      "half the smallest avatar the theme carries",
    );
  });
```

`markdown` and `designSystem` are the module-level document strings the file
already uses. Do not add imports.

### 3.7 `packages/tokens/README.md` — the metric paragraph

In the "Checking the numbers" paragraph, the clause at lines 670–671 says
"leave the largest avatar a rounded square". Change it to "leave the largest
avatar a rounded square, or a presence dot larger than half the smallest avatar
the theme carries — `full` and the dot read the theme's own largest and smallest
avatar, not the shipped `lg`/`xs`". Keep the surrounding sentence's commas
grammatical (the clause sits in a list before "shrink a higher elevation
level's feather …").

### 3.8 `packages/tokens/src/theme-extremes.test.ts` — the new suite

Create the file. It imports from `./index.js` (the public entry, like
`scale-ladder-totality.test.ts`) and states the four regressions plus the
shipped pass:

```ts
/**
 * Guards the defect plan 568 fixes: the numeric contract's ladders walk the
 * theme's own scale (plan 552), but four shape bounds still read the shipped
 * member's name — `radius.full` against `radius.xl`,
 * `density.controlHeight.lg` and `avatarSize.lg`, and the presence dot against
 * `avatarSize.xs`. A theme carrying a wider scale therefore painted a rounded
 * square avatar, a rounded square control or a dot larger than half its
 * smallest avatar while `themeMetricFailures` returned `[]`, and the two
 * documents' "largest"/"smallest" sentences were false.
 *
 * Each case appends (or prepends) a step through a spread variable: a fresh
 * object literal would be excess-property checked, a spread variable is not,
 * so the theme reaches the checker the way a decoded or copied scale does.
 */
import { describe, expect, it } from "vitest";
import {
  avatarSize,
  densityPresets,
  dimensions,
  extendTheme,
  getTheme,
  lightTheme,
  radius,
  shippedThemes,
  themeMetricFailures,
  type MetricFailure,
  type Theme,
} from "./index.js";

const radiusFailure = (
  actual: number,
  bound: number,
): MetricFailure => ({
  group: "radius",
  member: "full",
  rule: "at-least",
  actual,
  bound,
});

describe("the shape bounds read the theme's own extremes", () => {
  it("rounds an avatar the theme adds above the shipped largest tier", () => {
    const theme = extendTheme(getTheme("light"), {
      avatarSize: { ...avatarSize, xl: 80 },
      radius: { full: 20 },
    });

    expect(themeMetricFailures(theme)).toEqual([radiusFailure(20, 40)]);
  });

  it("rounds a control the theme adds above the shipped largest size", () => {
    const preset = densityPresets.comfortable;
    const theme = extendTheme(getTheme("light"), {
      density: {
        controlHeight: { ...preset.controlHeight, xl: 48 },
      },
      radius: { full: 20 },
    });

    expect(themeMetricFailures(theme)).toEqual([radiusFailure(20, 24)]);
  });

  it("rounds a corner step the theme adds above the shipped largest radius", () => {
    const radii = { ...radius, "2xl": 24, full: 20 };
    const theme = extendTheme(getTheme("light"), { radius: radii });

    expect(themeMetricFailures(theme)).toEqual([radiusFailure(20, 24)]);
  });

  it("holds the presence dot to a smaller avatar the theme carries", () => {
    // A decoded or copied theme may order a smaller tier first; `extendTheme`
    // appends, so this shape reaches the checker as a `Theme` value.
    const avatars = { xxs: 8, ...avatarSize };
    const theme: Theme = { ...lightTheme, avatarSize: avatars };

    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "avatarPresenceDotSize",
        rule: "at-most",
        actual: dimensions.avatarPresenceDotSize,
        bound: 4,
      },
    ]);
  });

  it("accepts the derived bound when the radius reaches it", () => {
    const theme = extendTheme(getTheme("light"), {
      avatarSize: { ...avatarSize, xl: 80 },
      radius: { full: 40 },
    });

    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("leaves every shipped theme passing", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      themeMetricFailures(theme),
    );

    expect(failures).toEqual([]);
  });
});
```

### 3.9 `COMPONENTS.md` — the **Theme metric check** row

Append one clause inside the existing parenthesis, after the plan-554 sentence:
"the shape bounds read the theme's own extremes too — `full` rounds the largest
corner, control and avatar the theme carries and the presence dot stays within
half its smallest avatar, because a copied scale may widen or lower the tiers
the shipped names no longer bound (plan 568)". Keep the row one line.

### 3.10 `.agents/slop/plans/README.md`

- Add the row after `567`:

```
| [568](./568-theme-extreme-bounds.md) | The largest and smallest are the theme's own | F | 361, 372, 531, 552, 554, 566 | done |
```

- Add a closing paragraph in the established voice: the four bounds that read
  the shipped name, the four measured edits that returned `[]`, the derived
  extremes, the six new cases, and that no shipped value moves.

### 3.11 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)", naming the
four name-bound rules, the derived extremes, the six cases and the corrected
documents; bump the section count and progress bar (`229/295` → `230/296`, bar
stays `[████████░░]`).

## 4. Test plan and both directions

### 4.1 Pre-fix (proves the failure half)

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/theme-extremes.test.ts)
# EXPECT: the four regression cases FAIL (the checker returns `[]`), and
# "accepts the derived bound" + "leaves every shipped theme passing" PASS.
git stash pop
```

`scripts/verify-two-directions.sh` drives `jj`, which this repo does not use
(PLAN.md D1), so the git stash above is the both-directions check.

### 4.2 Post-fix

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/theme-extremes.test.ts src/metrics.test.ts src/fixed-surface-metrics.test.ts \
  src/scale-ladder-totality.test.ts src/docs.test.ts
# EXPECT: all pass. In particular metrics.test.ts keeps its exact three
# `full: 8` bounds (12, 18, 20) and its `full: 18` → bound 20 case, because the
# shipped extremes are the names it already used.
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes (145 files / 5,754 tests; the new suite adds six
# cases).
nub run check
nub run lint
# EXPECT: clean.
```

### 4.3 What each case can fail on

- Case 1 fails if `largestAvatar` is read from `avatarSize.lg` instead of the
  theme's values.
- Case 2 fails if `largestControl` is read from `controlHeight.lg`.
- Case 3 fails if `largestCorner` is read from `radius.xl`.
- Case 4 fails if the dot's bound is read from `avatarSize.xs` instead of the
  theme's smallest value. It is built as a `Theme` value because `extendTheme`
  appends an added key after the shipped ones; a decoded theme can order the
  smaller tier first, and the ladder then passes.
- The "accepts the derived bound" case fails if the new bound is applied without
  the half-divisor (it would demand 80) or if the bound is replaced by the
  shipped one.
- The shipped case fails if any derived extreme changes a shipped bound.
- `scale-ladder-totality.test.ts`'s `xl: 1` case passes because `orderedScale`
  skips the extremes of a broken scale; without the guard it gained a second
  presence-dot failure (bound `0.5`), which is the cascade §2 records.

## 5. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme, platform variant or recipe reports a new metric failure — the
  derived extremes must resolve to 12, 18 and 20 (radius) and 10 (dot) on the
  identity, and to the same numbers its own scale already produced elsewhere;
- the `full: 8` case in `metrics.test.ts` changes its three bounds or gains a
  fourth — that means an extreme was derived from the wrong group;
- the `scale-ladder-totality` case that adds `controlHeight.xl: 1` gains a fit
  failure — the smallest supported control is still `sm` and this plan must not
  touch the fit rules;
- `docs.test.ts`, `readme.test.ts` or `inventory.test.ts` fails for a reason
  other than the two sentence updates in §3.5/§3.6 — report it instead of
  editing the guard;
- a package value, pair, floor, metric, platform style, recipe, name or
  document count moves;
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- `extendTheme(light, { avatarSize: { ...avatarSize, xl: 80 }, radius: { full: 20 } })`
  reports `radius.full` at-least 40.
- The control and corner analogues report 24 in the same shape.
- A theme carrying an 8px avatar reports the presence dot at-most 4.
- A theme that reaches the derived bound (40) reports `[]`.
- Every shipped theme, platform variant and recipe still reports `[]`; the
  existing `metrics.test.ts`, `fixed-surface-metrics.test.ts` and
  `scale-ladder-totality.test.ts` expectations are unchanged.
- Both documents state that the bounds read the theme's own largest/smallest
  values, one `docs.test.ts` case holds those sentences, and the README says the
  same beside the other metric guarantees.
- Six new cases, each with the failure it guards stated in the file header.
- No path outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/`
  is touched.

## 7. Cross-team

None. The bounds are internal to `themeMetricFailures`; the public
`MetricFailure` shape, every exported index and every consumer call are
unchanged. A consumer that builds a wider scale gets a true report; a consumer
that does not sees the same bounds as before.
