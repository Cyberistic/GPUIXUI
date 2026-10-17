# 098 — The documented brand theme must pass the contract it teaches

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
011, 013, 055, 071, 082, 097 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`

## 1. The defect

`packages/tokens/src/brand-theme.example.ts` is the executed example of the
extension mechanism. It changes `primary` (and `ring`) and inherits everything
else:

```ts
export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: { primary: "#7C5CFF", ring: "#9B8CFF" },
  radius: { md: 8 },
  density: "compact",
});
```

`docs/tokens.md` then teaches that this theme passes the library's own check:

```ts
themeContrastFailures(brandTheme); // [] at the level brandTheme declares
```

That comment is **false**. The inherited dark `primaryForeground` is `#11141A`,
and on the brand fill `#7C5CFF` it measures **4.243:1**, under the 4.5:1
on-colour floor `themeContrastFailures` enforces. The example therefore
demonstrates a theme the library would reject, and no test notices because
`theme.test.ts` asserts the brand's fields but never runs the contract on it.

Two further consequences of the same incomplete family:

- the brand's hover and pressed fills inherit the identity's iris steps
  (`#C7CBFF`/`#E0E3FF`), a different hue from the brand fill, so the state does
  not belong to the brand;
- the light example inherits `primaryText` (`#4C39B5`) while its fill is
  `#6A45F0`; it happens to clear the floor, but a brand's links stay in the old
  family, which is the same defect plan 082 fixed for the identity.

The brand example is the consumer's template. It must be a theme the package's
own guarantee accepts, and the rule that makes it valid — a filled family moves
together — must be stated where a consumer reads it.

## 2. Decision (do not re-litigate)

- The examples become **complete brand families**: `primary`, `primaryForeground`,
  `primaryHover`, `primaryActive` and `primaryText` move together in both modes.
  `ring` stays the brand's focus step.
- The two examples are held to `themeContrastFailures` in `theme.test.ts`, so the
  documented template can never again ship below a floor.
- The documentation states the rule once: changing a fill without its state and
  text steps leaves the base family in place and can miss the on-colour floor.
  It is guidance, not enforcement — a theme is data — but the shipped example
  obeys it.
- The brand fill is deliberately a violet distinct from the identity's iris, so
  the example still demonstrates a real brand.

## 3. Exact values

| Theme | `primary` | `primaryForeground` | `primaryHover` | `primaryActive` | `primaryText` |
| ----- | --------- | ------------------- | ------------- | -------------- | ------------- |
| `brandTheme` (dark) | `#7C5CFF` | `#000000` | `#8F73FF` | `#A28CFF` | `#C9BDFF` |
| `brandLightTheme` (light) | `#6A45F0` | `#FFFFFF` | `#5A38D8` | `#4929B8` | `#5330C8` |

Measured foregrounds: dark `#000000` on `#7C5CFF` 4.83:1, on `#8F73FF` 6.06:1,
on `#A28CFF` 7.73:1; light `#FFFFFF` on `#6A45F0` 5.64:1, on `#5A38D8` 7.02:1,
on `#4929B8` 9.16:1. `primaryText` clears the secondary floor on the six
surfaces a link paints in its own mode (lowest: dark 7.70:1 on `active`, light
6.33:1 on `active`). Both `ring` overrides already clear the 3:1 boundary floor
on all eight ring surfaces (lowest: light `#7C5CFF` on `active` at 3.44:1).

## 4. Exact changes

### 4.1 `packages/tokens/src/brand-theme.example.ts`

Replace the two colour override blocks with the five-role families in §3. Keep
`name`, `radius` and `density` exactly as they are, and extend the file's header
comment: the example is complete because a brand that moves a fill must move its
foreground, state and text steps with it (plans 082 and 097–098).

### 4.2 `packages/tokens/src/theme.test.ts`

Import `themeContrastFailures` from `./index.js` and add, beside the existing
brand assertions:

```ts
it("holds the documented brand examples to the contrast contract", () => {
  expect(themeContrastFailures(brandTheme)).toEqual([]);
  expect(themeContrastFailures(brandLightTheme)).toEqual([]);
});

it("moves the whole brand family, not only the fill", () => {
  [brandTheme, brandLightTheme].forEach((theme) => {
    const base = theme.mode === "dark" ? darkTheme : lightTheme;
    (["primaryHover", "primaryActive", "primaryText"] as const).forEach(
      (role) => expect(theme.colors[role]).not.toBe(base.colors[role]),
    );
    expect(theme.colors.primaryForeground).toMatch(/^#[0-9A-F]{6}$/);
  });
});
```

A foreground may legitimately stay `#FFFFFF`, so the contract test — not an
inequality against the base — is what holds it to the brand fill.

Adjust the expected values in the existing `describe("brandTheme")` block only
where §3 changes them; the unchanged assertions stay.

### 4.3 `docs/tokens.md`

1. Replace the `createTheme` snippet with the complete family (it is the same
   example the tests execute).
