# Plan 364 — the motion group the numeric contract left half-governed

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
019 (motion tokens), 358 (the numeric contract), 360 (a value the renderer can
paint).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeMetricFailures` promises to hold an edited theme's numbers to the
invariants the components paint with. Its `motion` group governs the six timing
ladders only:

- `motion.none` must be zero;
- `step` → `pulse` must be a non-decreasing ladder;
- `motion.ease` — the four easing phases — is not read at all.

That leaves two edits that the renderer cannot use passing with `[]`, measured on
the shipped light theme:

| Edit | `themeMetricFailures` | Runtime |
| ---- | --------------------- | ------- |
| `motion: { pulse: Infinity }` | `[]` | `validate_seconds` rejects a non-finite duration; `MotionState::invalid` marks the transition invalid, so nothing animates |
| `motion: { ease: { enter: [NaN, 0, 0, 1] } }` | `[]` | `validate_ease` rejects a non-finite control point |
| `motion: { ease: { standard: [2, 0, 0, 1] } }` | `[]` | `validate_ease` requires both x values inside `0…1`; a cubic bezier outside that range has no progress function |

Evidence:

- The pinned type, `@gpuix/native@0.10.0` `dist/host.d.ts:17`, declares
  `MotionEase = "linear" | … | [number, number, number, number]` — four plain
  numbers, so a non-finite or out-of-range control point type-checks.
- `~/GPUIXUI/references/gpuix/packages/native/src/motion.rs:345` `validate_ease`
  rejects a cubic bezier unless all four values are finite **and** `x1`/`x2` are
  in `0.0..=1.0`; `:336` `validate_seconds` rejects a non-finite or negative
  duration; `:171` `MotionState::invalid` marks the whole description invalid.
- `themeMetricFailures` was probed with all three edits on 2026-10-18 and
  returned `[]` for each; a negative timing still reports `non-negative` plus
  `non-decreasing`, so only the finite/easing half is missing.

An easing's **y** values are allowed outside `0…1`: that is an overshoot curve, a
design choice, and the runtime only constrains the x values. The rule must not
reject it.

No shipped theme, platform variant or recipe carries a non-finite timing or a
tuple easing (all four phases are named in every set), so **no token value
moves** — this is a guard, in the same series as plans 358, 360 and 363.

## 2. Decision

Extend the existing `motion` group; add no group, no public type and no value.

1. Every timing (`step`, `fast`, `normal`, `slow`, `pulse`) gains the `finite`
   rule beside the ladder it already has. `none` keeps `zero`, which already
   rejects anything non-zero, `Infinity` included.
2. Every easing phase (`standard`, `enter`, `exit`, `linear`) is read. A named
   easing is constrained by `MotionEasing` itself and needs no rule; a tuple is
   held to:
   - `[0]` and `[2]` — the x control points — finite and inside `0…1`
     (`fraction`, the rule the elevation alpha already uses);
   - `[1]` and `[3]` — the y control points — finite (`finite`), with no range
     bound, so an overshoot stays valid.

Rejected alternatives, with reasons:

- **Validate the easing names at runtime** — `MotionEasing` already names the
  five the runtime accepts, and `MetricFailure` carries numbers, so reporting an
  unknown name would need a new public field. The package's documented stance is
  that a TypeScript-authored theme is trusted at compile time; the numeric
  contract governs the numbers the type cannot.
- **Bound every timing to a maximum** — the runtime's real upper bound is
  `Duration::try_from_secs_f64`, i.e. an absurd number of seconds. A hand-picked
  `at-most` bound would be house style, not breakage. Finiteness is the failure
  the probe found and the condition the runtime states.
- **Promote `motionPhases` to a public ordered index** — consistent with plans
  064/067/068/096/305, but a new value would need its own doc coverage and
  tests; `metrics.ts` already retypes each ladder locally (`iconSize`,
  `avatarSize`, `radius`, `spacing`). A local four-name list is the smaller
  change. A later plan can promote it when a second consumer needs it.
- **One `motion` rule function** — the group's failures are the same
  `MetricFailure` shape every other rule returns; splitting it would hide the
  rule from the existing "governs every group it indexes" case.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

- Import `type { MotionEasing } from "./motion.js"`.
- Add an `easing` helper beside `fraction`, with a JSDoc stating the runtime's
  rule and that y may overshoot:

  ```ts
  const easing = (
    group: MetricGroup,
    phase: string,
    value: MotionEasing,
  ): ReadonlyArray<MetricFailure> =>
    typeof value === "string"
      ? []
      : [
          ...fraction(group, `ease.${phase}[0]`, value[0]),
          ...finite(group, `ease.${phase}[1]`, value[1]),
          ...fraction(group, `ease.${phase}[2]`, value[2]),
          ...finite(group, `ease.${phase}[3]`, value[3]),
        ];
  ```

- In `themeMetricFailures`, after `zero("motion", "none", motion.none)`:

  ```ts
  ...(["step", "fast", "normal", "slow", "pulse"] as const).flatMap((level) =>
    finite("motion", level, motion[level]),
  ),
  ...ladder("motion", …),
  ...(
    ["standard", "enter", "exit", "linear"] as const
  ).flatMap((phase) => easing("motion", phase, motion.ease[phase])),
  ```

  Keep the existing `ladder` call and the trailing comma style.

- Update the `motion` bullet in the `themeMetricFailures` JSDoc:

  > **motion**: `none` is zero, the timings are a finite non-decreasing ladder,
  > and a cubic-bezier easing is four finite control points with both x values
  > inside `0…1` — the runtime rejects the whole transition otherwise. A y value
  > may overshoot; an easing named by `MotionEasing` is constrained by the type.

- Update the `@example` only if the formatter needs it; no new example there.

### 3.2 `packages/tokens/src/metrics.example.ts`

Add a fifth example under `squarishFailures`, exercised by the new suite:

```ts
/**
 * A cubic-bezier easing the runtime cannot interpolate: its first x control
 * point is outside `0…1`, so the colour check is empty and the numeric one
 * names the transition.
 */
