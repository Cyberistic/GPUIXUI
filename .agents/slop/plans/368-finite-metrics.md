# Plan 368 — every numeric metric must be paint

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
358 (the metric contract), 360/361 (elevation geometry and the avatar bound),
364 (the motion group's finiteness), 367 (the type-scale rules).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeMetricFailures` promises "the numeric half" of the editable-theme
guarantee: an edited theme may not carry a number the components cannot paint.
Plan 360 added a `finite` rule for elevation geometry and plan 364 extended it to
every motion timing and easing, because the pinned runtime rejects those. The
other eight groups still accept `Infinity`, and the runtime does not guard them:
`packages/native/src/renderer.rs` maps a style's `padding`, `font_size`,
`border_radius` and friends straight through `px(value as f32)`, while the
renderer's own theme-metric override documents the consequence —

> A typo can hand us NaN, a negative size, or a value that overflows `f32` to
> infinity. Any of those turn into invalid Taffy geometry and gpui renders
> nothing at all, with no error to explain it.
> (`packages/native/src/theme.rs` `Metrics::apply`)

A probe on the shipped light theme returns `[]` from both checkers for every
group below:

```ts
themeMetricFailures(extendTheme(getTheme("light"), { spacing: { "5xl": Infinity } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { radius: { full: Infinity } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { borderWidth: { strong: Infinity } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { iconSize: { xl: Infinity } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { density: { rowHeight: Infinity } })); // []
themeMetricFailures(extendTheme(getTheme("light"), { dimensions: { toastWidth: Infinity } })); // []
themeMetricFailures(extendTheme(getTheme("light"), {
  typography: { display: { fontSize: Infinity, lineHeight: Infinity } },
})); // []
```

Why the existing rules miss it: a ladder's last step has no successor, so
`spacing["5xl"]` and `iconSize.xl` are never compared onwards; `positive` and
`non-negative` accept `Infinity`; `atLeast` only fires when the *bound* is
infinite. The failure a consumer gets is a window that paints nothing, with no
message.

Every shipped theme, platform variant and recipe is finite, so this plan moves
**no token value**.

## 2. Decision

Add one `finite` pass over every numeric member of the eight groups that do not
already have one, in `themeMetricFailures`, before the group's other rules. No
new group, no new `MetricRule` member, no public function, no colour change.

The members:

| Group | Members |
| ----- | ------- |
| `typography` | every role's `fontSize` and `lineHeight` (`fontWeight` is the closed `FontWeight` union) |
| `borderWidth` | `thin`, `strong` |
| `density` | `controlHeight.{sm,md,lg}`, `controlPaddingX.{sm,md,lg}`, `rowHeight` |
| `dimensions` | all seven surface metrics |
| `iconSize` | `xs`, `sm`, `md`, `lg`, `xl` |
| `avatarSize` | `xs`, `sm`, `md`, `lg` |
| `radius` | `none`, `sm`, `md`, `lg`, `xl`, `full` |
| `spacing` | all ten steps |

`elevation` and `motion` already carry `finite` (plans 360, 364) and are not
touched, so an elevation `NaN` reports one failure, not two.

Rejected alternatives, with reasons:

- **Make `positive` / `non-negative` / `atLeast` reject non-finite values** — an
  infinite value *is* positive, and reporting `positive` for it names the wrong
  rule; plan 360 introduced the rule name for exactly this case. It would also
  silently change which rule a `NaN` reports today.
- **A new `"number"` / `"paintable"` rule name** — `finite` already says it and
  the elevation and motion groups publish it.
- **Deduplicate the NaN failures the existing rules also report** — `NaN` is
  already reported by two rules on a ladder step (`non-negative` and
  `non-decreasing`); the contract reports every broken rule and a malformed
  theme may break several. Adding a third is consistent, and the new cases pin
  `Infinity`, where the other rules pass and exactly one failure is reported.
- **A runtime validator inside `extendTheme`** — the package deliberately keeps
  `extendTheme` total and side-effect free (plan 358); the contract is a
  test-time check a consumer runs.
- **Only check the ladder's last step** — `atLeast` and `atMost` bounds and the
  standalone metrics (`rowHeight`, `toastWidth`, `borderWidth.strong`) would stay
  unguarded.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts`

**a.** Add a helper beside `finite`:

```ts
/**
 * Every member of a group must be a number the renderer can paint. A ladder's
 * last step and a standalone metric have no later rule to catch an infinity, so
 * the check is its own pass.
 */
const finiteMembers = (
  group: MetricGroup,
  members: ReadonlyArray<readonly [string, number]>,
): ReadonlyArray<MetricFailure> =>
  members.flatMap(([member, value]) => finite(group, member, value));
```

**b.** In `themeMetricFailures`, after the `textRoles.flatMap` block and before
the ladder calls, add the typography pass:

```ts
    ...finiteMembers(
      "typography",
      textRoles.flatMap((role) => [
        [`${role}.fontSize`, typography[role].fontSize] as const,
        [`${role}.lineHeight`, typography[role].lineHeight] as const,
      ]),
    ),
```

**c.** Before `nonNegative("borderWidth", …)` add:

```ts
    ...finiteMembers("borderWidth", [
      ["thin", borderWidth.thin],
      ["strong", borderWidth.strong],
    ]),
```

**d.** Before the density ladders add:

```ts
    ...finiteMembers("density", [
      ...controlSizes.map(
        (size) => [`controlHeight.${size}`, density.controlHeight[size]] as const,
      ),
      ...controlSizes.map(
        (size) =>
          [`controlPaddingX.${size}`, density.controlPaddingX[size]] as const,
      ),
      ["rowHeight", density.rowHeight],
    ]),
```

**e.** Before the dimensions rules add:

```ts
    ...finiteMembers("dimensions", [
      ["overlayMinWidth", dimensions.overlayMinWidth],
      ["overlayWidth", dimensions.overlayWidth],
      ["overlayMaxHeight", dimensions.overlayMaxHeight],
      ["fieldMinWidth", dimensions.fieldMinWidth],
      ["fieldAdornmentSize", dimensions.fieldAdornmentSize],
      ["chipMinWidth", dimensions.chipMinWidth],
      ["toastWidth", dimensions.toastWidth],
      ["previewCardMinWidth", dimensions.previewCardMinWidth],
      ["previewCardMaxWidth", dimensions.previewCardMaxWidth],
    ]),
```

**f.** Before the icon, avatar, radius and spacing ladders add one pass each,
built from the same step lists the ladders use:

```ts
    ...finiteMembers(
      "iconSize",
      (["xs", "sm", "md", "lg", "xl"] as const).map(
        (size) => [size, iconSize[size]] as const,
      ),
    ),
    ...finiteMembers(
      "avatarSize",
      (["xs", "sm", "md", "lg"] as const).map(
        (size) => [size, avatarSize[size]] as const,
      ),
    ),
    ...finiteMembers("radius", [
      ["none", radius.none],
      ["sm", radius.sm],
      ["md", radius.md],
      ["lg", radius.lg],
      ["xl", radius.xl],
      ["full", radius.full],
    ]),
    ...finiteMembers(
      "spacing",
      (
        [
          "2xs",
          "xs",
          "sm",
          "md",
          "lg",
          "xl",
          "2xl",
          "3xl",
          "4xl",
          "5xl",
        ] as const
      ).map((step) => [step, spacing[step]] as const),
    ),
```

**g.** Update the `themeMetricFailures` JSDoc: state that every numeric member
of every group must be a finite number, not only the elevation geometry and the
motion timings.

### 3.2 New `packages/tokens/src/finite-metrics.test.ts`

Header states the guarded bug: the contract's `finite` rule covered only
elevation and motion, so `spacing["5xl"]`, `radius.full`, `borderWidth.strong`,
`iconSize.xl`, `density.rowHeight`, `dimensions.toastWidth` and a display
`fontSize` of `Infinity` all returned `[]` while the renderer casts them to
`f32::INFINITY` and paints nothing.

Cases:

1. One per group: the seven probe edits each return the
   `{ group, member, rule: "finite", actual: Infinity, bound: 0 }` failure for
   its member and `themeContrastFailures` stays `[]`. The row-height edit also
   trips the existing overlay bound (`overlayMaxHeight` must fit a row), which is
   correct: raising a row must not clip every menu option. The type-size edit
   reports both `fontSize` and `lineHeight`, because the probe sets both.
2. A `-Infinity` case (`spacing.sm`) reports `finite` beside the sign and ladder
   failures — the sign rule stays for finite negatives.
3. Every shipped set returns `[]` (the shipped-loop shape from
   `metrics.test.ts`).
4. A finite negative still reports its own rule (`spacing.sm: -4` →
   `non-negative`), proving the new pass did not swallow the existing rules.

### 3.3 `docs/tokens.md` — "Numeric metrics"

In the paragraph starting "The rules are breakage tests…", extend the elevation
sentence and add the general rule after the ladders sentence:

> Every numeric metric — a type size, leading or weight, a border width, a
> density or dimension metric, an icon, avatar, radius or spacing step, an
> elevation field and a motion timing — must be a **finite** number, because the
> renderer casts each one to a 32-bit float and an infinity becomes invalid
> layout with no error.

and keep the existing elevation/motion specifics as the two cases that have a
second reason (the alpha fraction, the easing control points).

### 3.4 `docs/design-system.md` — "The floors are the colour half…"

Extend the failure list: "…hand the renderer a non-finite shadow offset, a
non-finite type size, spacing step, radius, border width, dimension, icon or
avatar, …".

### 3.5 `packages/tokens/README.md` — "Checking the numbers"

Extend the "can …" sentence with "or ship a non-finite spacing step, radius,
type size or dimension".

### 3.6 `COMPONENTS.md` — the **Theme metric check** row

Add "or ship a non-finite metric the renderer casts to a 32-bit float" to the
enumeration. The inventory guard's required phrases are untouched.

### 3.7 `docs.test.ts`

Extend the existing design-system numeric-claims block with one case holding the
new sentence:

```ts
  it("states that every numeric metric must be finite", () => {
    expect(designSystem).toContain("must be a **finite** number");
  });
```

### 3.8 `.agents/slop/plans/README.md` and `TODO.md`

- Add the plan row (`368`) and a closing paragraph in the same voice: the seven
  probe edits, the renderer evidence, the eight finite passes and that no value
  moves.
- Add one ticked TODO row and move the count (`135/185` → `136/186`).

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/finite-metrics.test.ts)
# EXPECT: every "reports …" case FAILS (the pre-fix checker returns []).
# A failure case that passes here does not guard the fix — STOP and rewrite it.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/finite-metrics.test.ts)
# EXPECT: every case passes.
```

Then the full gate:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: `check` reports "every test asserts something", oxfmt and oxlint clean,
`tsc --noEmit` clean; every existing metric case still passes unchanged.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe fails a finite pass (that means
  a shipped value must move, which this plan forbids);
- an existing `metrics.test.ts` case changes its expected array (a finite
  failure appears where the case expected one rule) — the pass must not fire on
  finite values, and a `NaN` case may need its expectation reviewed rather than
  the rule removed;
- `docs.test.ts`, `inventory.test.ts` or `readme.test.ts` rejects an edit in
  §3.3–§3.6;
- the change needs a new `MetricRule`, group or public function — it is one
  helper and eight calls;
- a "reports …" case passes on the pre-fix `metrics.ts`.

## 6. Acceptance criteria

- Each of the seven probe edits reports the `finite` failure for the member
  named, and `themeContrastFailures` stays `[]`; the two mechanical cascades
  (a row taller than the overlay, and a probe that sets `fontSize` and
  `lineHeight` together) are named in §3.2.
- `spacing.sm: -4` still reports `non-negative`, and `-Infinity` reports
  `finite`.
- Every shipped theme, platform variant and recipe returns `[]`.
- Both docs pages, the package README and the ledger row state the finite rule;
  `docs.test.ts`, `inventory.test.ts`, `readme.test.ts` and the full
  `@gpuixui/tokens` suite pass.
- The new cases fail on the pre-fix `metrics.ts` (proven with §4) and pass after.
- No token value, colour pair, floor, platform style or recipe changes; no path
  outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The rule describes an invariant every shipped consumer already satisfies;
no consumer reads a non-finite metric today.
