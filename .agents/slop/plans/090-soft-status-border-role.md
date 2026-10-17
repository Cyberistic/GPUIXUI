# 090 — The soft status edge is a role, held to its floor

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth and the contrast contract) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014` (soft status pairs), `057` (`xText`), `071` (contrast contract), `076` (soft surface perceivability), `083` (status text on washes), `086` (total contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`statusTone(theme, tone).border` is the edge an Alert, Badge or Toast paints
around its soft status surface. `components` spreads it directly
(`packages/components/src/internal/theme.ts`, `statusTone(...).border` →
`borderColor`), and `src/status-tone.example.ts` does the same. It is a public,
painted value with no role and no floor behind it:

```ts
// src/styles.ts
export function statusTone(theme: Theme, tone: StatusTone): StatusToneStyle {
  return {
    background: theme.colors[`${tone}Soft`],
    foreground: theme.colors[`${tone}SoftForeground`],
    border: alpha(theme.colors[tone], 0.3), // ← the only derived colour
    text: theme.colors[`${tone}Text`],
  };
}
```

Three things follow from that line:

1. **It is not a role**, so a copied platform style or brand theme cannot edit
   it. Every other painted surface in the package is a `ThemeColors` entry; this
   one is a mixture recomputed from a solid fill, which is exactly the
   "components must not mix a readable colour at runtime" rule the docs state
   for text.
2. **No test measures it.** `contrastPairs` holds the soft surface (`xSoft` on
   `background`/`card`/`popover`) and the soft text (`xSoftForeground` on
   `xSoft`), but never the edge on the fill it borders. The role-level
   completeness guard cannot see a value that is not a role.
3. **The high-contrast variants fail their own decorative-divider floor.** At
   AAA the design system requires a 3:1 divider (`contrastFloors.high.divider`),
   and the 30% mixture composites to a pale tint on an already-pale soft fill.
   Measured on the pinned palettes:

   | Set | Tone | 30% edge over `xSoft` | Ratio |
   | --- | ---- | --------------------- | ----- |
   | high-contrast light | `warning` | `#FCD06A` over `#FFDE8A` | **1.12:1** |
   | high-contrast light | `info` | `#92ACE6` over `#C5D8FF` | 1.58:1 |
   | high-contrast light | `success` | `#79C09A` over `#A8F0C6` | 1.62:1 |
   | high-contrast light | `destructive` | `#D89394` over `#FFC6C6` | 1.66:1 |

   The default sets pass 1.05:1 only by a small margin (`warning` 1.13:1), so a
   palette edit could erase the edge with every suite green — the failure mode
   plans `076`–`088` closed for surfaces, dividers, rings, selection and status
   text.

The fix is the same shape the package already uses for fill-versus-text: give
the edge a designed role per tone, so it is editable and measurable.

## 2. Design decisions (do not re-litigate)

1. **Four new roles**, one per status family:
   `infoSoftBorder`, `successSoftBorder`, `warningSoftBorder`,
   `destructiveSoftBorder`. They sit directly after each `xSoftForeground` in
   `ThemeColors`, in the four colour sets, and in `colorRoles`, so the
   documentation tables and every generated index stay in tone order. Role count
   54 → 58.
2. **The default sets keep today's pixels.** Each default value is the opaque
   composite of the 30% mixture over its own soft fill, so nothing visibly
   changes in the identity, macOS, Linux or Windows light/dark previews:

   | Role | Light | Dark |
   | ---- | ----- | ---- |
   | `infoSoftBorder` | `#A6BEF3` | `#3F5E9A` |
   | `successSoftBorder` | `#8ED3AF` | `#1A6D46` |
   | `warningSoftBorder` | `#FCD47B` | `#815F17` |
   | `destructiveSoftBorder` | `#F0ACAE` | `#983235` |

