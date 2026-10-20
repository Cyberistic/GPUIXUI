# 729 — The soft status panel's caption is not a tier below its ink

**Workstream:** `tokens-theme` · **Phase:** F (contract truth) · **Status:** done
**Paths:** `packages/tokens/src`, `packages/tokens/README.md`, `docs/tokens.md`,
`docs/design-system.md`, `COMPONENTS.md`, `TODO.md`

## 1. The defect

A tone-tinted status panel (`infoSoft`/`successSoft`/`warningSoft`/
`destructiveSoft`) carries two text tiers on the same fill:

- its description / body, painted `foreground` (`softBodyPairs`, plan 320) and
  its title / glyph, painted the panel's own ink `xSoftForeground`
  (`contrast.ts` `statusTone` → `styles.ts`);
- its caption / supporting line, painted `mutedForeground`
  (`softPanelTextPairs`, plan 346).

`themeTextTierFailures` compares `mutedForeground` with `foreground`,
`cardForeground`, `popoverForeground` and `inputForeground`, but **never with
the four `xSoftForeground` roles**. At the default floor the 7:1 body floor
implied the step (4.5:1 secondary); at AAA both floors are 7:1, so nothing
separates them.

Measured on the shipped sets (probe, `tierStep` formula
`contrast(ink, fill) / contrast(mutedForeground, fill)`):

| set (high contrast **light**) | `info` | `success` | `warning` | `destructive` |
| ----------------------------- | ------ | --------- | --------- | ------------- |
| identity and the five styled variants | 1.003 | 1.042 | 1.015 | 1.033 |

All six AAA light sets are below the 1.05 step: a caption and the panel ink are
visually the same strength. Worse, an edited theme can paint them with the
**same colour** and `themeFailures` returns `[]` — the same class of defect plan
392 fixed for the four plain body roles and plan 500 for the surface bodies.

Reproduction (before the fix):

```ts
const theme = extendTheme(getTheme("light", "high"), {
  colors: { mutedForeground: getTheme("light", "high").colors.infoSoftForeground },
});
themeFailures(theme); // [] — an Alert's caption is its body ink
```

A second, smaller drift is in the same paragraph set: `packages/tokens/README.md`
says the selected row's label is documented "only on the four row fills" and
enumerates `hover`/`active`/`accent`/`selected`, while
`tierSurfaces(["selectedForeground", "foreground"])` has measured five since
plan 651 added the pressed `selectedActive` (the design system says five).

## 2. Decision

1. **Add four tiers** `["mutedForeground", "<tone>SoftForeground"]` for every
   member of `statusTones` (derived, not retyped). Each is compared on the
   surfaces both roles are documented on — the tone's own fill and the
   `popover` card the shipped Toast paints that ink on — and each shipped set
   must clear the 1.05 step.
2. **Move the four high-contrast light inks one designed step below the ramp's
   950 stop.** The caption role (`#1F1F1F`, ~17:1 on the canvas) is far above
   its 7:1 AAA floor and is the darkest secondary in any shipped set; darkening
   the panel ink keeps the tone hue, keeps every caption figure untouched, and
   keeps the four body-role tier minima sharing their documented 1.274:1.

   | role | before | after | step to `#1F1F1F` |
   | ---- | ------ | ----- | ----------------- |
   | `infoSoftForeground` | `#0C1D42` | `#081226` | 1.133 |
   | `successSoftForeground` | `#042015` | `#03170E` | 1.125 |
   | `warningSoftForeground` | `#2A1B00` | `#1E1300` | 1.109 |
   | `destructiveSoftForeground` | `#3A0B0D` | `#2A0607` | 1.130 |

   Rejected: lightening the AAA light `mutedForeground`. It fixes the step with
   one value, but the four body-role tiers stop sharing one minimum (the
   binding set moves from AAA light's `warningSoft` at 1.274 to `Dark · Linux`
   at 1.296 and AAA dark at 1.32), which the design-system sentence and
   `figures.test.ts` deliberately hold to a single figure; and it weakens every
   AAA caption through the selection wash.

3. **Correct the README's tier paragraph** and guard the fill count from
   `tierSurfaces`.

## 3. Exact edits

### 3.1 `packages/tokens/src/color.ts`

In `highContrastLightColors` replace the four soft inks, keeping them adjacent
to their fills, with a comment:

```ts
  // The four panel inks sit one step below the ramp's 950 stop: the AAA caption
  // (`mutedForeground` #1F1F1F) is far above its 7:1 floor, so the 950 values
  // left the caption and the panel's own ink 1.003–1.042:1 apart. These keep a
  // 1.109–1.133:1 step on every tint (plan 729).
  infoSoftForeground: "#081226",
  ...
```

No other palette value moves. `warningForeground`, `destructiveActive` and the
other ramp-950 roles keep their values.

### 3.2 `packages/tokens/src/contrast.ts` — `textTiers`

Add four entries derived from `statusTones`, between the `inputForeground` pair
and the `disabledForeground` pair, so the order stays "body roles, then the two
roles below secondary, then the states":

```ts
export const textTiers = [
  ...bodyTiers,
  ...statusTones.map(
    (tone) =>
      ["mutedForeground", `${tone}SoftForeground`] as const,
  ),
  ...
];
```

(`bodyTiers` is the existing literal four; keep the `satisfies` check.) Extend
the JSDoc: the body-role list now names the four panel inks, the surfaces come
from `contrastPairs` (the tint plus the `popover` card the Toast paints), and
the step on the AAA light sets is stated as the reason the pair exists.

### 3.3 `packages/tokens/src/figures.ts`

Add a `panelTierFigure(tone)` helper beside `bodyTierFigure`:

