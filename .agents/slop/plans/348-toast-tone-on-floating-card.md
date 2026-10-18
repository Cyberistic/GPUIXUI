# Plan 348 — The toast's tone on its floating card

**Phase:** F · **Owner:** `tokens-theme` · **Status:** done
**Depends on:** 071 (the public contract), 074 (status text on a floating
surface), 332 (a fill painted as a mark), 334 (holding a shipped composition
until its migration lands), 339 (field chrome text), 346 (a status panel's
caption and link), 347 (the value indicator's track).
**Owns:** `packages/tokens/src/contrast.ts`,
`packages/tokens/src/toast-tone.test.ts` (new),
`packages/tokens/src/contrast.test.ts`, `packages/tokens/src/docs.test.ts`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

The shipped Toast paints its tone glyph and its 3px tone bar with
`statusTone(...).foreground` — the soft pair's own foreground (`xSoftForeground`),
a role designed for the `xSoft` fill — directly on the toast card, which is
`popover`
(`packages/components/src/toast/viewport.tsx`: `color: palette.fg` on the glyph
at line 117 and `backgroundColor: palette.fg` on the bar at line 96).

`contrastPairs` measures each `xSoftForeground` on its **own** `xSoft` fill
(`["infoSoftForeground", "infoSoft", "body"]`, and the other three). It measures
`popoverForeground` and `mutedForeground` on `popover`, but not a soft
foreground. So an edited platform style or brand theme that sets
`warningSoftForeground` close to its `popover` erases the warning glyph and the
tone bar of a toast while `themeContrastFailures` returns `[]`.

This is the same class as plan 334: a **shipped** composition that the
`components` workstream already has a migration row for (to
`statusTone(...).text`, the plain-surface role). Until that lands, the contract
must hold what is on screen — the precedent plan 334 set for the secondary
Button's generic washes.

## 2. The decision

Hold the four soft foregrounds on `popover` in the public contract:

```ts
export const toastTonePairs: readonly ContrastPair[] = statusTones.flatMap(
  (tone) => [[`${tone}SoftForeground`, "popover", "secondary"]],
);
```

- Pair class `secondary` (4.5:1 default, 7:1 at AAA). The glyph is a label/icon;
  the 3px bar is a mark, whose floor (3:1 / 4.5:1) the secondary floor already
  exceeds, so one pair per tone covers both paints.
- Contrast pairs move **333 → 337**.
- No colour moves: every shipped set measures **11.97:1** at the tightest
  (Linux dark `infoSoftForeground` on `popover`; see §3.2).

### 2.1 Why not rely on the cross-team migration

The migration is `components`' work and is recorded. It may not land before the
package is consumed, and the library's promise is that an edited theme cannot
erase shipped UI. Plan 334 kept the secondary Button's generic washes for the
same reason; the pair is documented as the shipped composition, not as the
recommended one.

### 2.2 The measured ratios

Every shipped theme passes. The tightest four (all dark, all far above the
floor):

| Theme | Role on `popover` | Ratio |
| ----- | ----------------- | ----- |
| Linux dark | `infoSoftForeground` | 11.975:1 |
| Linux dark | `destructiveSoftForeground` | 12.007:1 |
| macOS dark | `infoSoftForeground` | 12.645:1 |
| Aero / XP dark | `infoSoftForeground` | 12.847:1 |

The light platform variants inherit the identity soft foregrounds and measure
12.72–16.73:1; AAA measures 14.91–17.18:1.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/contrast.ts`

After `softPanelTextPairs` (search `export const softPanelTextPairs`) add:

```ts
/**
 * The soft tone foreground a Toast paints on its floating card. The shipped
 * `toast/viewport.tsx` paints its tone glyph and its 3px bar with
 * `statusTone(...).foreground` (`xSoftForeground`) directly on the `popover`
 * card, not on the soft fill the role is designed for. The `components`
 * migration to `statusTone(...).text` is recorded cross-team; until it lands
 * this pair keeps the glyph (and, being stricter, the bar's mark) visible in an
 * edited theme.
 */
export const toastTonePairs: readonly ContrastPair[] = statusTones.flatMap(
  (tone): ReadonlyArray<ContrastPair> => [
    [`${tone}SoftForeground`, "popover", "secondary"],
  ],
);
```

In `contrastPairs`, after `...softPanelTextPairs,` add `...toastTonePairs,`.

In the JSDoc above `contrastPairs`, extend the sentence that ends the status
panel clause with: "A Toast paints its tone glyph and bar with the soft
foreground on its floating `popover` card, so the four soft foregrounds are held
there too (`toastTonePairs`) until the `components` migration to `xText`."

### 3.2 `packages/tokens/src/toast-tone.test.ts` (new)

Header comment states the bug: a copied theme that sets
`warningSoftForeground` to its `popover` erases the toast glyph and bar while
the checker returns `[]`.

`variants` follows `track-contrast.test.ts`: `themeModes × themeContrasts ×
{identity, real platforms, recipes}`.

Cases:

1. `"publishes the four tone pairs on the floating card"` — exact tuples from
   `toastTonePairs` and that each is in `contrastPairs`.
2. `"every shipped toast tone clears the secondary floor on its card"` — loop
   `variants`, ratio of `xSoftForeground` on `popover` is `>= floors.secondary`;
   record the tightest and assert it is `12` (documents the margin).
3. `"a soft foreground that matches the floating card is reported"` —
   `extendTheme(lightTheme, { colors: { warningSoftForeground:
   lightTheme.colors.popover } })` yields a `secondary` failure with
   `foreground: "warningSoftForeground"` and `background: "popover"`. This case
   fails before §3.1 (the checker returns `[]`).
4. `"the pair covers the tone bar's mark floor"` — assert the secondary floor is
   at least the mark floor at both contrast levels, so the 3px bar is covered by
   the same pair rather than a second class.

### 3.3 `packages/tokens/src/contrast.test.ts`

- Bump the exact pair count `333` → `337`.
- Add plan 348 to the header comment's plan list.

### 3.4 `packages/tokens/src/docs.test.ts`

- The pair-count history sentence must now read
  `taking it from 333 to **${contrastPairs.length}**` (the hard-coded `323` is
  the previous sentence's start).
- The audit range sentence: `plans \`076\`–\`347\` closed` → `…–\`348\` closed`.

### 3.5 `docs/tokens.md`

- Pair-count history: after the plan 347 sentence, append "Plan `348` holds the
  soft tone foreground a Toast paints on its floating card — the four
  `xSoftForeground` roles on `popover` — taking it from 333 to **337**."
- Audit range sentence: `plans 076–347` → `plans 076–348`.
- In the status-tones section (near the `xText` rationale), add one short
  paragraph: the shipped Toast paints its glyph and 3px bar with the soft
  foreground on its `popover` card; the pair is held at the secondary floor
  until the `components` migration to `xText`, and every shipped set clears it
  (11.97:1 at the tightest, Linux dark).

### 3.6 `docs/design-system.md`

- §8 `status` row: append ", and a Toast's tone glyph is a shipped exception —
  it paints `xSoftForeground` on the `popover` card rather than `xText`, so that
  pair is held until the migration lands".
- No count changes: this document derives role/pair counts elsewhere and does
  not quote the contrast-pair total.

### 3.7 `COMPONENTS.md`

- `Theme contrast check` row: `the same 333 contrast pairs` → `337`, and append
  a plan 348 sentence after the plan 347 one.
- `Status tones` row: append one sentence naming the toast exception and the
  guarded pair.

### 3.8 `TODO.md` and the plan index

- Add under the tokens section, ticked:
  `[x] Hold the Toast's tone on its floating card — it paints
  \`xSoftForeground\` on \`popover\` for its glyph and 3px bar, which the contract
  measured only on its own soft fill, so an edited theme could erase a toast's
  tone while the checker returned \`[]\`; every shipped set passes (11.97:1 at the
  tightest), so no colour moves and the contract grows 333 → 337 (plan 348)`.
- Progress bar: `115/150` → `116/151`.
- In the existing cross-team Toast row, add "(the shipped pair is held by plan
  348 until this lands)".
