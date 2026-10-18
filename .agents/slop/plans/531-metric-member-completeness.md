# 531 — The numeric contract's member completeness

Status: ready. Depends on 358 (the metric contract), 360, 364, 368, 369,
370, 372 and 530.

## The bug

`themeMetricFailures` promises, in its JSDoc and in both documents, that
**every numeric member of every metric group is finite**, because the renderer
casts each value to a 32-bit float and an infinity paints invalid layout
silently. The promise is not held by construction: the `finite` pass is a
hand-maintained list per group (`finiteMembers("dimensions", [...])`, the
per-shape finite calls in the elevation loop, the `finite` calls in the motion
loop). Plan 530 had to add nine `Dimensions` members to that list by hand.

The next field added to `Dimensions` — or to `iconSize`, `spacing`, a platform
style's `structure.dimensions` — ships **ungoverned**: it reaches the renderer,
`themeMetricFailures` returns `[]`, and the JSDoc claim is false. The colour
half of the contract already closed exactly this gap with `colorRoles` (plan
086); the numeric half still relies on memory.

Two smaller consequences of the same design:

- `typing` (weights), `elevation` (alpha) and `motion` (easing points) each
  carry a dedicated finiteness branch (`weighable`, `fraction`, `easing`). A new
  numeric field in those groups has no branch at all.
- The `Dimensions` completeness in `metrics.test.ts` is a hand-written example
  per rule; it cannot see a member nobody remembered.

## The decision

Walk the group value instead of listing its members.

1. `numericMembers(value, prefix)` returns every numeric leaf of a group object
   with the dotted path a `MetricFailure` reports (`toastWidth`,
   `controlHeight.sm`, `md[0].offsetX`, `ease.enter[0]`). It descends objects and
   arrays, skips strings (the density preset name, a named easing) and every
   other non-number.
2. The `finite` pass becomes `finiteGroup(group, theme[group])` — one walk per
   group. The hand-written `finiteMembers` helper and every hand-listed finite
   call are deleted. A member added to a group is governed the moment it exists;
   no list to update.
3. `weighable`, `fraction` and `easing` stop re-reporting finiteness and only
   range-check a **finite** value. A `NaN` is then reported once, by the finite
   walk, with rule `finite`; a finite value outside its range keeps `within` /
   `at-least` / `at-most`. This removes the double-reporting that forced the
   dedicated branches to own finiteness in the first place.
4. Publish `metricMembers` — one ordered list per group, beside `metricGroups`
   and `metricRules` — as the reference a diagnostics table or a docs row
   iterates. Each list is derived from the group's own default object/index
   (`Object.keys(dimensions)`, `textRoles`, `controlSizes`, `elevationLevels`,
   `motionLevels` / `motionPhases`, `[0,1,2,3]` easing points), so it cannot drift
   from the interface by hand. An elevation entry omits the shape index
   (`md.offsetX`): the rule reads every entry in the level.

The claim becomes structural: "every numeric member of every group is finite" is
true because the check walks the value, not because a list was remembered. The
index is the published view of the domain, held to the runtime objects by a
test.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | Add `metricMembers`, `numericMembers`/`finiteGroup`; delete `finiteMembers` and the hand finite calls; make `weighable`/`fraction`/`easing` range-only for finite values; update the JSDoc |
| `packages/tokens/src/metric-members.test.ts` | New: the index's shape, its agreement with the runtime groups, and the unlisted-member regression |
| `packages/tokens/src/metrics.test.ts` | A `NaN` elevation alpha is now reported as `finite` (one failure), not `within` |
| `packages/tokens/src/motion-contract.test.ts` | A `NaN` x control point is now reported as `finite`, not `within`; the y point is unchanged |
| `docs/tokens.md` | Name `metricMembers`; state that the check walks each group, and correct the `within` sentence if it claims non-finite values take `within` |
| `docs/design-system.md` | State the walk, not the hand list |
| `packages/tokens/README.md` | Name `metricMembers` beside `metricGroups` |
| `COMPONENTS.md` | The Theme metric check row names the walk and `metricMembers` |
| `TODO.md` | Tick the row this plan adds |
| `.agents/slop/plans/README.md` | Index this plan |

Do not touch any other package. The primitives/components consumers of
`MetricFailure` only read `group`/`member`/`rule`; the rule for a non-finite
value moves from `within` to `finite`, which is the more accurate name and is
documented.

## Steps

1. In `packages/tokens/src/metrics.ts`, import the default objects the index
   derives from: `avatarSize`, `borderWidth`, `dimensions`, `iconSize`, `radius`,
   `spacing` from `./scale.js`; `elevationLevels`, `lightElevation` from
   `./elevation.js`; `motionLevels`, `motionPhases` from `./motion.js`. Keep the
   existing `controlSizes` and typography imports.
2. Add, after `metricRules`:

   ```ts
   /** The numeric fields of one elevation shape, derived from the shipped data. */
   const shadowFields = Object.keys(lightElevation.sm[0] ?? {}) as ReadonlyArray<string>;
   ```

   No cast is needed if written as `const shadowFields = Object.keys(lightElevation.sm[0] ?? {});`
   — `string[]` is the honest type here because the index is documentation.
   Then define `metricMembers` with `satisfies Record<MetricGroup, ReadonlyArray<string>>`.