3. **The high-contrast sets get a designed step** between the soft fill and the
   text, one ramp step lighter/darker than `xText`, all above the 3:1 divider
   floor:

   | Role | HC light | on its soft fill | HC dark | on its soft fill |
   | ---- | -------- | ---------------- | ------- | ---------------- |
   | `infoSoftBorder` | `#1B45AC` (blue 700) | 5.87:1 | `#6E9CFF` (blue 400) | 4.76:1 |
   | `successSoftBorder` | `#116A43` (green 700) | 5.04:1 | `#3BC97F` (green 400) | 5.98:1 |
   | `warningSoftBorder` | `#8E5B00` (amber 700) | 4.41:1 | `#D99400` (amber 500) | 4.71:1 |
   | `destructiveSoftBorder` | `#A5262B` (red 700) | 4.86:1 | `#FF6B6B` (red 400) | 4.78:1 |

4. **The pair class is `divider`**, on the tone's own soft fill: `xSoftBorder`
   on `xSoft`, 1.05:1 default and 3:1 high contrast. The edge is decorative —
   the alert is identified by its fill and text — so it is not a `boundary`
   (3:1/4.5:1), which would force a hard outline at default. Pair count
   105 → 109.
5. **`statusTone` returns the role directly.** `alpha` stops being imported by
   `styles.ts`; it stays a public helper with its own docs and tests.
6. **No component change.** `components` already spreads `statusTone(...).border`,
   so it picks up the designed value by delegation. Platform styles inherit the
   identity status roles, so they inherit the edge with the fill — the new test
   holds a variant that overrides one without the other.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/090-soft-status-border-role.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the `090` row and its paragraph |
| `packages/tokens/src/color.ts` | four fields in `ThemeColors`, four values in each colour set, four `colorRoles` entries |
| `packages/tokens/src/styles.ts` | `statusTone().border` reads `xSoftBorder`; drop the `alpha` import; update the JSDoc |
| `packages/tokens/src/contrast.ts` | `softBorderPairs`; append to `contrastPairs`; update the JSDoc |
| `packages/tokens/src/status-soft-border.test.ts` | **new** — floors, the regression, the helper wiring, the public checker |
| `packages/tokens/src/contrast.test.ts` | pair count 105 → 109 |
| `packages/tokens/src/docs.test.ts` | status-table column assertion, the quoted regression figure, role-count comment |
| `packages/tokens/src/readme.test.ts` | the soft-edge sentence |
| `packages/tokens/README.md` | role count and the edge sentence |
| `docs/tokens.md` | role count, status section, both colour tables, verification |
| `docs/design-system.md` | role count, status family, state table, §9 floor table |
| `COMPONENTS.md` | the three design-system rows' counts and the new fact |
| `TODO.md` | tick the new row; bump the bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/color.ts`

In `ThemeColors`, after each `xSoftForeground` field, add:

```ts
  /** Edge around `infoSoft`; held to the divider floor on that fill. */
  readonly infoSoftBorder: string;
```

(and the same for `successSoftBorder`, `warningSoftBorder`,
`destructiveSoftBorder`, each naming its own soft role).

In `lightColors` and `darkColors`, after each `xSoftForeground` value, add the
values from §2.2. In `highContrastLightColors` and `highContrastDarkColors`, add
the values from §2.3. Every set keeps `satisfies ThemeColors`.

In `colorRoles`, after each `xSoftForeground` entry, add the matching
`xSoftBorder`. The array must stay in the same order as `ThemeColors`; the docs
tables are generated against it.

Also update the high-contrast set comments: the phrase "the same 54 roles"
becomes "the same 58 roles".

### 4.2 `packages/tokens/src/styles.ts`

- Remove `alpha` from the `./color.js` import (it is the only use in the file).
- In `statusTone`, replace `border: alpha(theme.colors[tone], 0.3),` with
  `border: theme.colors[`${tone}SoftBorder`],`.
- In `StatusToneStyle`, replace the `border` JSDoc:
  `/** The designed edge around the soft surface (`xSoftBorder`). */`
- The function JSDoc keeps its meaning; the example already spreads
  `tone.background`, `tone.border` and `tone.borderWidth` and needs no edit.

### 4.3 `packages/tokens/src/contrast.ts`

After `surfacePairs`, add:

```ts
/**
 * The designed edge around each soft status surface. It is a decorative border
 * on its own fill, so the divider floor applies: 1.05:1 by default and 3:1 at
 * high contrast, where the 30% mixture it replaced measured 1.12:1.
 */
