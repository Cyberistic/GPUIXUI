# 078 — The loading skeleton the contrast contract never checked

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014` (status tones), `019` (motion), `063` (platform styles), `071`–`076` (the contrast contract), `077` (the last palette fix) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`themeContrastFailures` is documented as **the library's guarantee in one
assertion**. An audit against the pinned package found that the loading
skeleton — the fill of the `Skeleton`/loading state the mission names — is not
one of the roles the contract measures. `skeleton` is one of the seven roles no
`contrastPairs` entry names (`selection`, `overlay`, `disabled`,
`disabledForeground`, `skeleton`, `scrollbar`, `shadow`); five of those are
deliberate (a wash, a scrim, WCAG-exempt disabled states, a reserved role, an
alpha tint), but `skeleton` is painted as a visible placeholder and must be
perceivable against the surface it sits on.

The audit also found a **real defect in the shipped platform styles**, the same
class plan `076` fixed for soft status tints: a variant changes the canvas but
inherits the identity's `skeleton`, so the placeholder lands too close to the
variant's own card.

| Variant | Pair | Measured |
| ------- | ---- | -------- |
| Linux dark | `skeleton` on `card` (`popover`, `muted` share the value) | **1.004:1** |
| macOS dark | `skeleton` on `card` | 1.051:1 |
| Windows dark | `skeleton` on `card` | 1.068:1 |

All three are at or below the 1.05:1 floor the library says it enforces, and
Linux dark's is a placeholder that is effectively invisible on the card it
fills. The identity (1.274:1 on `card`) and every light variant (≥ 1.132:1)
pass only because their canvases happen to sit far enough from the inherited
grey.

## 2. Design decisions (do not re-litigate)

1. **`skeleton` is a surface, so it joins the `surface` class.** It is a fill
   perceived against another surface, exactly like `xSoft`; the existing
   1.05:1 floor and the `ContrastFailure` shape already express it, so no new
   class and no new export.
2. **Measure it on the triad the surface class already uses** — `background`,
   `card` and `popover` — for the same reason plan `076` did: a skeleton can be
   the body of a card, a dialog, a popover or a toast.
3. **Give each dark platform variant its own skeleton; keep the identity.**
   A placeholder must sit on *that platform's* card, and the dark cards differ
   (`#2C2C2E`, `#303030`, `#2B2B2B`). Re-tinting the identity's cool graphite to
   clear every dark card would brighten it on the identity's own card by ~50% of
   its current contrast; a per-variant neutral keeps the identity untouched and
   lets each style express its own grey, which is what a surface ladder is.
   Light variants inherit: the identity `#E1E5EC` already clears every light
   canvas (strictest: macOS `#F2F2F7` at 1.132:1).
4. **The chosen values are platform neutrals, not arbitrary tints.** They match
   each platform's own grey ladder (macOS `#3C3C3E`, one step between its hover
   and active greys; GNOME `#3E3E3E`; Windows `#3C3C3C`) and land near the
   identity's own practice of 1.27:1 on its card, so the placeholder reads the
   same weight on every platform.
5. **High contrast inherits.** `applyPlatformStyle` applies no colours at the
   level a base declares as `"high"`, so every high-contrast variant keeps the
   identity `skeleton` `#3D3D3D`, which measures 1.696–1.933:1. The design
   system's "AAA palette wins over platform resemblance" rule is unchanged.
6. **One description.** The pair list stays the only place the floor is stated;
   the two test suites keep iterating `contrastPairs`, and the documents are
   built from the implementation. No bespoke skeleton block in a test.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/078-skeleton-surface-pairs.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | three `skeleton` surface pairs; JSDoc |
| `packages/tokens/src/color.ts` | `skeleton` JSDoc only (values unchanged) |
| `packages/tokens/src/platform-styles/macos.ts` | `skeleton` in `colors.dark` |
| `packages/tokens/src/platform-styles/linux.ts` | `skeleton` in `colors.dark` |
| `packages/tokens/src/platform-styles/windows.ts` | `skeleton` in `colors.dark` |
| `packages/tokens/src/contrast.test.ts` | header, pair count, one regression test |
| `packages/tokens/src/platforms.test.ts` | header comment only (the generic loop guards it) |
| `packages/tokens/src/docs.test.ts` | surface-role set, skeleton prose, floor row, platform prose |
| `packages/tokens/src/readme.test.ts` | guard the README's skeleton sentence |
| `docs/tokens.md` | platform paragraph, verification paragraph |
| `docs/design-system.md` | §8 loading row, §9 floor table |
| `packages/tokens/README.md` | contrast and platform paragraphs |
| `COMPONENTS.md` | Tokens, theme-contrast and platform-variant rows |
| `TODO.md` | one ticked row and the section progress bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's paths.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Add one generated block beside `softSurfacePairs`:

```ts
const surfacePairs = [
  ...softSurfacePairs,
  ...(["background", "card", "popover"] as const).map(
    (background): ContrastPair => ["skeleton", background, "surface"],
  ),
];
```

and spread `...surfacePairs` where `...softSurfacePairs` is spread today. Keep
the exported array a literal; only the two generated blocks are derived. Expand
the JSDoc of `contrastPairs` and `themeContrastFailures`: the surface class now
holds the soft status surfaces **and the loading skeleton**. `ContrastFailure`
JSDoc already reads "the surface being perceived" and needs no change.

### 4.2 `packages/tokens/src/color.ts`

JSDoc only:

```ts
/** Loading placeholder, held to the perceivability floor on every surface. */
readonly skeleton: string;
```

No value moves in `lightColors`, `darkColors`, `highContrastLightColors` or
`highContrastDarkColors`.

### 4.3 `packages/tokens/src/platform-styles/*.ts`

Add `skeleton` to each **dark** colour set, after `active`, beside the other
state fills (the platform sets do not name every interface role, so this is the
ladder position they use):

| File | `dark.skeleton` | vs its card | vs its background |
| ---- | --------------- | ----------- | ----------------- |
| `macos.ts` | `#3C3C3E` | 1.266:1 | 1.546:1 |
| `linux.ts` | `#3E3E3E` | 1.234:1 | 1.451:1 |
| `windows.ts` | `#3C3C3C` | 1.284:1 | 1.477:1 |

Their `popover` and `muted` equal the card in each variant, so one value clears
all three surfaces the contract measures. Do **not** add a light `skeleton`:
the inherited identity value already clears every light canvas, and macOS's own
`#E5E5EA` would measure *worse* (1.125:1). Do not touch `default.ts`.

### 4.4 `packages/tokens/src/contrast.test.ts`

1. Header: add the defect — the contract promised every documented pair while
   the loading skeleton was unmeasured, and platform styles changed the canvas
   but inherited the identity's skeleton (Linux dark: 1.004:1 on its card).
2. `covers every documented pair`: `63` → `66`.
3. New test after the soft-surface test:

```ts
it("reports a loading skeleton that vanishes into every surface", () => {
  const white = "#FFFFFF";
  const invisible = extendTheme(getTheme("light"), {
    colors: {
      background: white,
      card: white,
      popover: white,
      skeleton: white,
    },
  });
  const failures = themeContrastFailures(invisible).filter(
    ({ foreground }) => foreground === "skeleton",
  );

  expect(
    failures.map(({ background, pairClass, floor }) => ({
      background,
      pairClass,
      floor,
    })),
  ).toEqual([
    { background: "background", pairClass: "surface", floor: 1.05 },
    { background: "card", pairClass: "surface", floor: 1.05 },
    { background: "popover", pairClass: "surface", floor: 1.05 },
  ]);
  expect(failures.every(({ ratio }) => ratio === 1)).toBe(true);
});
```

### 4.5 `packages/tokens/src/platforms.test.ts`

Header comment only — the generic `contrastPairs` loop and `clears the
documented contract on every variant` become the regression guard once §4.1
lands. Name the bug: *"Plan 078: a variant changed the canvas but inherited the
identity's `skeleton`; Linux dark measured 1.004:1 on its card. The surface
pairs now include the skeleton, so each variant is checked on its own ladder."*
Do not add a second loop.

### 4.6 `packages/tokens/src/docs.test.ts`

1. `names every surface the soft status pairs are held against` → rename to
   `names every surface the surface pairs are held against`; keep the sentence
   assertion (its surfaces are still `background`, `card`, `popover`) and change
   the role assertion to:

   ```ts
   expect(new Set(surfacePairs.map(([role]) => role))).toEqual(
     new Set([...statusTones.map((tone) => `${tone}Soft`), "skeleton"]),
   );
   ```

