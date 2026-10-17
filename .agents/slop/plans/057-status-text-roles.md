# 057 — Status text roles: a readable status tonality on plain surfaces

| Field | Value |
| ----- | ----- |
| Phase | B (working foundation) — closes a hole in the status-tone contract |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `010–019`, `050–056` (all landed) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order. Where a value is given, use it exactly.

---

## 1. Why — the defect this fixes

The four status families ship two tonalities: a **solid** role
(`info`/`success`/`warning`/`destructive`) for fills, and a **soft** pair
(`xSoft` / `xSoftForeground`) for tinted surfaces. There is no role for status
**text, icons or indicator dots drawn directly on `background` or `card`**.

That is not a style preference, it is a measurable hole:

- `warning` is `#F5B01F` in the light theme. Against `background` (`#F6F8FA`)
  that is **1.78:1**, and against `card` (`#FFFFFF`) **1.79:1**. In the
  high-contrast light theme it is **1.89:1**. WCAG 1.4.11 requires 3:1 for a
  meaningful non-text indicator and 4.5:1 for text, so a warning dot or label is
  invisible today.
- `success` is **4.26:1** against the light `background` — under the 4.5:1 text
  floor even though it is the only green status colour.

Components already need this colour: the `components` workstream's local
`tone()` helper uses `theme.colors.warning` as a foreground and its `Avatar`
status dot uses `theme.colors.success` / `theme.colors.warning` directly. Its
TODO records both as interlocks waiting on `@gpuixui/tokens`. Mixing a text
colour out of a fill role is exactly what `docs/design-system.md` §3 forbids.

**Decision (do not re-litigate):** add a *third tonality* per family —
`infoText`, `successText`, `warningText`, `destructiveText` — with the contract
"readable status text and indicators on `background` and `card`". Do **not**
darken `warning` itself: it is tuned as a solid fill with a dark
`warningForeground` on it, and one value cannot satisfy both jobs (a fill that
carries `warningForeground` at 4.5:1 and a foreground that is 3:1 on white have
contradictory luminance requirements — 7:1 black-on-fill and 3:1 fill-on-white
meet at exactly one luminance). Radix solves this with a separate step 11; so do
we.

These roles are not a second name for an existing role: their use, their
contrast contract and (in three of four colour sets) their values differ from
both the solid and the soft foreground.

## 2. Exact values

Ramp steps already exist in `palette`; read them from the source and use these
resolved hex values. Do not invent a step.

| Role | `lightColors` | `darkColors` | `highContrastLightColors` | `highContrastDarkColors` |
| ---- | ------------- | ------------ | ------------------------- | ------------------------ |
| `infoText` | `blue.700` `#1B45AC` | `blue.200` `#C5D8FF` | `blue.800` `#173A88` | `blue.200` `#C5D8FF` |
| `successText` | `green.700` `#116A43` | `green.200` `#A8F0C6` | `green.800` `#0E5135` | `green.200` `#A8F0C6` |
| `warningText` | `amber.700` `#8E5B00` | `amber.200` `#FFDE8A` | `amber.800` `#6B4500` | `amber.200` `#FFDE8A` |
| `destructiveText` | `red.700` `#A5262B` | `red.200` `#FFC6C6` | `red.800` `#7E1D21` | `red.200` `#FFC6C6` |

Measured contrast (background / card), computed with the test's WCAG formula:

| Set | `infoText` | `successText` | `warningText` | `destructiveText` | Floor |
| --- | ---------- | ------------- | ------------- | ----------------- | ----- |
| light | 7.91 / 8.42 | 6.23 / 6.63 | 5.41 / 5.76 | 6.77 / 7.21 | 4.5 |
| dark | 9.91 / 9.07 | 11.30 / 10.34 | 12.04 / 11.03 | 9.34 / 8.55 | 4.5 |
| HC light | 10.51 | 9.35 | 8.48 | 10.07 | 7 |
| HC dark | 14.64 / 13.55 | 15.94 / 14.76 | 16.07 / 14.87 | 14.15 / 13.09 | 7 |

`darkColors` and `highContrastDarkColors` share the same values; that is honest
(the 200 steps already clear both floors on both dark canvases).

## 3. Files to create or change

All paths relative to the **tokens-theme worktree**.