const softBorderPairs: readonly ContrastPair[] = [
  ["infoSoftBorder", "infoSoft", "divider"],
  ["successSoftBorder", "successSoft", "divider"],
  ["warningSoftBorder", "warningSoft", "divider"],
  ["destructiveSoftBorder", "destructiveSoft", "divider"],
];
```

Append `...softBorderPairs` to `contrastPairs` (after `...surfacePairs` keeps
the surface family together; any position is legal, but the docs quote the
count). Extend the `contrastPairs` JSDoc sentence to name "the designed edge
around each soft status surface".

### 4.4 `packages/tokens/src/status-soft-border.test.ts` (new)

Header comment must state the defect:

```ts
/**
 * Guards the defect plan 090 fixed: the soft status edge was a 30%-alpha
 * mixture recomputed from the solid role, not a theme role, and no floor
 * measured it. On the high-contrast light theme the `warning` edge over
 * `warningSoft` measured 1.12:1 — under the 3:1 the design system gives a
 * decorative divider — and a copied platform style could not edit it.
 */
```

Tests (import only from `./index.js` and vitest):

1. **Every shipped set clears the divider floor on its own soft fill.** Build
   the set list: `getTheme("light")`, `getTheme("dark")`, `getTheme("light",
   "high")`, `getTheme("dark", "high")`, and `getPlatformTheme(platform, mode)`
   over `platformNames` × `["light", "dark"]` (skip `default`, which is the
   identity). For every `statusTones` tone, assert
   `contrastRatio(theme.colors[`${tone}SoftBorder`], theme.colors[`${tone}Soft`])`
   is `>= contrastFloors[theme.contrast].divider`.
2. **The exact regression.** Build the old value from the public helpers and
   assert both halves:

   ```ts
   const theme = getTheme("light", "high");
   const old = compositeOver(alpha(theme.colors.warning, 0.3), theme.colors.warningSoft);
   expect(contrastRatio(old, theme.colors.warningSoft)).toBeLessThan(3);
   expect(contrastRatio(theme.colors.warningSoftBorder, theme.colors.warningSoft)).toBeGreaterThanOrEqual(3);
   expect(theme.colors.warningSoftBorder).not.toBe(old);
   ```

   With the pre-fix `statusTone` the role does not exist, so this file cannot
   compile; the point of the two assertions is that restoring the mixture as the
   role's value fails the floor test and this one.
3. **The helper returns the role.** For each theme in the shipped list and each
   tone: `statusTone(theme, tone).border` equals
   `theme.colors[`${tone}SoftBorder`]`, and matches `/^#[0-9A-F]{6}$/` (opaque,
   so it can be measured).
4. **The public checker reports an erased edge.** `extendTheme(getTheme("light"),
   { colors: { warningSoftBorder: getTheme("light").colors.warningSoft } })`
   then `themeContrastFailures(...)` contains one failure with
   `foreground: "warningSoftBorder"`, `background: "warningSoft"`,
   `pairClass: "divider"`, `floor: 1.05`, `ratio: 1`.
5. **A brand edit is honest.** `extendTheme(getTheme("dark"), { colors: {
   infoSoftBorder: "#6E9CFF" } })` returns no failures for that pair (the edit
   is expressible and passes); this proves the role is reachable through the
   extension mechanism, which is the consumer story the plan fixes.

Use `Arr`-free plain vitest code: this package's tests are plain TypeScript, not
Effect tests, and its existing suites use `forEach` over arrays in test bodies.
Keep the file under ~90 lines.

### 4.5 `packages/tokens/src/contrast.test.ts`

- `expect(contrastPairs.length).toBe(105)` → `109`.
- The "every role is measured or exempt" test needs no change: the four new
  roles are measured by `softBorderPairs`.

### 4.6 `packages/tokens/src/docs.test.ts`

