# 014 — Status tones and colour helpers

**Workstream:** `tokens-theme`
**Phase:** B (working foundation), extending the delivered plan 011
**Depends on:** plan 011 (the implemented `@gpuixui/tokens`), plan 013 (high-contrast sets)
**Files owned:** `packages/tokens/**`, `docs/tokens.md`, `docs/design-system.md`,
this plan, `.agents/slop/plans/README.md` (index row only), `TODO.md` (this
workstream only), `COMPONENTS.md` (design-system section only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order. Where a value is given, use it exactly.

---

## 1. Why

Plans 011 and 013 shipped 37 semantic roles. The `components` workstream read the
package and recorded three interlocks it cannot solve itself
(`workspaces/components/TODO.md`, `workspaces/components/.agents/slop/plans/110-package-components.md` §6):

1. **No `info` role.** Alert, Badge and Toast borrow `accent`/`accentForeground`
   for their informational tone, so an info alert looks exactly like a primary
   action.
2. **No soft status surfaces.** The adapter mints its own tones by mixing
   `alpha(solid, 12%)` at runtime, including a **mode-dependent special case**:
   light mode uses `warningForeground` because `warning` (`amber[400]`) is
   unreadable on a pale tint. That is exactly the per-component colour decision
   the semantic model exists to prevent.
3. **No `alpha` helper.** Every consumer that needs a translucent variant of a
   token re-implements 6- or 8-digit hex parsing.

This plan adds the status tone roles, an `alpha` colour helper and a
`statusTone` lookup so those three interlocks are deleted, not worked around.

It is an intentional change to the **role set** — the sanctioned fix per
`docs/design-system.md` §3 ("If a component needs a value with no semantic home,
the role set is incomplete — add a role").

## 2. Design decisions (do not re-litigate)

1. **`info` is its own ramp, not iris.** Info must be distinguishable from
   `primary`. The palette gains one ramp, `blue`, used only by the status roles.
2. **Soft tones are designed values, not runtime alpha.** Each theme carries
   `xSoft` / `xSoftForeground` pairs, so the readable foreground is chosen once,
   per mode, and the `warningForeground` special case disappears.
3. **`StatusTone` is the four status families** `info | success | warning | destructive`.
   Their names are all `keyof ThemeColors`, which is what makes `statusTone`
   total and typed without a lookup table of literals.
4. **`alpha` is total**: an unrecognised colour is returned unchanged, so a
   non-hex value stays solid rather than silently becoming transparent.
5. The role count goes **37 → 47**. Every document that states a count is updated
   in the same commit; no count may drift.

## 3. Exact values

### 3.1 New palette ramp (`color.ts`)

Add to `palette` after `neutral` (a cool ramp that reads as "information", kept
clear of iris so `info` never collides with `primary`):

```ts
  blue: {
    50: "#EFF4FF",
    100: "#DEE9FF",
    200: "#C5D8FF",
    300: "#9FBEFF",
    400: "#6E9CFF",
    500: "#3B76F6",
    600: "#2559D6",
    700: "#1B45AC",
    800: "#173A88",
    900: "#152F6B",
    950: "#0C1D42",
  },
```

The ramp is strictly darker step by step (verified with the WCAG relative
luminance used by the tests).

### 3.2 Ten new roles

`ThemeColors` gains ten roles. Insert them in this order, after
`warningForeground` and before `border`:

```ts
  /** Informational status, distinct from `primary`. */
  readonly info: string;
  /** Text and icons on `info`. */
  readonly infoForeground: string;
  /** Soft informational surface for alerts, badges and toasts. */
  readonly infoSoft: string;
  /** Text and icons on `infoSoft`. */
  readonly infoSoftForeground: string;
  /** Soft success surface. */
  readonly successSoft: string;
  /** Text and icons on `successSoft`. */
  readonly successSoftForeground: string;
  /** Soft warning surface. */
  readonly warningSoft: string;
  /** Text and icons on `warningSoft`. */
  readonly warningSoftForeground: string;
  /** Soft destructive surface. */
  readonly destructiveSoft: string;
  /** Text and icons on `destructiveSoft`. */
  readonly destructiveSoftForeground: string;
```

### 3.3 Values per colour set

| Role | `lightColors` | `darkColors` | `highContrastLightColors` | `highContrastDarkColors` |
| ---- | ------------- | ------------ | ------------------------- | ------------------------ |
| `info` | `blue.600` `#2559D6` | `blue.300` `#9FBEFF` | `blue.700` `#1B45AC` | `blue.200` `#C5D8FF` |
| `infoForeground` | `neutral.0` `#FFFFFF` | `neutral.950` `#11141A` | `#FFFFFF` | `#000000` |
| `infoSoft` | `blue.100` `#DEE9FF` | `blue.900` `#152F6B` | `blue.200` `#C5D8FF` | `blue.900` `#152F6B` |
| `infoSoftForeground` | `blue.800` `#173A88` | `blue.100` `#DEE9FF` | `blue.950` `#0C1D42` | `blue.100` `#DEE9FF` |
| `successSoft` | `green.100` `#D3F9E2` | `green.900` `#0A3A26` | `green.200` `#A8F0C6` | `green.900` `#0A3A26` |
| `successSoftForeground` | `green.800` `#0E5135` | `green.100` `#D3F9E2` | `green.950` `#042015` | `green.100` `#D3F9E2` |
| `warningSoft` | `amber.100` `#FFEFC6` | `amber.900` `#4B3100` | `amber.200` `#FFDE8A` | `amber.900` `#4B3100` |
| `warningSoftForeground` | `amber.900` `#4B3100` | `amber.100` `#FFEFC6` | `amber.950` `#2A1B00` | `amber.100` `#FFEFC6` |
| `destructiveSoft` | `red.100` `#FFE0E0` | `red.900` `#5C1619` | `red.200` `#FFC6C6` | `red.900` `#5C1619` |
| `destructiveSoftForeground` | `red.800` `#7E1D21` | `red.100` `#FFE0E0` | `red.950` `#3A0B0D` | `red.100` `#FFE0E0` |

Where a ramp step is named, read the value from `palette` in the source; the hex
in the table is the resolved value and must match.

In dark mode the same step-900 soft fills satisfy both the default and the
high-contrast floors, so `highContrastDarkColors` reuses them. That is honest —
the high-contrast variant raises the *text and boundary* floors, and step 900
already clears them.

### 3.4 Floors these values were chosen to meet

Computed with the WCAG 2 relative-luminance formula the test uses.

| Pair class | Default floors | High-contrast floors | Worst achieved |
| ---------- | -------------- | -------------------- | -------------- |
| `xSoftForeground` on `xSoft` | 7:1 | 7:1 | 8.15 (light `successSoft`) |
| `infoForeground` on `info` | 4.5:1 | 7:1 | 6.04 (light `info`) |
| `xSoft` against `background` and `card` | 1.05:1 | 1.05:1 | 1.071 (light `successSoft` vs canvas) |

The `xSoft` floor is the honest one: a soft status surface must be perceivable as
a distinct surface rather than exactly the canvas or card colour. It is
deliberately low because a *soft* fill is a tint, and the border and text carry
the meaning. The test still fails if a soft value is set to the canvas or card.

## 4. `alpha` helper (`color.ts`)

```ts
/**
 * Return `color` with an alpha channel, as an 8-digit hex colour.
 *
 * `amount` is clamped to `0…1` and rounded to the nearest byte. A 6-digit
 * `#RRGGBB` gains an alpha byte; an 8-digit `#RRGGBBAA` has its alpha replaced.
 * A colour the parser does not recognise is returned unchanged, so a non-hex
 * value renders solid rather than transparent.
 *
 * @example
 * ```ts
 * alpha("#2559D6", 0.3); // "#2559D64D"
 * ```
 */
export function alpha(color: string, amount: number): string
```

Rules:

- accepted input: `/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/`; everything else is
  returned unchanged (including `transparent`, named colours and `rgb(...)`);
- output is normalised to upper case;
- rounding is `Math.round`, so `0.5` is `#…80` and `0.3` is `#…4D`;
- no `throw`, no `Option`: this is a total colour helper, not a parser boundary.

## 5. `statusTone` helper (`styles.ts`)

```ts
/** The four status colour families a component can announce. */
export type StatusTone = "info" | "success" | "warning" | "destructive";

/** The soft status style roles an Alert, Badge or Toast spreads. */
export interface StatusToneStyle {
  /** Soft status surface (`xSoft`). */
  readonly background: string;
  /** Readable text and icons for that surface (`xSoftForeground`). */
  readonly foreground: string;
  /** The tone's solid colour at 30% alpha, for the surface edge. */
  readonly border: string;
}

/**
 * Resolve a status tone to the roles a soft status surface needs.
 *
 * @example
 * ```tsx
 * const tone = statusTone(theme, "info");
 * <div style={{ backgroundColor: tone.background, borderColor: tone.border }}>
 * ```
 */
export function statusTone(theme: Theme, tone: StatusTone): StatusToneStyle
```

Implementation: `background: theme.colors[`${tone}Soft`]`,
`foreground: theme.colors[`${tone}SoftForeground`]`,
`border: alpha(theme.colors[tone], 0.3)`. Each tone name is itself a
`ThemeColors` role, so the template-literal keys are all known to the type
checker and no runtime lookup table is needed.

## 6. Files to change

```
packages/tokens/src/color.ts                blue ramp; 10 roles; 4 sets; alpha()
packages/tokens/src/styles.ts               StatusTone, StatusToneStyle, statusTone()
packages/tokens/src/status-tone.example.ts  new, runnable example
packages/tokens/src/color.test.ts           +alpha tests; +tone pairs; +soft-surface test
packages/tokens/src/styles.test.ts          +statusTone tests; +example assertion
package-tokens README.md                    role count, helpers, extension note
docs/tokens.md                              role count, both role tables, helpers, status section
docs/design-system.md                       role count, status tones, floor table
COMPONENTS.md                               design-system rows
TODO.md                                     one task, ticked
.agents/slop/plans/README.md                index row for this plan
```

`packages/tokens/src/index.ts` needs no change: `color.js` and `styles.js` are
already re-exported with `export *`.

## 7. Test plan

Every test must be able to fail. No test asserts a literal against itself.

### 7.1 `color.test.ts`

Add to the existing `pairs` list (the list is already run against all four
colour sets with per-set floors):

```ts
["infoForeground", "info", "secondary"],
["infoSoftForeground", "infoSoft", "body"],
["successSoftForeground", "successSoft", "body"],
["warningSoftForeground", "warningSoft", "body"],
["destructiveSoftForeground", "destructiveSoft", "body"],
```

Add a describe block that fails if a soft surface is invisible:

```ts
const softRoles = ["infoSoft", "successSoft", "warningSoft", "destructiveSoft"] as const;
```

For each colour set and each soft role, assert
`contrast(colors[role], colors.background) >= 1.05` and
`contrast(colors[role], colors.card) >= 1.05`.

Add a `describe("alpha")` block:

- `alpha("#2559D6", 0.3) === "#2559D64D"`;
- `alpha("#2559D680", 0.5) === "#2559D680"` (replaces the existing alpha);
- `alpha("#2559D680", 1) === "#2559D6FF"` and `alpha("#2559D6", 0) === "#2559D600"`;
- `alpha("#2559D6", 2) === "#2559D6FF"` and `alpha("#2559D6", -1) === "#2559D600"` (clamping);
- `alpha("transparent", 0.5) === "transparent"` and
  `alpha("rgb(1, 2, 3)", 0.5) === "rgb(1, 2, 3)"` (unrecognised is unchanged);
- `alpha("#2559d6", 0.3) === "#2559D64D"` (output is upper case);
- round-trip: `alpha(alpha("#2559D6", 0.3), 1) === "#2559D6FF"`.

The existing "defines the same roles in every theme" test covers the ten new
roles automatically.

### 7.2 `styles.test.ts`

Add `describe("statusTone")`:

- for each tone in `["info", "success", "warning", "destructive"]` and both
  `lightTheme` / `darkTheme`: `background` is `theme.colors[tone + "Soft"]`,
  `foreground` is `theme.colors[tone + "SoftForeground"]`,
  `border` is `alpha(theme.colors[tone], 0.3)`;
- the four tones in one theme resolve to four distinct backgrounds (guards a
  copy-paste mapping bug);
- light and dark agree on nothing: `statusTone(lightTheme, "info").background !==
  statusTone(darkTheme, "info").background`;
- `statusTone(highContrastLightTheme, t)` returns the high-contrast values for
  all four tones.

Assert the runnable example:

- `statusToneStyles(lightTheme, "warning").container.backgroundColor` is
  `lightTheme.colors.warningSoft`;
- `.text.color` is `lightTheme.colors.warningSoftForeground` and `.text.fontSize`
  is the `label` role size.

### 7.3 Two-direction proof (required)

The soft-text floor is the load-bearing assertion. Prove it can fail:

1. Temporarily set `lightColors.destructiveSoftForeground` to `#8E8E8E` in
   `color.ts`.
2. `nub run --filter @gpuixui/tokens test` — capture the failure and its ratio.
3. Restore the value; run again — capture the pass.

Record both outputs in the commit body. Do not claim the proof without running
both directions.

## 8. Documentation

### 8.1 `docs/tokens.md`

- colour role table: add the ten rows in interface order;
- high-contrast role table: add the same ten rows;
- replace every "37 roles" with "47 roles";
- add an **`alpha`** subsection next to the palette ramps (signature, the
  unchanged-input rule, the example);
- add a **Status tones** subsection after the colour roles: the four tones, the
  `statusTone` snippet, and the note that soft foregrounds are designed per mode
  rather than mixed at runtime;
- Add `alpha` and `statusTone` to the import snippet and the helper list.

### 8.2 `docs/design-system.md`

- §3: note that the status families are `info`/`success`/`warning`/`destructive`,
  each with a solid and a soft pair, and that `info` has its own blue ramp so it
  cannot be confused with `primary`;
- §4: update the role count to 47;
- §8: add a row for the soft status surface;
- §9: add the soft-text floor (7:1) and the "soft surface is perceivable" floor
  (1.05:1) to the table;
- §10: no change.

### 8.3 `packages/tokens/README.md`

Role count; a short "Status tones" note with the `statusTone` snippet; `alpha` in
the helpers; the motion-token limitation now points at a real `TODO.md` item.

### 8.4 `COMPONENTS.md`

Update the existing "Design tokens" row (role count, test count) and add:

| Status tones | done | yes (values in a `Theme`) | `info` + soft `info`/`success`/`warning`/`destructive` pairs; `statusTone(theme, tone)` and `alpha(color, amount)`; contrast test covers the soft pairs at 7:1. |

### 8.5 `TODO.md`

Under "Design tokens and theming (`tokens-theme`)": add and tick
`[x] Add status tone roles, alpha and statusTone helpers`, keep the progress bar
and totals consistent, and add the pending motion-token item the README promises:

`[ ] Add motion tokens (durations/easings) once a component consumes them`

## 9. Execution steps

1. Write `packages/tokens/src/` changes: `color.ts`, `styles.ts`,
   `status-tone.example.ts`.
2. `nub run --filter @gpuixui/tokens check-types` — expect exit 0.
3. Update `color.test.ts` and `styles.test.ts`.
4. `nub run --filter @gpuixui/tokens test` — expect all pass.
5. Run the two-direction proof (§7.3) and record both outputs.
6. Update the README, both documents, `COMPONENTS.md`, `TODO.md`.
7. `nub run check`, `nub run lint`, `nub run test` — expect exit 0.
8. Commit: `feat(tokens): status tones, alpha and statusTone helper`.
9. Add this plan's row to `.agents/slop/plans/README.md` and tick `TODO.md`.

## 10. STOP conditions

- If any §3.3 value fails a §3.4 floor, stop and report the pair and ratios. Do
  not lower a floor; do not ship a value the test rejects.
- If `theme.colors[`${tone}Soft`]` does not type-check, fall back to an explicit
  `Readonly<Record<StatusTone, { surface: keyof ThemeColors; foreground: keyof ThemeColors }>>`
  and record the deviation; do not cast.
- If a document stating "37 roles" is missed, stop and find it before committing:
  `rg -n "37 (semantic )?roles|same 37 roles" --glob '!nub.lock'`.
- If a consumer outside this workstream breaks, stop and report; do not edit
  another workstream's files.
- If `nub run check` fails for a reason outside `packages/tokens` and `docs`,
  report it and leave it alone.

## 11. Acceptance criteria

- [ ] `blue` ramp, ten new roles and `alpha` exist in `color.ts`, JSDoc'd, with
      `satisfies ThemeColors` on all four sets.
- [ ] `statusTone` and `StatusTone`/`StatusToneStyle` exist in `styles.ts`, JSDoc'd.
- [ ] The contrast test covers the soft pairs in all four sets and the soft
      surfaces' minimum separation, and has been shown to fail on a regressed
      value.
- [ ] `status-tone.example.ts` exists and is asserted by `styles.test.ts`.
- [ ] Every role count in `README.md`, `docs/tokens.md`, `docs/design-system.md`
      and `COMPONENTS.md` says 47 and matches `ThemeColors`.
- [ ] Both role tables list all 47 roles in interface order.
- [ ] The motion-token limitation in `packages/tokens/README.md` points at a real
      `TODO.md` item.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