```ts
const panelTierFigure = (tone: StatusTone): TierFigure => ({
  document: "docs/tokens.md",
  name: `the caption below the ${tone} panel's ink`,
  tier: ["mutedForeground", `${tone}SoftForeground`],
  claim: "tightest",
  provenance:
    tone === "success" || tone === "warning"
      ? identityTheme("light", "high")
      : identityTheme("dark", "high"),
  surface: `${tone}Soft`,
  decimals: 3,
  sentence: `**{figure}:1** (\`mutedForeground\` vs \`${tone}SoftForeground\`, high-contrast ${tone === "success" || tone === "warning" ? "light" : "dark"} on \`${tone}Soft\`)`,
});
```

Insert the four in `statusTones` order after the four `bodyTierFigure` entries.
Derived minima (probe): info `1.082`, success `1.125`, warning `1.109`,
destructive `1.068`.

### 3.4 `packages/tokens/src/figures.test.ts`

The design-system sentence case ("quotes the design system's four groups from
the tier list") must gain a fifth group after the body list:

```ts
`a status panel's caption ${…}:1 below its own ink (\`infoSoftForeground\`…\`destructiveSoftForeground\`)`;
```

Derive the figure from the four new tiers (they do **not** share a minimum, so
state them as a range or one per tone — use the minimum, `1.068`, in the
sentence and derive it as `Math.min(...)` so it cannot drift).

### 3.5 New test `packages/tokens/src/soft-panel-caption-tier.test.ts`

Header comment states the regression (the 1.003:1 AAA light caption/ink pair and
the `[]` from `themeFailures`). Cases:

1. `textTiers` contains exactly `["mutedForeground", `${tone}SoftForeground`]`
   for every `statusTones` member, derived from the index.
2. Every shipped set clears 1.05 on both shared surfaces for all four tiers
   (map `shippedThemes`, label with `theme.name`).
3. Fail direction: `extendTheme(getTheme("light", "high"), { colors: {
   mutedForeground: colors.infoSoftForeground } })` reports a `hierarchy`
   failure whose `dimmer`/`brighter` is the new pair — the case that returned
   `[]` before the fix.
4. The AAA light inks stay a step below the caption and their fills keep the
   7:1 body floor (`contrastRatio(ink, fill) >= 7`).
5. README drift: the paragraph names the five fill count from
   `tierSurfaces(["selectedForeground", "foreground"])`.

### 3.6 `docs/tokens.md`

- High-contrast role table (lines ~559/562/565/568): the four new hexes.
- *Text hierarchy* (line ~2883): add the four tiers to the list, the surface
  counts (two each: the tint and the `popover` card), and four new quoted
  figures in paragraph order; state the AAA light evidence (1.003–1.042) and the
  four moved inks. Keep the existing 1.274/1.168/1.157/1.542/1.106 figures.
- *Verification*: name the new pair set in the hierarchy sentence and increase
  the pair-count history only if a pair list changed (it does not).

### 3.7 `docs/design-system.md`

- §9 hierarchy paragraph (line ~795): name the panel ink among the body roles
  and add the caption clause with the derived figure; the sentence asserted by
  `figures.test.ts` is edited in the same shape as §3.4.

### 3.8 `packages/tokens/README.md`

Rewrite the tier paragraph's selected-row clause to "five fills" and enumerate
`hover`/`active`/`accent`/`selected`/`selectedActive`; add the four panel tiers
to the `textTiers` description.

### 3.9 Ledgers

`COMPONENTS.md` "Theme total check" row: update the hierarchy phrase to include
the four panel inks and append the plan-729 sentence (the 1.003:1 evidence, the
four values, the four tiers, the README count). `TODO.md`: tick the new row and
keep the progress bar current. Plan index: one row.

## 4. Commands and expected results

```sh
cd packages/tokens && nub exec vitest run src/zprobe.test.ts   # delete the probe first
nub run --filter @gpuixui/tokens test                          # 20s budget; all green
nub run check
nub run lint
```

The docs/figure guards fail with the exact figure each sentence must quote;
update the sentence to the derived number, never the derivation.

## 5. STOP conditions

- Any **other** shipped value has to move to keep a check green: stop and
  report. Only the four AAA light inks move.
- The four new tiers cannot reach 1.05 on a shipped set without moving a
  default-contrast value: stop and report (the AAA dark sets are the tightest at
  1.068 and 1.082).
- The four body-role tier minima stop sharing `1.274`: stop — the sentence
  shape and `figures.test.ts` depend on it.
- A test cannot be made to fail without the fix: stop and report.

## 6. Acceptance

- [x] `themeFailures` reports the hierarchy failure in §3.5 case 3; before the
      fix the same probe returns `[]`.
- [x] Every shipped set passes all four tiers on both shared surfaces.
- [x] No pair, floor, count or other colour moves; `contrastPairs` stays 464.
- [x] Both documents, the README, `COMPONENTS.md` and `TODO.md` state the same
      four values, four figures and the five-fill selected-row count.
- [x] `nub run check`, `nub run lint`, `nub run --filter @gpuixui/tokens test`
      green (199 files, 6876 tests).

**Executed evidence.** The new suite failed on the reverted half in both
directions: restoring the four old inks failed
`holds every shipped set to the step` and `keeps the high-contrast light inks …`;
removing the four tiers failed `publishes a tier for every panel ink` and
`reports a caption painted with the panel's own ink`. `disabled-field-input`'s
planted caption moved `#2A2A2A` → `#383838`, because the new tier correctly
reported that the fixture's caption outranked the panel inks; it still reports
only the two intended disabled-field pairs. No scenario ids apply: this is a
`packages/tokens`-only contract change with no playground or native surface.
