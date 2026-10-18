# Plan 361 — the pill radius must round the largest avatar

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:** 054
(`avatarSize`), 353/360 (the numeric contract), 358 (the metric rules).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeMetricFailures` holds `radius.full` to two bounds: it must round the
largest corner radius (`radius.xl`) and half the largest control
(`density.controlHeight.lg / 2`). The shipped comfortable theme therefore
requires `full >= 18`:

```ts
themeMetricFailures(
  extendTheme(getTheme("light"), { radius: { full: 18 } }),
); // []
```

But `full` is also the **avatar** radius, and the largest avatar is larger than
the largest control. `packages/components/src/avatar.tsx:100` paints the image
disc with `borderRadius: theme.radius.full` inside a box sized by
`theme.avatarSize[size]`; `avatarSize.lg` is 40 in every shipped theme. A `full`
of 18 or 19 is below half of 40, so a 40px avatar is a **rounded square** with
flat segments along its sides — a defect that is invisible to
`themeContrastFailures` (all colours are fine) and, until now, to
`themeMetricFailures` too:

```ts
themeMetricFailures(
  extendTheme(getTheme("light"), { radius: { full: 19 } }),
); // []   — but the 40px avatar is not a circle
```

`docs/design-system.md` §7 states the contract the token is meant to carry:
"Pills and avatars use `full` (clamped by the renderer to half the short side)."
The runtime clamps a radius larger than half the box; it does not enlarge a
radius smaller than half. So `full` must already be at least half of the
**largest shape painted with it**, and that shape is `avatarSize.lg`, not
`controlHeight.lg`.

Every shipped theme, platform variant and recipe ships `radius.full === 9999`,
so this plan moves **no token value**.

## 2. Decision

Extend the existing `radius.full` rule; no new group, rule name, public function
or colour pair.

Add a third bound beside the two that already exist, so the failure names the
shape that is not round:

```ts
...atLeast("radius", "full", radius.full, radius.xl),
...atLeast("radius", "full", radius.full, density.controlHeight.lg / 2),
...atLeast("radius", "full", radius.full, avatarSize.lg / 2),
```

The effective requirement is the taller of the control and the avatar, and each
shape keeps its own diagnostic: a theme may raise the largest control (spacious
ships `controlHeight.lg === 40`) or the largest avatar, and `full` must round
both.

Rejected alternatives, with reasons:

- **Check only `avatarSize.lg`** — drops the control bound `358` shipped; a
  spacious 40px control (or an edited larger one) painted as a pill would no
  longer be covered. A pill is not only an avatar.
- **Check every avatar size against `full`** — the smaller avatars are covered
  by the largest one, and listing four bounds would report the same edit four
  times; the contract reports one failure per broken rule.
- **Enforce `full === Number.POSITIVE_INFINITY`** — the shipped value is 9999
  and a finite value is what `radius.full` documents ("as round as the shape
  allows", not "infinite"). The bound is what matters, not the sentinel.
- **A runtime check inside `extendTheme`** — the package deliberately keeps
  `extendTheme` total and side-effect free (plan 358): the contract is a
  test-time check a consumer runs.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

**a.** No import is needed: `themeMetricFailures` already destructures
`avatarSize` from the theme, so the bound follows an edited avatar ladder rather
than the shipped constant.

**b.** In the `radius` group of `themeMetricFailures`, add the
`avatarSize.lg / 2` bound after the existing `density.controlHeight.lg / 2`
bound.

**c.** Update the `themeMetricFailures` JSDoc bullet:

> - **radius**: `none` is square, the four steps are a ladder, and `full` rounds
>   both the largest radius **and half of the taller of the largest control and
>   the largest avatar** (a 40px avatar is the shipped case).

### 3.2 `packages/tokens/src/metrics.test.ts`

**a.** The existing case "reports a rounded square corner and a pill that does
not round" uses `full: 8`, which now breaks **three** bounds, not two. Its
expected array gains:

```ts
      {
        group: "radius",
        member: "full",
        rule: "at-least",
        actual: 8,
        bound: 20,
      },
```

**b.** Add a case beside it that states the regression: the largest avatar is
what sets the bound, and an edit that only satisfies the control bound still
fails.

```ts
  it("reports a pill radius that leaves the largest avatar a rounded square", () => {
    // 18 satisfies the control bound (controlHeight.lg / 2) but not the avatar
    // bound (avatarSize.lg / 2 = 20), so the 40px avatar is not a circle.
    expect(failuresOf({ radius: { full: 18 } })).toEqual([
      {
        group: "radius",
        member: "full",
        rule: "at-least",
        actual: 18,
        bound: 20,
      },
    ]);

    // Exactly half the largest avatar is round, and is the intended edit.
    expect(failuresOf({ radius: { full: 20 } })).toEqual([]);
  });
```

**c.** Extend "passes the identity theme and the executed example" with the new
example from §3.3:

```ts
    expect(squarishFailures).toHaveLength(1);
```

### 3.3 `packages/tokens/src/metrics.example.ts`

Append the documented case (the file is already imported by `metrics.test.ts`,
so it runs; plan 350's convention):

```ts
/**
 * A `full` radius that clears the largest control but not the largest avatar:
 * the colour check is empty, and the numeric one names the rounded square.
 */
