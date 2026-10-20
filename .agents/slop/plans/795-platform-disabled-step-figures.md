# 795 — The disabled fill's step off its platform surfaces has no owner

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `535`, `737`, `781`.

## 1. The defect

Plan `737` moved five `disabled` fills one designed step and justified the two
platform dark values in their own files:

- `platform-styles/linux.ts`, on `disabled`: *“The card, popover and quiet panel
  are `#303030`, so the fill is its own step above them (1.126:1) rather than the
  identity's neutral-850 (plan 737).”*
- `platform-styles/macos.ts`, on `disabled`: *“The card, popover and quiet panel
  are `#2C2C2E`, so the fill is its own step above them (1.139:1) rather than the
  identity's neutral-850 (plan 737).”*

Both figures were computed once by hand. `platform-claims.test.ts` is the suite
that owns every current-state figure in these files (plan `535`), and
`platform-header-text-step.test.ts` owns the headers' hexes (plan `781`), but
neither reads these comments: `disabled-fill.test.ts` pins the identity's ratios
and the *pre-fix* platform values in a history table, not the comments. A palette
edit — a moved `disabled`, or a surface the sentence names — would leave the
rationale quoting a step the theme no longer produces while every gate stayed
green. That is exactly the class plan `535` closed for the macOS ring, face and
border figures and plan `781` closed for the headers' ink.

Proof the numbers are true today (both recomputed through the public
`contrastRatio`):

```
Linux dark   disabled #383838 on card #303030  → 1.1256:1  → "1.126:1"
macOS dark   disabled #353537 on card #2C2C2E  → 1.1389:1  → "1.139:1"
```

## 2. Decision

Extend `platform-claims.test.ts`; no colour, pair, floor, metric, role or shipped
theme moves. The case derives, for each of the two files:

1. the step from the resolved dark theme — `contrastRatio(disabled, card)` at
   three decimals — and requires the sentence's figure;
2. the surface value the sentence quotes — `card`, `popover` and `muted` must be
   the one hex the sentence prints, because the sentence's singular value is the
   reason the fill's step is stated once.

The second check is what makes the first meaningful: a surface that diverges
from the others would make one quoted ratio describe three surfaces.

## 3. Files to change

1. `packages/tokens/src/platform-claims.test.ts` — one case and one helper.
2. `.agents/slop/plans/README.md` — the index row.
3. `TODO.md` — the ticked row.

No source, document or token value changes.

## 4. Step 1 — the case

In `platform-claims.test.ts`, add beside the existing platform cases:

```ts
/** The disabled fill's step sentence, one per dark platform that states it. */
const disabledStepSentence = (theme: Theme): string =>
  `The card, popover and quiet panel are ${theme.colors.card}, so the fill is ` +
  `its own step above them (${fixed(
    contrastRatio(theme.colors.disabled, theme.colors.card),
    3,
  )}:1) rather than the identity's neutral-850 (plan 737).`;

it("holds the disabled fill's step off its own dark surfaces", () => {
  ([
    ["darwin", "macos.ts"],
    ["linux", "linux.ts"],
  ] as const).forEach(([platform, file]) => {
    const dark = getPlatformTheme(platform, "dark");
    expect(dark.colors.popover, file).toBe(dark.colors.card);
    expect(dark.colors.muted, file).toBe(dark.colors.card);
    expect(source(file), file).toContain(disabledStepSentence(dark));
  });
});
```

The sentence in each file must match exactly, including its `plan 737` tail; add
whatever type import the file needs (`Theme` from `./theme.js`, or inline the
argument type).

## 5. Test plan

```sh
cd packages/tokens
nub x vitest run src/platform-claims.test.ts
nub run check-types
nub run test
```

Expected: the suite passes, the type check is clean and the package suite is
green.

**Prove the case can fail** (two directions, both reverted afterwards):

1. Move `linuxPlatformStyle`'s dark `disabled` to `#3A3A3A`, run the suite, and
   expect the Linux sentence to fail on the ratio; revert.
2. Move `macosPlatformStyle`'s dark `muted` to `#2D2D2F`, run the suite, and
   expect the macOS case to fail on the quoted surface; revert.

## 6. STOP conditions

- Stop if a shipped value has to move to make the test pass: the figures are
  true today, so a failure means the sentence is stale, and the fix is the
  sentence (with evidence) rather than the palette.
- Stop if the case needs a cast, `any`, or a second copy of the sentence.

## 7. Acceptance

- `nub run --filter @gpuixui/tokens test` is green.
- The case fails under either mutation above and passes when reverted.
- `nub run check` and `nub run lint` pass at the repo root.
- `TODO.md` ticks the row and the plan index lists 795.