3. Add `numericMembers` and `finiteGroup` beside the `finite` helper. Keep
   `finite` exported? It is not exported today; leave it private.
4. Replace the finite calls in `themeMetricFailures` **in place** (same position
   in the returned array) so failure order stays stable:
   - the typography `finiteMembers` → `finiteGroup("typography", typography)`;
   - borderWidth, density, iconSize, avatarSize, radius, spacing, dimensions the
     same;
   - elevation: one `finiteGroup("elevation", elevation)` before the per-level
     loop; delete the four `finite` lines inside it;
   - motion: one `finiteGroup("motion", motion)` before `zero(...)`; delete the
     `finite` calls for the timings; `easing` keeps only the two `within` checks.
   Delete the now-unused `finiteMembers` helper.
5. `weighable`: `Number.isFinite(actual) ? [atLeast, atMost] : []`.
   `fraction`: `Number.isFinite(actual) && (actual < 0 || actual > 1) ? [within] : []`.
   `easing`: named easing → `[]`; tuple → the two `fraction` checks on `[0]` and
   `[2]` only. Update each helper's JSDoc to say the finite walk owns
   finiteness.
6. Update the `themeMetricFailures` JSDoc: the eight non-elevation/motion groups
   are no longer "the other eight"; say the check walks every group's value and
   that a new member is governed when it ships. Keep the rule bullets accurate:
   a non-finite value is `finite`, an out-of-range finite value is `within`.
7. Write `metric-members.test.ts` (test plan below).
8. Update the two rule assertions in `metrics.test.ts` and
   `motion-contract.test.ts`.
9. Run the package gate and the repo gates; then update the documents, ledger
   and `TODO.md`.

## Commands and expected results

```sh
nub run --filter @gpuixui/tokens test
```

Expected: all suites pass, including the new `metric-members.test.ts`; the suite
count grows by the new cases and no existing case changes except the two rule
assertions above.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0. `metricMembers` satisfies `Record<MetricGroup, …>`, so a
missing group is a type error.

```sh
nub run check && nub run lint && nub run test
```

Expected: all three green. If `docs.test.ts` reports a public value that is not
named in `docs/tokens.md`, add the name to the metrics section — that guard is
intentional.

## Test plan (`metric-members.test.ts`)

Header comment: the bug guarded is the hand-maintained finite list; a numeric
member added to a group (plan 530's nine dimensions) was governed only because
someone remembered, and the next one returns `[]`.

1. **The index covers the ten groups in order.** `Object.keys(metricMembers)`
   equals `metricGroups`; each group's names are unique and non-empty.
2. **The index agrees with the runtime groups.** An independent walker in the
   test (not imported from `metrics.ts`) collects every numeric leaf of
   `lightTheme[group]`, normalises elevation indices (`md[0].offsetX` →
   `md.offsetX`), and compares the set with `metricMembers[group]`. This fails if
   a field ships without an index entry or an index entry names a member the
   theme does not carry. It is deliberately a second walker: two implementations
   disagreeing is the signal.
3. **The motion index owns the easings even when the shipped easings are named.**
   `metricMembers.motion` contains every `motionLevels` timing and all 16
   `ease.<phase>[0…3]` paths, although `lightTheme.motion.ease` holds strings —
   a consumer can replace a phase with a tuple, and the contract must already
   own it.
4. **The regression: an unlisted numeric member is governed.** Build
   `const extended = { ...lightTheme.dimensions, segmentedControlWidth: Number.NaN };`
   and pass it to `extendTheme(lightTheme, { dimensions: extended })`. The extra
   property is structurally assignable (not a fresh literal), `mergeDefined` keeps
   it, and the walk must report
   `{ group: "dimensions", member: "segmentedControlWidth", rule: "finite", actual: NaN, bound: 0 }`.
   **This case fails on the pre-fix code** (the hand list does not name it) and
   passes after the walk. Repeat once outside `dimensions` —
   `{ ...lightTheme.iconSize, xxl: Number.NaN }` → `iconSize.xxl` — so the guard
   proves the walk is group-generic, not a second hand list.
5. **A finite value out of range keeps `within`.** `alpha: 1.5` and an easing
   `[2, 0, 0, 1]` still report `within`; only `NaN`/`Infinity` move to `finite`.
   This protects the documented rule names.

Two-direction check: run case 4 against `HEAD` before the change — it fails
(`themeMetricFailures` returns `[]`) — then after the change it passes. State
that in the test header and in the commit message.

## STOP conditions

- A **shipped** theme, platform variant or recipe reports a new `finite` failure.
  That means a shipped value is not finite; stop, record it, and do not change
  the value without a second plan.
- `metricMembers` cannot be typed as `Record<MetricGroup, …>` without a cast.
  Stop: the index derivation is wrong, not the type.
- An existing case fails for a reason other than the two `NaN` rule names. Stop
  and re-read the failure; do not rewrite the expectation to make it pass.
- A change is needed outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md` or `TODO.md`. Record it as a
  cross-team row instead.

## Acceptance

- `themeMetricFailures` contains no hand-maintained numeric member list; the
  finite pass walks each group value.
- `metricMembers` is exported, documented, and held to the runtime groups by an
  independent test.
- The unlisted-member regression fails without the change and passes with it.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are green.
- `TODO.md` ticks the row; `COMPONENTS.md`, the plan index, the reference, the
  design system and the README name the walk and the index.