export const undriveable = extendTheme(getTheme("light"), {
  motion: { ease: { enter: [2, 0, 0, 1] } },
});
export const undriveableFailures = themeMetricFailures(undriveable);
```

### 3.3 `packages/tokens/src/motion-contract.test.ts` (new)

Header states the bug guarded: three motion edits returned `[]` while the runtime
rejects the transition; the `motion` group only governed the timing ladders.

Cases:

1. **A non-finite timing is reported.** For each of `step`, `fast`, `normal`,
   `slow`, `pulse`, extending the light theme with that level set to
   `Number.POSITIVE_INFINITY` returns exactly one failure
   `{ group: "motion", member: <level>, rule: "finite", actual: Infinity, bound: 0 }`.
2. **A non-finite control point is reported.** `[NaN, 0, 0, 1]` on `enter`
   reports `ease.enter[0]` with rule `within`; `[0, NaN, 1, 1]` on `exit`
   reports `ease.exit[1]` with rule `finite`.
3. **An x control point outside `0…1` is reported.** `[2, 0, 0, 1]` on
   `standard` reports `ease.standard[0]` with rule `within`, actual `2`, bound
   `1`; `[0, 0, -0.2, 1]` on `linear` reports `ease.linear[2]`.
4. **An overshoot y stays valid.** `[0.4, -0.5, 0.2, 1.5]` on `standard`
   returns `[]`.
5. **The shipped sets keep their named easings and pass.** Iterate
   `themeModes × themeContrasts` and the three real platform variants (via
   `getPlatformTheme`) and both recipes (via `getPlatformRecipeTheme`); every
   `motion.ease` value is a string and `themeMetricFailures` returns `[]`.
6. **The executed example names the broken transition.**
   `undriveableFailures` has exactly one entry,
   `ease.enter[0]` / `within` / `2` / `1`.

Import the shipped enumerations the way `filled-states.test.ts` does, not a new
helper.

### 3.4 `docs/tokens.md`

- **§Motion**, after the cubic-bezier sentence: a tuple is four finite control
  points whose two x values must lie inside `0…1`, because the runtime's
  `validate_ease` rejects the whole transition otherwise and a curve outside
  that range has no progress function; a y value may overshoot;
  `themeMetricFailures` holds it, and a named easing is constrained by
  `MotionEasing`.
- **§Numeric metrics**, in the ladder sentence: the motion timings must be finite
  as well as ordered, and the easing tuples are held to the runtime's control
  points — a `NaN` or an out-of-range x is a transition the renderer rejects,
  like a `NaN` shadow offset.
- **Limitations**: no new bullet — the runtime does support a cubic bezier; the
  rule is a guard, not a missing capability.

### 3.5 `docs/design-system.md`

**§6**, motion paragraph: add one sentence — a cubic-bezier easing must be four
finite points with both x values inside `0…1`, and the theme contract holds it,
so a brand cannot ship motion the runtime silently drops.

### 3.6 `packages/tokens/README.md`

- **Motion** paragraph: one sentence on the bezier rule.
- **Checking the numbers** paragraph: add a finite timing / invalid bezier to the
  list of edits the numeric check catches.

### 3.7 `COMPONENTS.md`

**Theme metric check** row: append — a motion timing must be finite and a
cubic-bezier easing must be four finite points with both x values inside `0…1`;
`validate_ease`/`validate_seconds` reject the whole transition otherwise (plan
364). Keep the existing group list and counts unchanged.

### 3.8 `.agents/slop/plans/README.md`

- Table row under the tokens block:

  ```
  | [364](./364-motion-contract.md) | The motion group the numeric contract left half-governed | F | 019, 358, 360 | done |
  ```

- Closing paragraph: the three edits that returned `[]`, the runtime rule, the
  finite/easing guards and that no token value moves.

### 3.9 `TODO.md`

One ticked row under the tokens section; progress bar `131/181` → `132/182`.

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts packages/tokens/src/metrics.example.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/motion-contract.test.ts)
# EXPECT: cases 1–3 and 6 FAIL (the contract reports nothing for the invalid
# motion and the example has no failures); case 4 passes (the tuple is not read,
# so nothing is rejected), case 5 passes because every shipped easing is named.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/motion-contract.test.ts)
# EXPECT: every case passes.
```