- Update the file header's role count to 58.
- The status-table test currently asserts this exact row shape:

  ```ts
  `| \`${tone}\` | \`${tone}\` / \`${tone}Foreground\` | \`${tone}Soft\` | \`${tone}SoftForeground\` | \`${tone}Text\` |`
  ```

  The table gains an `Edge on the soft surface` column before the last one, so
  the assertion becomes:

  ```ts
  `| \`${tone}\` | \`${tone}\` / \`${tone}Foreground\` | \`${tone}Soft\` | \`${tone}SoftForeground\` | \`${tone}SoftBorder\` | \`${tone}Text\` |`
  ```

- Add a quoted-figure test beside "quotes the status ratios the light palette
  produces":

  ```ts
  it("quotes the high-contrast soft edge and the mixture it replaced", () => {
    const high = highContrastThemes.light.colors;
    const old = compositeOver(alpha(high.warning, 0.3), high.warningSoft);
    const sentence =
      "At high contrast the edge is designed, not mixed: " +
      `\`warningSoftBorder\` (\`${high.warningSoftBorder}\`) is ` +
      `${contrastRatio(high.warningSoftBorder, high.warningSoft).toFixed(2)}:1 on ` +
      `\`warningSoft\`, where the 30% mixture it replaced measured ` +
      `${contrastRatio(old, high.warningSoft).toFixed(2)}:1, under the ` +
      `${contrastFloors.high.divider}:1 divider floor.`;
    expect(markdownProse).toContain(sentence);
  });
  ```

  This imports `alpha`, `compositeOver`, `contrastRatio`, `contrastFloors` and
  `highContrastThemes` — extend the existing import list; all are already
  imported or public.

### 4.7 `docs/tokens.md`

- §Colour roles: "There are 54 roles." → "There are 58 roles." In the status
  sentence, after the soft pair, add the edge: "…a soft pair (`xSoft` /
  `xSoftForeground`) with a designed edge (`xSoftBorder`) for alerts, badges and
  toasts…".
- Default colour table: after each `xSoftForeground` row add the matching
  `xSoftBorder` row with the §2.2 values and the use "edge around `xSoft`".
- High-contrast table: the same four rows with the §2.3 values.
- §Status tones: add the edge column to the table (after "Text on the soft
  surface"), and one paragraph:

  > The edge is a role, not a mixture: `xSoftBorder` is designed per tone and
  > measured on the fill it borders at the divider floor — 1.05:1 in the default
  > themes and 3:1 at high contrast. The 30%-alpha mixture it replaced measured
  > 1.12:1 on the high-contrast light `warning` surface, so the edge all but
  > disappeared exactly where the AAA theme requires it to be visible. Because
  > it is a role, a copied platform style edits it with the rest of the palette.

  Then the quoted sentence from §4.6 (exact wording, so the guard matches).
- `statusTone` example: `tone.border; // theme.colors.infoSoftBorder`.
- §High contrast: "the same 54 roles" → "the same 58 roles".
- §Verification: the soft-edge paragraph, and the pair count if the page states
  it. Search the page for "105" first; if absent, no count edit. Add after the
  soft-surface sentence: "The soft surface's own edge is a role too: `xSoftBorder`
  is held to the chart's divider floor on `xSoft`, so the 30% mixture that
  measured 1.12:1 at high contrast cannot come back."

### 4.8 `docs/design-system.md`

- §3: the status family sentence gains "and a designed edge (`xSoftBorder`)".
- §4: "exactly the same 54 roles" → "58 roles".
- §8 status row: "its soft pair through `statusTone(theme, tone)`" → "its soft
  pair and designed edge through `statusTone(theme, tone)`".
- §9 floor table: after the soft-surface row add

  ```
  | soft status edge (`xSoftBorder` on `xSoft`) | 1.05:1 | 3:1 |
  ```

- §9 "Not covered, deliberately" stays as it is.

### 4.9 `packages/tokens/README.md` and `readme.test.ts`

- README §High contrast: "same 54 roles" → "same 58 roles" (the test computes
  `colorRoles.length`, so it follows automatically; change the literal).
- README §Verification (find the paragraph that lists the soft surfaces and the
  skeleton): append one sentence:
  "Each soft status surface has a designed edge (`xSoftBorder`) held to the
  divider floor on that surface, so the 30% mixture that measured 1.12:1 at high
  contrast cannot return."
- `readme.test.ts`: add

  ```ts
  it("states the soft status edge is a measured role", () => {
    expect(readme).toContain(
      "Each soft status surface has a designed edge (`xSoftBorder`) held to the divider floor on that surface",
    );
  });
  ```