2. After the snippet, add one sentence: "A brand that changes `primary` sets the
   whole family — `primaryForeground`, `primaryHover`, `primaryActive` and
   `primaryText` — because an inherited state would keep the base hue and can
   miss the on-colour floor; the dark example's inherited foreground measured
   4.24:1 on the brand fill before this rule was written down."
3. Keep `themeContrastFailures(brandTheme); // []` — it becomes true and is now
   tested.

### 4.4 `docs/design-system.md`

In §3, after the sentence "A brand that also uses its accent as text overrides
`primaryText` beside it …", add: a brand that changes `primary` moves
`primaryForeground`, `primaryHover`, `primaryActive` and `primaryText` with it;
a fill alone leaves the base family running the states, and the shipped example
is held to `themeContrastFailures` so the template cannot drift below a floor.

### 4.5 `packages/tokens/README.md`

Update the `## Extending a theme` snippet to the same complete family and add one
sentence naming the rule. The README is the consumer's front door; a template
that produces a failing theme is the same defect.

### 4.6 `COMPONENTS.md`

In the *Theme extension* row's notes, append one clause: the executed brand
example moves the whole primary family and is held to `themeContrastFailures`, so
the documented template cannot ship below a floor (plan 098).

### 4.7 `TODO.md`

Under **Design tokens and theming (`tokens-theme`)** add and tick:

```
`[x]` Make the documented brand example a theme the contract accepts — it
inherited the dark `primaryForeground`, which measured 4.243:1 on the brand fill
under the 4.5:1 floor, while `docs/tokens.md` claimed
`themeContrastFailures(brandTheme)` was empty; a brand now moves its whole
primary family and a test holds the example to the checker (plan 098)
```

Update `65/84` → `66/85`. No cross-team row: the fix is inside the package and
its documents.

### 4.8 Plan index

Add 098 with status `done` and a closing narrative paragraph recording the
4.243:1 figure.

## 5. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | 34 files green; count rises by the two new tests |
| 2 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 3 | `nub run lint` | exit 0 |
| 4 | `nub run fmt` | exit 0 |
| 5 | `nub run check` | exit 0 |
| 6 | `nub run test` | exit 0 |

## 6. Test plan — proof in both directions

1. Add the `themeContrastFailures` test **before** changing the values and run
   it: it fails with a `primaryForeground`/`primary` pair at 4.243:1, proving the
   documented template was broken. Capture the output in the Outcome.
2. Fix the values; the same test passes, and the family test proves hover,
   pressed and text moved off the base theme.
3. Temporarily remove `primaryActive` from `brandTheme` and observe the family
   test fail (`primaryActive` equals the base); restore.
4. Temporarily keep the dark `primaryForeground` as `#11141A` and observe the
   contract test fail again; restore.

## 7. STOP conditions

Stop and report, do not improvise, if:

- the values in §3 miss a floor — the values are wrong, not the floor;
- the docs snippet and the executed example cannot stay identical (make them
  identical; do not document a theme the tests do not run);
- a change is needed outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md` or `TODO.md`;
- a step needs `any`, a cast, or a retyped role list.

## 8. Acceptance

- [x] `brandTheme` and `brandLightTheme` are complete five-role primary families.
- [x] `theme.test.ts` holds both to `themeContrastFailures` and proves the family
      moved off the base.
- [x] `docs/tokens.md`, `docs/design-system.md` and the README state the rule and
      show the complete family.
- [x] `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint` and `nub run test` pass, run — not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 9. Outcome (executed on this host, 2026-10-17)

- The defect was real and the new test caught it before the fix:
  `themeContrastFailures(brandTheme)` returned one failure,
  `primaryForeground` on `primary` at **4.243:1** under the 4.5:1 floor, while
  `docs/tokens.md` claimed the array was empty. `theme.test.ts` now holds both
  documented examples to the checker, and proves the hover, pressed and text
  steps moved off the base theme.
- `brand-theme.example.ts` carries the complete family in both modes (§3): dark
  `#7C5CFF` with `#000000`/`#8F73FF`/`#A28CFF`/`#C9BDFF`, light `#6A45F0` with
  `#FFFFFF`/`#5A38D8`/`#4929B8`/`#5330C8`. Every pair clears its floor (lowest:
  dark foreground on the brand fill at 4.83:1; light `primaryText` on `active`
  at 6.33:1).
- The rule — a brand that moves a fill moves its foreground, hover, pressed and
  text steps — is stated in `docs/tokens.md`'s Theme API section,
  `docs/design-system.md` §3 and the README, with the executed example kept
  identical to the documented snippet.
- Two-direction evidence, run and reverted:
  - **the contract**: the new test failed before the values changed with the
    `primaryForeground`/`primary` pair present; after the values changed it
    passes;
  - **the family**: removing `primaryActive` from `brandTheme` failed with
    `primaryActive: expected '#E0E3FF' not to be '#E0E3FF'`; restored;
  - green: **34 files, 1757 tests** (1755 before the two new tests).
- `COMPONENTS.md`'s Theme extension row, `TODO.md` and the plan index are
  updated. No cross-team row was needed.

