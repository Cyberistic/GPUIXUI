# Plan 310: The copy-and-own platform example the contract rejects

**Status:** done
**Phase:** F (docs truth and extension mechanism)
**Owner:** `tokens-theme`
**Depends on:** `063` (platform style variants), `098` (the brand example that
already moves its whole family), `301` (a style declares the contrast it carries)

## 1. The gap

`docs/tokens.md` teaches the platform copy-and-own story with this snippet:

```ts
const tweaked = extendTheme(getPlatformTheme("win32", "dark"), {
  colors: { primary: "#005A9E", primaryHover: "#004578" },
  radius: { md: 3, lg: 6 },
});
```

It is the same code as `resolveEditedPlatformTheme` in
`packages/tokens/src/platform-styles.example.ts:17`. Plan `098` established the
rule that a theme moving a filled family moves **the whole family**, because an
inherited state keeps the base hue and an inherited foreground can miss the
on-colour floor. The brand example follows that rule and is held to
`themeContrastFailures`. The platform example does not:

- it names only `primary` and `primaryHover`, and inherits the Windows dark
  `primaryForeground` (`#000000`, designed for `#4CC2FF`);
- nothing runs either example through `themeContrastFailures`;
- the authored-from-scratch `contosoPlatformStyle` names only two of the five
  primary roles as well, so the canonical copyable file teaches the same partial
  edit even though the inherited values happen to pass today.

Measured with the public checker on `resolveEditedPlatformTheme("dark")`:

```
primaryForeground/primary      = 2.96:1  (floor 4.5, on-colour)
primaryForeground/primaryHover = 2.12:1  (floor 4.5, on-colour)
```

Light mode passes only because the inherited light foreground happens to be
white. The failure is real for the shipped Windows variant this example starts
from, in the mode the docs print.

This is not a palette bug: the library's twelve shipped themes are clean. It is
the documented extension path producing a theme the library would reject, the
same class of defect plan `098` fixed for the brand example.

## 2. Decision

1. **One Contoso primary family, shared by both examples.** Hoist the five
   primary roles into one `contosoPrimary` record per mode in
   `platform-styles.example.ts`, and use it in
   `resolveEditedPlatformTheme` and `contosoPlatformStyle`. Two stories
   ("start from a shipped variant" and "author from scratch") now show the same
   brand, so the file has one set of literals instead of two partial ones.

   | Role | Light | Dark |
   | ---- | ----- | ---- |
   | `primary` | `#0F6CBD` | `#5CB8FF` |
   | `primaryForeground` | `#FFFFFF` | `#001A33` |
   | `primaryHover` | `#0C5694` | `#8CCFFF` |
   | `primaryActive` | `#0A4A7D` | `#A6DBFF` |
   | `primaryText` | `#0A4A7D` | `#8CCFFF` |

   Measured floors (public `contrastRatio`):

   | Pair | Ratio |
   | ---- | ----- |
   | `#FFFFFF` on `#0F6CBD` / `#0C5694` / `#0A4A7D` | 5.38 / 7.57 / 9.18 |
   | `#001A33` on `#5CB8FF` / `#8CCFFF` / `#A6DBFF` | 8.16 / 10.44 / 11.88 |
   | light `primaryText` on the six surfaces it paints | 7.26 (active) to 9.18 (card) |
   | dark `primaryText` on the six surfaces it paints | 5.70 (active) to 10.96 (canvas) |

   Both families step away from the canvas: light darkens
   (`#0F6CBD` → `#0C5694` → `#0A4A7D`), dark lightens
   (`#5CB8FF` → `#8CCFFF` → `#A6DBFF`).

2. **Hold both examples to the same contract as the brand theme.** Add one test
   that calls `themeContrastFailures` on `resolveEditedPlatformTheme(mode)` and
   `resolveAuthoredPlatformStyle(mode)` for both modes, and one that proves the
   edited theme does not inherit the Windows state roles.

3. **Make the document print the code that runs.** Replace the snippet with the
   full family and state the rule beside it, pointing at the measured failure.
   Say the same in the authored-style section.

## 3. Files to change

### 3.1 `packages/tokens/src/platform-styles.example.ts`

- Add a module-local `contosoPrimary` record typed to
  `Readonly<Record<ThemeMode, Pick<ThemeColors, "primary" | "primaryForeground"
  | "primaryHover" | "primaryActive" | "primaryText">>>` (or a local const with
  `as const satisfies`).
- `resolveEditedPlatformTheme(mode)` uses
  `colors: contosoPrimary[mode]` with the existing `name` and `radius`.
- `contosoPlatformStyle.colors[mode]` spreads `...contosoPrimary[mode]` beside
  `accent`, `accentForeground`, `ring`, `selected` and `selectedForeground`.
- Update the JSDoc: the family moves together; the full role set is in
  `docs/tokens.md`.