Then:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: all files pass (75 → 76 files, ~4291 → ~4299 tests),
`check:tests`, oxlint, oxfmt and `tsc --noEmit` clean.

Guarded documents:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/inventory.test.ts src/readme.test.ts \
  src/metrics.test.ts src/examples.test.ts src/snippets.test.ts
```

## 5. STOP conditions

- A shipped theme fails the new rules (a named easing is a string, so the only
  possible cause is a shipped non-finite timing — investigate, do not move a
  value).
- Detecting an unknown easing **name** requires a change to `MetricFailure` or a
  new public type (the plan forbids it).
- The regression cases pass on the pre-fix `metrics.ts`.
- `nub run check` or `nub run lint` fails outside these files.
- The docs formatter or the snippet guard requires a snippet the plan did not
  authorise.

## 6. Acceptance criteria

- `themeMetricFailures` reports:
  - `{ group: "motion", member: "pulse", rule: "finite", actual: Infinity, bound: 0 }`;
  - `ease.enter[0]` / `within` for a `NaN` x, `ease.exit[1]` / `finite` for a
    `NaN` y;
  - `ease.standard[0]` / `within` for `2`, `ease.linear[2]` / `within` for
    `-0.2`.
- An overshoot y (`[0.4, -0.5, 0.2, 1.5]`) returns `[]`.
- Every shipped set still returns `[]`; no token, colour, pair, floor, platform
  style or recipe changes.
- `docs/tokens.md`, `docs/design-system.md`, the package README, `COMPONENTS.md`
  and the plan index state the rule; every guarded suite passes.
- No path outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. Consumers already read `motionTransition`; the contract only rejects values
the runtime would drop.