- Plan index: add a 348 row with status `done` and a short paragraph.

## 4. Commands and expected results

```bash
nub run --filter @gpuixui/tokens test
# 68 test files, all passing.
nub run --filter @gpuixui/tokens check-types
# tsc exits 0.
nub run lint
# oxlint exits 0.
```

**Two-direction proof.** Write `toast-tone.test.ts` first and run
`cd packages/tokens && nub exec vitest run src/toast-tone.test.ts` against the
unchanged `contrast.ts`: case 3 must fail because `themeContrastFailures` returns
`[]` (`toastTonePairs` does not exist yet, so cases 1 and 3 fail). Then add
§3.1 and the same command must pass. Finally, set the identity light
`warningSoftForeground` to its `popover` value in `color.ts`, confirm case 2
fails, and restore it.

## 5. STOP conditions

- STOP if any shipped theme needs a colour moved to clear the new pairs. The
  audit found every set at ≥11.97:1; if a set fails, report it rather than
  changing a shipped value.
- STOP if `contrast.test.ts`'s uniqueness guard reports a duplicate — check the
  four pairs are not already present under another name.
- STOP if the docs test's pair-history parser expects a different previous
  count; report the expectation.
- Do not edit `packages/components` in this workstream; the migration stays a
  cross-team row.

## 6. Acceptance

- `toastTonePairs` is exported and included in `contrastPairs`;
  `contrastPairs.length` is 337.
- Every shipped theme passes the four pairs at its declared secondary floor.
- A theme that sets a soft foreground equal to its `popover` is reported.
- The catalogue, design system, inventory and plan index agree with the
  implementation; pair counts are derived or updated.
- `nub run check`, `nub run lint` and `nub run test` pass.