### 3.2 `packages/tokens/src/platforms.test.ts`

In `describe("platform style examples")`:

- Keep the existing structural assertions.
- Add:
  - `it("holds both documented examples to the contrast contract")` — both
    helpers, both modes, `expect(themeContrastFailures(theme)).toEqual([])`.
  - `it("moves the whole brand family, not only the fill")` — for both modes,
    `primaryHover`, `primaryActive` and `primaryText` on the edited theme differ
    from `platformStyles.win32.colors[mode][role]`; the authored style carries
    the same five values as the edited theme.
  - An explicit regression assertion naming the defect: the edited dark theme's
    `primaryForeground` is not the Windows dark `#000000`.

### 3.3 `docs/tokens.md`

- Replace the `tweaked` snippet (`~451–455`) with the five-role family above.
- After the snippet, state: a partial edit inherits the base foreground, which
  measured 2.96:1 on the fill and 2.12:1 on the hover (plan `310`); both example
  themes are held to `themeContrastFailures`.
- In "Authoring a platform style" (`~475–501`), say the complete file names the
  whole primary family, and why.

### 3.4 `TODO.md` and `.agents/slop/plans/README.md`

- Add the task under "Design tokens and theming", tick it, update the count.
- Add plan `310` to the plan table with status `done` after step 6.

### 3.5 `COMPONENTS.md`

- Append one clause to the **Platform style variants** row: the copy-and-own
  example moves the whole family and is held to the contract (plan `310`).

## 4. Commands and expected results

Run from the worktree root.

1. `nub run --filter @gpuixui/tokens test`
   Expected before the fix: green (the defect is unguarded). After adding the
   contract test and before changing the example: **fails** with
   `primaryForeground/primary = 2.96` and `primaryForeground/primaryHover =
   2.12`.
2. Apply §3.1–§3.2, re-run:
   `nub run --filter @gpuixui/tokens test` → green.
3. `nub run check` → green.
4. `nub run lint` → green.
5. `nub run test` → green (every workspace).
6. `nub run --filter @gpuixui/tokens build` → exit 0.

## 5. Test plan (must fail without the fix)

- **The contract test fails on the old example.** With the pre-310
  `resolveEditedPlatformTheme`, `themeContrastFailures` returns the two pairs
  above. Removing the `primaryForeground` from the new family reproduces the same
  failure, so the guard is not satisfied by the palette alone.
- **The family test fails on a partial edit.** Delete `primaryActive` from
  `contosoPrimary`: the edited theme inherits the Windows `#9BDDFF`, and the test
  names the role.
- **The authored style cannot drift from the edited one.** Assert the five
  values are identical in both helpers; editing one copy fails.
- **Exact ratio regression.** Assert `contrastRatio` for the fixed dark
  foreground on the three dark fills is at least 4.5 — the check that would have
  caught the original 2.96/2.12 even if the family were later rearranged.
- `docs.test.ts` must stay green: no numeric table changes, so no new docs
  parser is needed.

## 6. STOP conditions

- If `themeContrastFailures` reports a failure outside the primary family for
  the new values, stop: the chosen palette is wrong, do not widen the contract.
- If a test would need a role the `Theme` does not carry, stop and record it as
  an interlock rather than adding a literal to a component.
- If the docs snippet and the example diverge, stop; the page must print the
  code the suite runs.
- Never change a shipped theme, a contrast pair, a floor or a platform style
  file to make the example pass. The defect is in the example.

## 7. Acceptance criteria

- `resolveEditedPlatformTheme` and `resolveAuthoredPlatformStyle` pass
  `themeContrastFailures` in both modes.
- The edited theme does not inherit any of the Windows primary state roles.
- `docs/tokens.md` prints the executed family and states the rule.
- The two-direction proofs above were run and recorded in §8.
- `nub run check`, `nub run lint`, `nub run test` are green.

## 8. Verification record (2026-10-18)

- **Red before the fix.** With the new contract test and the shipped example,
  `nub run --filter @gpuixui/tokens test -- platforms` failed four tests,
  including `dark primary: expected 2.9561901796603074 to be greater than or
  equal to 4.5` — the two pairs from §1 reproduced through the public checker.
- **Green after the fix.** Same command: 43 files, 2846 tests pass.
- **Second direction.** Deleting `primaryActive` from `contosoPrimary.dark`
  failed `moves the whole Contoso family` with
  `dark primaryActive: expected '#9BDDFF' not to be '#9BDDFF'` (the Windows
  value) and `keeps the authored style on the same family` with
  `expected '#E0E3FF' to be '#9BDDFF'`. Restored.
- **Full gates.** `nub run test` → 2846 pass; `nub run check` → green;
  `nub run lint` → green.
- Values shipped exactly as §2.1; no theme, pair, floor or platform style file
  changed.