### 4.10 `COMPONENTS.md`

- Design tokens row: "54 semantic roles" → "58 semantic roles"; add to the
  contrast sentence that the soft status edge is a role held on its own fill
  (plan 090).
- High-contrast theme row: "same 54 roles" → "same 58 roles".
- Theme contrast check row: "the same 105 contrast pairs" → "109 contrast
  pairs", and in the narrative after the plan-088 sentence add:
  "Plan 090 gives the soft status edge a role, `xSoftBorder`, measured on its own
  fill at the divider floor; the 30% mixture it replaced measured 1.12:1 on the
  high-contrast light `warning` surface."

### 4.11 `TODO.md` and the plan index

- `TODO.md`, under "Design tokens and theming (`tokens-theme`)" add and tick:

  ```
  [x] Give the soft status edge a designed `xSoftBorder` role — the 30% mixture
  was unmeasured and measured 1.12:1 on the high-contrast light `warning` surface
  — and hold it to the divider floor on its own fill (plan 090)
  ```

- Bump the section bar `[████████░░] 57/75` → `[████████░░] 58/76`.
- `.agents/slop/plans/README.md`: add the table row

  ```
  | [090](./090-soft-status-border-role.md) | The soft status edge: a designed role, held to its floor | F | 014, 057, 071, 076, 083, 086 | done |
  ```

  after `089`, and a paragraph after the `089` paragraph summarizing: the edge
  was a 30% alpha mixture, not a role, unmeasured, 1.12:1 at AAA; four roles
  54 → 58, 105 → 109 pairs, default pixels unchanged, AAA steps designed.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes with 28 files (the new one included), type
check and `check` are clean, root `lint` and `test` pass.

**Two-direction proof, run before committing:**

1. Set `highContrastLightColors.warningSoftBorder` to `warningSoft` and run
   `nub run --filter @gpuixui/tokens test`: `status-soft-border.test.ts` must
   fail on the `warning` divider pair at 1.00:1 and on the exact-regression
   assertion. Restore the value.
2. Set `statusTone`'s border back to `alpha(theme.colors[tone], 0.3)` and run
   the suite: the helper-wiring test must fail (the returned value no longer
   equals a role), and the new role is no longer exercised by the helper.
   Restore the role read.
3. Confirm the final suite is green.

## 6. STOP conditions

- If `ThemeColors` values in a platform style file stop type-checking, **stop**
  and report the compiler error. Platform colours are `Partial<ThemeColors>`;
  adding fields must not require every style to carry them. Do not widen the
  type or add a cast.
- If a new role is reported as "neither measured nor exempt" by
  `contrast.test.ts`, stop: `softBorderPairs` was not appended to
  `contrastPairs`, or the role name does not match the tone.
- If the docs table test reports a length mismatch, the new rows are missing
  from one of the two tables or `colorRoles` order differs from `ThemeColors`;
  fix the order, do not loosen the assertion.
- If the default values change a shipped pixel, stop: recompute the composite
  with `compositeOver(alpha(theme.colors[tone], 0.3), theme.colors[`${tone}Soft`])`
  for the identity light/dark sets and use exactly that value.
- If the high-contrast value for any tone is below 3:1 on its soft fill, stop and
  pick the next ramp step; do not lower the floor.
- Do not edit `packages/components` even though it consumes `.border`; the
  delegation is the reason no component change is needed.

## 7. Acceptance

- [ ] Four `xSoftBorder` roles ship in every colour set and `colorRoles`.
- [ ] `statusTone(...).border` is the role, opaque, and `styles.ts` no longer
      imports `alpha`.
- [ ] Every shipped theme (platform variants included) clears the divider floor
      for all four soft edges on their own fills.
- [ ] The exact regression is guarded: the old 30% mixture is under 3:1 on the
      high-contrast light warning surface and the new role is over it.
- [ ] `themeContrastFailures` reports an erased edge and accepts a brand edit.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` state the role, the floor and the regression; the docs
      guards build those sentences from the implementation.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The plan index row is marked done and the `TODO.md` row is ticked.