2. Add a skeleton prose guard, built from the contract and floors:

   ```ts
   it("states the skeleton floor the contract enforces", () => {
     const sentence =
       "A loading skeleton is a surface too: it is held to " +
       `${contrastFloors.default.surface}:1 against \`background\`, \`card\` and ` +
       "`popover`, so a placeholder never disappears into the card it fills.";
     expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
   });
   ```

3. Floor table: add the row the design system must state, built like its
   siblings:

   ```ts
   `| loading skeleton (\`skeleton\`) on \`background\`/\`card\`/\`popover\` | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`
   ```

4. Platform paragraph: assert the three real styles override `skeleton` in dark
   and that the catalogue says so, and that the stale inheritance claim is gone:

   ```ts
   it("names the skeleton a real platform style carries", () => {
     const real = platformNames.filter((platform) => platform !== "default");
     real.forEach((platform) => {
       expect(platformStyles[platform].colors.dark.skeleton, platform).toBeDefined();
     });
     expect(markdown).toContain("surfaces (including the loading skeleton)");
     expect(markdown).toContain("(status, disabled, scrollbar)");
     expect(markdown).not.toContain("(status, disabled, skeleton, scrollbar)");
   });
   ```

### 4.7 `packages/tokens/src/readme.test.ts`

Add one test, derived from the contract and floors rather than a retyped value:

```ts
it("states the skeleton floor the checker enforces", () => {
  expect(readme).toContain(
    `the soft status surfaces and the loading skeleton at ${contrastFloors.default.surface}:1 against \`background\`, \`card\` and \`popover\``,
  );
});
```

Import `contrastFloors` from `./contrast.js`.

### 4.8 `docs/tokens.md`

1. Platform paragraph:

   ```
   Each real variant changes its type family, radii, density, motion, surfaces
   (including the loading skeleton), accent and shadows; roles it does not name
   (status, disabled, scrollbar) and every non-colour scale inherit the identity,
   so the default stays the design system the library is built on.
   ```

   and add: *"The dark variants carry their own `skeleton`, because a loading
   placeholder is a surface on that platform's card, not a fixed grey."*

2. Verification, after the soft-surface sentence:

   ```
   A loading skeleton is a surface too: it is held to 1.05:1 against
   `background`, `card` and `popover`, so a placeholder never disappears into
   the card it fills.
   ```

   (Build the sentence with `contrastFloors.default.surface`, not the literal in
   the final text — the guard in §4.6 compares the two. The literal `1.05`
   appears only because that is the shipped floor.)

3. Any pair-count figure in the page becomes 66. The colour table and the
   `skeleton` identity values do not move; the platform table's columns do not
   change.

### 4.9 `docs/design-system.md`

1. §8 loading row gains the floor:

   ```
   | loading | `skeleton` fill with `pulse` (or `step`) motion, held to the 1.05:1 perceivability floor on every shipped canvas; the active indicator uses `primary` |
   ```

2. §9 table gains, after the soft-surface row:

   ```
   | loading skeleton (`skeleton`) on `background`/`card`/`popover` | 1.05:1 | 1.05:1 |
   ```

3. §5's platform sentence already says a variant changes "surfaces"; no change
   beyond keeping it true (the skeleton is a surface).

### 4.10 `packages/tokens/README.md`

1. Contrast paragraph: replace "the soft status surfaces at 1.05:1 against
   `background`, `card` and `popover`" with "the soft status surfaces and the
   loading skeleton at 1.05:1 against `background`, `card` and `popover`".
2. Platform section, after the Default-variant sentence: *"Each real variant
   also carries its own dark `skeleton`, because a placeholder sits on that
   platform's card."*

### 4.11 `COMPONENTS.md`

- `Design tokens` row: say `skeleton` is held to the same 1.05:1 floor as the
  soft surfaces on `background`/`card`/`popover`.
- `Theme contrast check` row: `63` → `66` pairs; name the skeleton pairs and the
  platform defect this plan fixed (Linux dark's `skeleton` at 1.004:1 on its
  card); state that every variant is checked on its own ladder.
- `Platform style variants` row: the three real variants carry their own dark
  `skeleton`; high contrast inherits the identity value.

### 4.12 `TODO.md`

Add one ticked row under **Design tokens and theming**:

```
`[x]` Guard the loading skeleton on every canvas — Linux dark's `skeleton`
measured 1.004:1 on its card — join it to the surface floor and give each dark
platform style its own value (plan 078)
```

Update the section's progress bar and count to the real numbers.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test          # exit 0; 882 → 916 tests
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

The net is +34: three pairs × four identity colour sets in `color.test.ts`
(+12), three × six platform/mode sets in `platforms.test.ts` (+18), one
`contrast.test.ts` test, one `docs.test.ts` test, one `docs.test.ts` prose guard
replaces none, one `readme.test.ts` test, and one floor-row assertion. Read the
actual totals and record them in the verification record: the number that
matters is **zero failures**.

## 6. Test plan and both directions

1. **Before the value fix** (with §4.1 applied), run
   `nub run --filter @gpuixui/tokens test`. The platform contract fails for
   `linux dark: skeleton on card meets 1.05:1` (1.004), `darwin dark` (1.051
   passes by a hair — record the exact number), and
   `clears the documented contract on every variant`. Apply §4.3; all pass.
   Record both outputs.
2. **Before the pair-list fix**, the new `contrast.test.ts` test fails because
   `themeContrastFailures` produces no skeleton failure, and
   `covers every documented pair` reads 63 ≠ 66.
3. **Prove the floor is not decorative**: temporarily set
   `contrastFloors.default.surface` to `1` (do not commit). The new
   `vanishes into every surface` test fails on `floor`; restore.
4. **Prove the variant value is load-bearing**: revert Linux dark's `skeleton`
   to the inherited identity value (delete the line). The Linux dark platform
   test fails at 1.004; restore.
5. **Prove the document is derived**: remove the skeleton sentence from
   `docs/tokens.md` — `states the skeleton floor the contract enforces` fails
   because the sentence is built from `contrastFloors`. Restore. (Platform
   skeleton values are not printed in the catalogue, so no document guard can
   catch a value edit; the contract test does.)

## 7. STOP conditions

Stop and report if:

- a chosen skeleton value does not clear 1.05:1 on **all three** measured
  surfaces of its own variant — do not lower a floor to fit a grey; pick a
  stronger neutral and state the measurements;
- a light variant starts failing after the pairs land for a reason §4.3 does not
  address — that is a second defect; report the pair and ratio rather than
  adding an override;
- `quietBrandFailures`, `quietHighContrastFailures` or `quietRingFailures` in
  `contrast.example.ts` change — those examples isolate one defect each; report
  rather than editing their expectations blindly;
- the contract would need a new `ContrastPairClass` or a new export — it should
  not: `surface` already expresses a fill perceived against another fill; stop
  and report if the type forces a breaking change;
- a document cannot be guarded from the implementation without asserting a
  literal back to itself (`scripts/check-tests.ts` rejects that) — add the
  derivation instead;
- any command in §5 fails for a reason unrelated to these files — report it.

## 8. Acceptance criteria

- Every shipped theme — identity, high contrast, and all twelve
  platform/mode/contrast variants — passes `themeContrastFailures` with the
  skeleton measured on `background`, `card` and `popover`, and a theme that
  hides its skeleton is named by the checker.
- `contrastPairs` holds 66 pairs; the `surface` class holds the four soft status
  roles and `skeleton`; `color.test.ts` and `platforms.test.ts` still read the
  same list.
- The three real platform styles carry a dark `skeleton`; the identity and the
  light variants are unchanged; high contrast is unchanged.
- `docs/tokens.md` states the skeleton floor and stops claiming the skeleton
  inherits; `docs/design-system.md` states the row; `packages/tokens/README.md`,
  `COMPONENTS.md` and `TODO.md` match the shipped contract and name the fixed
  defect.
- The plan is indexed in `.agents/slop/plans/README.md` with its paragraph.
- `nub run check`, `nub run lint`, `nub run fmt` and `nub run test` exit 0.

## 9. Verification record

- `nub run --filter @gpuixui/tokens test`: 16 files, **916 tests pass**.
- `nub run check`, `nub run lint`, `nub run fmt`, `nub run test`: exit 0.
- Two directions, observed on this branch:
  1. With the pairs added and the platform values not yet written, the Linux
     dark skeleton test fails with `expected 1.0042630071419312 to be greater
     than or equal to 1.05` and `clears the documented contract on every variant`
     fails; both pass after §4.3.
  2. Removing the skeleton pairs makes `covers every documented pair` read
     `expected 63 to be 66`, the new `vanishes into every surface` test see `[]`,
     and the docs surface-role guard miss `skeleton`; all three pass when the
     pairs are restored.
  3. Lowering `contrastFloors.default.surface` to `1` makes the new test see `[]`
     instead of three failures at floor `1.05`; restored.
  4. Restoring Linux dark's inherited skeleton fails the Linux dark card pair
     again; restored.
  5. Removing the skeleton sentence from `docs/tokens.md` fails
     `states the skeleton floor the contract enforces`; restored.
- Chosen values measured on their own variant: macOS `#3C3C3E` 1.266 on card /
  1.546 on background; Linux `#3E3E3E` 1.234 / 1.451; Windows `#3C3C3C` 1.284 /
  1.477. Every `popover` equals its card, so the same value covers it. macOS's
  value is deliberately one step away from its `hover`/`border` grey
  (`#3A3A3C`), so a placeholder inside a hovered row is still visible.