export const squarish = extendTheme(getTheme("light"), {
  radius: { full: 18 },
});
export const squarishFailures = themeMetricFailures(squarish);
```

### 3.4 `docs/tokens.md` — "Numeric metrics"

In the paragraph that starts "The rules are breakage tests…", replace:

> `radius.full` must round the largest radius and half the largest control;

with:

> `radius.full` must round the largest radius and half of the taller of the
> largest control and the largest avatar — a 40px avatar painted at a smaller
> radius is a rounded square, not a circle;

### 3.5 `docs/design-system.md`

**a.** §7 "Radii, borders and elevation", after "Pills and avatars use `full`
(clamped by the renderer to half the short side).", add:

> The numeric contract holds `full` to at least half of the larger of the
> largest control and the largest avatar, so a theme that shrinks it cannot turn
> a 40px avatar into a rounded square.

**b.** In "The floors are the colour half…" extend the failure list:

> … round a "square" corner**, leave the largest avatar a rounded square**,
> invert a named size ladder, …

### 3.6 `packages/tokens/README.md` — "Checking the numbers"

In the sentence that lists what the edit path can do, change "invert a size
ladder" to "invert a size ladder, leave the largest avatar a rounded square".

### 3.7 `COMPONENTS.md` — the **Theme metric check** row

In the enumeration of what an edited theme cannot do, change

> round a "square" `radius.none`, invert a named ladder

to

> round a "square" `radius.none`, **leave the largest avatar a rounded square**,
> invert a named ladder

The inventory guard only requires `${metricGroups.length} groups`, every group
name, `themeMetricFailures(theme)`, "only focus indicator" and "**Theme contrast
check**"; none of those phrases is touched.

### 3.8 `.agents/slop/plans/README.md`

- Add the row to the `tokens-theme` table:

```
| [361](./361-pill-rounds-largest-avatar.md) | The pill radius must round the largest avatar | F | 054, 353, 358, 360 | done |
```

- Add a closing paragraph after plan 360's, in the same voice: the probe
  (`full: 19` returned `[]`), the avatar composition that exposed it, the
  `Math.max` bound, and that no shipped value moves.

### 3.9 `TODO.md`

- Add one ticked row under "Design tokens and theming (`tokens-theme`)" naming
  the gap, the probe, the new bound and that no value moved.
- Update the section progress bar from `128/178` to `129/179`.

---

## 4. Test plan and both directions

The repo's `scripts/verify-two-directions.sh` drives `jj`, which is not installed
on this box (PLAN D1). Prove both directions with git instead.

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/metrics.test.ts)
# EXPECT: the new "largest avatar" case FAILS (the old bound returns [] where a
# failure is expected), and the updated "pill that does not round" case FAILS
# (two failures where three are expected). No other case fails.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/metrics.test.ts)
# EXPECT: every case passes.
```

A case that passes in the first run means it does not guard the fix — STOP and
rewrite it.

Then the full gate:

```sh
nub run --filter @gpuixui/tokens test
# EXPECT: all files pass (currently 73 files / 4279 tests; +1 case and one
# extended case, so 4280 tests).
nub run check
nub run lint
```

Expected: `check` reports "every test asserts something", oxfmt and oxlint clean,
`tsc --noEmit` clean for `packages/tokens` and `packages/deploy`; `lint` clean.

Also confirm the guarded documents still pass:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts src/inventory.test.ts src/readme.test.ts src/metrics.test.ts
# EXPECT: all pass. `docs.test.ts` guards the numeric tables and the
# design-system claims; `inventory.test.ts` the ledger row; `readme.test.ts` the
# package front door.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails the new bound (that would
  mean a shipped value must move, which this plan forbids);
- `docs.test.ts`, `inventory.test.ts` or `readme.test.ts` rejects an edit in
  §3.4–§3.6 (re-read what the guard requires before rewording; do not delete a
  guarded phrase);
- `themeMetricFailures` needs a signature change, a new group or a new rule
  name — the change is one `atLeast` bound;
- the new case passes on the pre-fix `metrics.ts` — that means the bound is not
  the one being exercised;
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- `themeMetricFailures(extendTheme(getTheme("light"), { radius: { full: 18 } }))`
  returns exactly one `radius`/`full`/`at-least` failure with `bound: 20`.
- `radius.full: 20` returns `[]`, so the fix is a bound, not an arbitrary
  increase.
- `radius.full: 8` now reports three failures (12, 18, 20) and no others.
- Every shipped theme, platform variant and recipe still returns `[]`.
- Both docs pages, the package README and the ledger row state the avatar bound;
  `docs.test.ts`, `inventory.test.ts`, `readme.test.ts` and the full
  `@gpuixui/tokens` suite pass.
- The new case fails on the pre-fix `metrics.ts` (proven with §4's git commands)
  and passes after it.
- No token value, colour pair, floor, platform style or recipe changes; no path
  outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The rule describes an invariant the shipped consumer already satisfies
(`packages/components/src/avatar.tsx` paints `radius.full` on an
`avatarSize.lg` disc, and every shipped theme's `full` is 9999). No consumer
migration is implied.