| Path | Action |
| ---- | ------ |
| `packages/tokens/src/color.ts` | insert four `readonly …Text: string` fields in `ThemeColors` after `destructiveSoftForeground`; add four values to each of the four colour sets; insert the four names in `colorRoles` between `destructiveSoftForeground` and `border`; update the "same 49 roles" comments |
| `packages/tokens/src/styles.ts` | `StatusToneStyle` gains `readonly text: string`; `statusTone()` returns `text: theme.colors[\`${tone}Text\`]`; JSDoc explains surface vs plain usage |
| `packages/tokens/src/status-text.example.ts` | **create** — an inline warning message, a status dot and a status label, all read from `statusTone(theme, …).text` |
| `packages/tokens/src/color.test.ts` | add `[xText, background, "secondary"]` and `[xText, card, "secondary"]` pairs for all four tones |
| `packages/tokens/src/styles.test.ts` | assert `statusTone(...).text` is the tone's `xText` role and that it survives the high-contrast theme; assert the example uses the role |
| `packages/tokens/src/docs.test.ts` | only the header comment's role count (the guard derives the tables from `colorRoles`) |
| `packages/tokens/README.md` | role count 49 → 53 |
| `docs/tokens.md` | role count, four rows in each colour table (default and high-contrast), a paragraph in `## Status tones`, a row in the accessibility/verification text |
| `docs/design-system.md` | §3 status paragraph, §8 status row, §9 accessibility table row, role count |
| `COMPONENTS.md` | design-system token row count + status row; one new cross-team row for `components` |
| `TODO.md` | one task under the tokens block, ticked |
| `.agents/slop/plans/README.md` | index row for `057` |

**Do not touch** `theme.ts`, `elevation.ts`, `typography.ts`, `scale.ts`,
`platforms.ts`, `motion.ts` — nothing in this plan changes the `Theme` shape;
`extendTheme` already merges `colors` key by key, so the new roles are
overridable for free. Add no new group and no new helper beyond `statusTone`'s
field.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test        # expected: exit 0, 227+ tests (12 files)
nub run --filter @gpuixui/tokens check-types # expected: exit 0
nub run check                                # expected: exit 0 (check-tests, lint, fmt, types)
nub run test                                 # expected: exit 0 for every workspace
nub run lint                                 # expected: exit 0
```

## 5. STOP conditions

Stop and report instead of improvising if:

- any of `infoText`/`successText`/`warningText`/`destructiveText` already exists
  under another name (re-read `color.ts` first — the branch may have moved);
- a proposed value fails its floor after the docs and palette are updated —
  **do not lower the floor**; re-pick a ramp step and report the change;
- you are tempted to darken `warning`, `success` or the soft pairs to make the
  new roles unnecessary — that changes the fill contract and is out of scope;
- the docs table parser rejects the new rows because of ordering — fix the
  ordering, never the parser.

## 6. Test plan

1. **`color.test.ts` — the guard that can fail.** The pair list gains the eight
   new pairs. In the light set `warningText` is `amber.700`; reverting it to
   `warning`'s `amber.400` makes the test fail at 1.78 < 4.5. Prove both
   directions with `scripts/verify-two-directions.sh` (or by hand: edit, run,
   observe the failure, revert, run, observe green) and record the result in the
   commit message.
2. **`styles.test.ts`** — `statusTone(lightTheme, "warning").text` is
   `lightTheme.colors.warningText`; the same for the high-contrast theme; the
   example's label colour equals the role. These fail if `statusTone` forgets
   the field or reads the wrong key.
3. **`docs.test.ts`** — already fails unless both documentation tables carry the
   four rows in `colorRoles` order and the stated count matches. Run it before
   touching the docs to see it fail (it will), then after.
4. **`check-tests`** — every new `it` asserts a real comparison; no stubbed
   values.

## 7. Acceptance criteria

- Four `xText` roles exist in every colour set, are exported through
  `colorRoles`, and meet 4.5:1 on `background` and `card` (7:1 in high contrast).
- `statusTone` exposes them as `text` with JSDoc that states where they apply.
- A runnable, typechecked example shows status text, an icon/dot and a label.
- `docs/tokens.md` and `docs/design-system.md` name every new role, the three
  tonalities, and the reason the solid `warning` is not a text colour.
- `COMPONENTS.md` records the roles and the `components` interlock.
- Every gate in §4 exits 0, and the failing direction of the contrast test was
  observed, not assumed.
