# 590 — Inline code text on its accent wash

**Phase:** F (contract completeness)
**Depends on:** 082 (the `primaryText` role), 314 (`primaryText` on the accent
row fill), 528 (the link through a text selection), 569/574 (the native text
theme and its syntax palette), 589 (the code block's frame)
**Owner:** `tokens-theme`
**Paths:** `packages/tokens/src/native-text-check.ts`,
`packages/tokens/src/native-text-check.test.ts`,
`packages/tokens/src/platform-styles/{linux,windows,macos}.ts`,
`packages/tokens/src/platform-styles/recipes/xp.ts`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`,
`.agents/slop/plans/README.md`

## Why

A markdown document paints inline code as the `codeText` field on an opaque
`codeWash` quad
(`references/gpuix/packages/native/src/markdown/render.rs:348-381`; the run
colour is `theme.code_text` at `:131`). `nativeTextTheme` maps those fields to
`primaryText` and `accent` (`nativeTextRoles`), so the composition is
**`primaryText` on `accent`**.

Every existing pair measures that combination at the **secondary** floor (4.5:1)
because a selectable row paints a brand-toned link on its accent fill (plan 314).
Inline code is body copy and the code-block syntax palette is held at the **body**
floor, so the same combination needs the stricter floor. Four shipped sets miss
it:

| Set | `primaryText` | `accent` | Ratio | Body floor |
| --- | ------------- | -------- | ----- | ---------- |
| Light · Windows XP | `#003FA8` | `#F2ECDA` | **6.506:1** | 7 |
| Dark · Linux | `#A5CBF5` | `#1B3A5C` | **6.898:1** | 7 |
| Light · Windows | `#004F8A` | `#DCEBF8` | **6.953:1** | 7 |
| Dark · macOS | `#96CDFF` | `#1C3A57` | **6.960:1** | 7 |

`themeFailures` returns `[]` for all four today, because no check paints inline
code. The fix is a designed step in each failing set's own ink family, not a new
role: `primaryText` is already the accent's readable ink.

## What to change

### 1. `packages/tokens/src/native-text-check.ts`

Add a public descriptor beside `NativeTextWash`:

```ts
/** The inline-code composition: body text painted on its own opaque wash. */
export interface NativeInlineCode {
  /** The `NativeTextTheme` field painted. */
  readonly text: keyof typeof nativeTextRoles;
  /** The field painted behind it, as an opaque surface. */
  readonly wash: keyof typeof nativeTextRoles;
  /** The floor the painted text must clear. */
  readonly pairClass: ContrastPairClass;
}

/**
 * Inline code is `codeText` (`primaryText`) on the opaque `codeWash` (`accent`)
 * quad the runtime paints under the runs. Unlike a fade, nothing is
 * composited: the wash *is* the surface. The text is body copy, so the pair is
 * held to the body floor — the secondary floor the accent row fill already has
 * for a link is too weak. Four shipped sets measured 6.506–6.960:1 before their
 * ink took one designed step.
 */
export const nativeInlineCode: NativeInlineCode = {
  text: "codeText",
  wash: "codeWash",
  pairClass: "body",
};
```

In `themeNativeTextFailures`, after the two-fade arm:

```ts
const inlineRole = nativeTextRoles[nativeInlineCode.text];
const inlineWash = nativeTextRoles[nativeInlineCode.wash];
const inlineRatio = contrastRatio(
  theme.colors[inlineRole],
  theme.colors[inlineWash],
);
const inlineFailures =
  inlineRatio >= floors[nativeInlineCode.pairClass]
    ? []
    : [{
        field: nativeInlineCode.text,
        role: inlineRole,
        surface: inlineWash,
        opacity: 1,
        pairClass: nativeInlineCode.pairClass,
        floor: floors[nativeInlineCode.pairClass],
        ratio: inlineRatio,
      }];
```

Return it between `overFadeFailures` and `washFailures`. Update
`NativeTextFailure.surface`'s JSDoc to "the document tone, or the opaque wash,
the paint sat on". Update `themeNativeTextFailures`' JSDoc: the native check now
holds the inline-code pair, and name the four-set regression.

### 2. Palette steps (one designed step in each failing family)

- `packages/tokens/src/platform-styles/recipes/xp.ts`: `primaryText` `#003FA8`
  → `#003A9C` (the XP `primaryActive`, 7.102:1 on the beige accent).
- `packages/tokens/src/platform-styles/windows.ts` (light half only):
  `#004F8A` → `#004A82` (7.508:1).
- `packages/tokens/src/platform-styles/linux.ts` (dark half only):
  `#A5CBF5` → `#B4D5F7` (the Linux dark `accentForeground`, 7.640:1).
- `packages/tokens/src/platform-styles/macos.ts` (dark half only):
  `#96CDFF` → `#A4D4FF` (7.499:1).

The four steps leave macOS **light** as the tightest shipped pair at 7.006:1 —
a three-decimal pass with no margin, the state plan 574 rejected for Windows
light. Take one more step in the same family: `#004A9A` → `#00478F` (7.458:1,
every other check still `[]`).

Do not move any other role. Every candidate was probed through `themeFailures`
before this plan: each returns `[]` from every other check, so the steps only
raise contrast.

### 3. `packages/tokens/src/native-text-check.test.ts`

- Add the new value to the names case: `nativeInlineCode`, `NativeInlineCode`.
- `passes every shipped set` already covers the palette after the steps.
- Add a regression that proves the gap:

```ts
it("reports inline code the accent pair accepts", () => {
  const planted = extendTheme(getPlatformRecipeTheme("xp", "light"), {
    colors: { primaryText: "#003FA8" },
  });
  expect(
    themeFailures(planted).filter((failure) => failure.kind !== "nativeText"),
  ).toEqual([]);

  const failure = themeNativeTextFailures(planted).find(
    (candidate) => candidate.field === "codeText",
  );
  expect(failure?.role).toBe("primaryText");
  expect(failure?.surface).toBe("accent");
  expect(failure?.pairClass).toBe("body");
  expect(failure?.ratio).toBeCloseTo(6.506, 2);
});
```

- Add a docs pin that derives the shipped minimum:

```ts
it("pins the inline-code figure the reference quotes", () => {
  const measured = shippedThemes.map(({ theme }) => ({
    name: theme.name,
    ratio: contrastRatio(
      theme.colors.primaryText,
      theme.colors.accent,
    ),
  }));
  const tightest = measured.reduce(
    (min, entry) => (entry.ratio < min.ratio ? entry : min),
  );
  const docs = readFileSync(…, "utf8");
  expect(docs).toContain(`**${tightest.ratio.toFixed(3)}:1**`);
  expect(docs).toContain(`\`${tightest.name}\``);
});
```

Use `Arr`-free plain array code only if the suite already uses it (the tokens
package does not depend on Effect); follow the surrounding style.

### 4. `docs/tokens.md`

- Role table (line ~222): add "inline code on the `accent` wash" to the
  `primaryText` use cell.
- Native text section, after the fade paragraph and before the chrome
  paragraph: one paragraph introducing `nativeInlineCode` — `codeText`
  (`primaryText`) on the opaque `codeWash` (`accent`) — the body floor, the four
  failing sets with the values and ratios from the table above, the four ink
  steps, and the derived tightest shipped pair (the docs pin above fixes the
  figure and label; write the sentence in the same present-tense style as the
  other native-text paragraphs).
- Add `NativeInlineCode` to the `## Types` index.
- Update the opaque-syntax tightest sentence at ~1605: after the XP
  `primaryText` step the tightest pinned pair is no longer XP `primaryText` at
  7.562:1; derive the new pair from `nativeSyntaxPairs` over `shippedThemes` and
  state its role, ratio and set. (The probe finds `successText` 7.661:1 on
  `Light · Windows XP`.) Keep the AAA figure unchanged.
- Keep the plan-528 history paragraph as history; it describes that plan's move,
  not the current value.

### 5. `docs/design-system.md` §10

In the native text paragraph, say inline code's `primaryText` on the `accent`
wash is held to the body floor through `nativeInlineCode`, and that four shipped
sets took one ink step.

### 6. `packages/tokens/README.md`

In the native-text paragraph, add the inline-code composition and
`nativeInlineCode` beside `nativeTextWashes`.

### 7. `COMPONENTS.md` and `TODO.md`

Append the plan-590 sentence to the **Total theme check** row and add one ticked
TODO row with the four failing figures and the four steps. Keep the progress bar
current.

### 8. `.agents/slop/plans/README.md`

Add plan 590 after 589 with status `done` and the one-line description.

## Commands and expected results

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `nub run --filter @gpuixui/tokens test -- --run src/native-text-check.test.ts`
   → green, including the regression and shipped-set cases.
3. `nub run --filter @gpuixui/tokens test` → green; any `platform-claims`,
   `native-text`, `figures` or docs suite that quotes an affected value must be
   updated from the implementation, never hard-coded.
4. `nub run check`, `nub run lint`, `nub run test` → exit 0.

Both directions: with the inline arm removed, the regression finds no
`codeText` failure and the four shipped sets fail the new check once the palette
steps are reverted; with it restored and the steps applied, every shipped set
returns `[]`.

## STOP conditions

- Any shipped set still fails the inline pair after the four steps (re-measure;
  do not lower the floor).
- Any other check fails for the four planted themes (they were probed clean;
  if a step changes that, the value is wrong).
- A docs guard needs a figure that cannot be derived from `shippedThemes` /
  `nativeSyntaxPairs`.
- Moving an ink breaks a quoted present-tense figure outside this plan's reach;
  update the derived sentence and the guard together, or stop and report.

## Acceptance

- `nativeInlineCode` publishes the inline-code pair, typed and documented.
- `themeNativeTextFailures` reports inline code below the body floor.
- The four shipped sets pass after their one-step ink change; every other
  shipped set and every other check still returns `[]`.
- The reference, design system, README and ledger name the composition and the
  current tightest figure.
- `nub run check`, `nub run lint`, `nub run test` pass.

## Outcome

Landed on `agent/tokens-theme`. `nativeInlineCode` publishes the `codeText` /
`codeWash` pair at the body floor and `themeNativeTextFailures` reports it; the
regression reproduces the old XP ink at 6.506:1 while every other check returns
`[]`. Five inks take one designed step — XP `#003A9C`, Windows light `#004A82`,
Linux dark `#B4D5F7`, macOS dark `#A4D4FF` and macOS light `#00478F` — and the
tightest is 7.102:1 (XP). The opaque-syntax tightest moves to `warningText`
7.599:1 (`Light · macOS`) because XP's ink is no longer the minimum, and the
blockquote regression moves with Linux dark's ink to 6.315:1. The suite grows
by three cases (5,803 tests); removing the inline arm fails the regression and
reverting XP's ink fails the shipped-set case. `nub run check`,
`nub run lint` and `nub run test` pass. No other role, pair, floor or metric
moves.
