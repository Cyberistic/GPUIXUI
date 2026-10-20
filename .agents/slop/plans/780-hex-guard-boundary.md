# Plan 780: `isHexColor` must take a boundary value, not a string

**Status:** ready.
**Workstream:** `tokens-theme`. Owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`.
**Depends on:** 371 (the predicate and `themeColorFailures`), 067/068/096 (the
guard convention), 540/565 (the colour-form index).

## 1. The defect

`color.ts` documents `isHexColor` as the helper for an **unknown boundary**:

```ts
/**
 * ... use this at a boundary that receives a role from storage,
 * a URL or a payload.
 */
export const isHexColor = (value: string): boolean => hexColor.test(value);
```

`docs/tokens.md` §*Colour format* repeats the promise — "`isHexColor` is the
predicate for one value, for a boundary that receives a role from storage, a URL
or a payload" — and `docs/design-system.md` §*Colour format* says it "is the
predicate for a single stored role".

A stored role is `unknown`. With `(value: string) => boolean`:

- `isHexColor(stored)` does not type-check, so the documented call cannot be
  written at the boundary it is documented for;
- the result is a `boolean`, so even a consumer that first narrows with
  `typeof stored === "string"` gets no narrowed `string` back, and has to
  repeat the runtime test or use a cast (which `AGENTS.md` §2 forbids);
- every other guard the package ships for boundary input — `isPlatformName`,
  `isThemeMode`, `isThemeContrast`, `isDensityName`, `isControlSize`,
  `isStatusTone`, `isPlatformRecipeName` — takes `unknown` and returns a type
  predicate.

`guards.test.ts` is the suite that proves that convention with a
`ReadonlyArray<unknown>` of non-strings, and it is the reason the defect is
visible: `isHexColor` is the only guard it does not cover, because it cannot be
handed the same values.

This is a **type-level** defect. At runtime the guard already behaves
(`hexColor.test(42)` coerces and is false), so the regression is proved by
`nub run check-types`, exactly as `react-consumer.test.ts` proves its consumer
shape.

## 2. The fix

One signature, one JSDoc, and the suite that should already have covered it.

### 2.1 `packages/tokens/src/color.ts`

Replace the declaration and its JSDoc:

```ts
/**
 * Narrow an unknown value — a colour role read from storage, a URL or a payload
 * — to the `#RRGGBB` or `#RRGGBBAA` form {@link alpha}, `compositeOver` and
 * `contrastRatio` parse. GPUix accepts every CSS colour form, so a named or
 * functional colour is paintable but invisible to the token maths; this is the
 * boundary guard for one value, and `themeColorFailures` is the theme-wide
 * check.
 *
 * @example
 * ```ts
 * import { isHexColor } from "@gpuixui/tokens";
 *
 * isHexColor("#191D25"); // true
 * isHexColor("#7567F23D"); // true
 * isHexColor("rebeccapurple"); // false
 * isHexColor(null); // false
 * ```
 */
export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && hexColor.test(value);
```

- Do **not** change `hexColor`, `alpha`, `compositeOver`, `contrastRatio`,
  `colorRoles`, `themeColorFailures` or any palette value.
- `typeof value === "string"` is the package's existing runtime idiom (it has no
  Effect dependency: see the README's *Why no Effect here*); do not import
  `Predicate` for one check.
- The predicate is sound: it only ever returns `true` for a `string`.

### 2.2 `packages/tokens/src/guards.test.ts`

Add `isHexColor` to the import from `./index.js` and add one `describe` beside
the other guard blocks, in the same shape:

```ts
describe("isHexColor", () => {
  it("accepts the six- and eight-digit hex form, either case", () => {
    ["#191D25", "#7567F23D", "#191d25", "#7567f23d"].forEach((value) =>
      expect(isHexColor(value), value).toBe(true),
    );
  });

  it("rejects every other CSS form, a malformed string and non-strings", () => {
    ["#FFF", "#191D25FF00", "#GG0000", "black", "rgb(0 0 0)", "", ...nonStrings].forEach(
      (value) => expect(isHexColor(value), String(value)).toBe(false),
    );
  });

  it("narrows an unknown value to the string a role must be", () => {
    const accepted = (value: unknown): string =>
      isHexColor(value) ? value : "#000000";

    expect(accepted("#191D25")).toBe("#191D25");
    expect(accepted(42)).toBe("#000000");
    expect(accepted(undefined)).toBe("#000000");
  });

  it("accepts every shipped role value", () => {
    shippedThemes.forEach(({ theme }) =>
      colorRoles.forEach((role) =>
        expect(isHexColor(theme.colors[role]), `${theme.name} ${role}`).toBe(
          true,
        ),
      ),
    );
  });
});
```

Import `colorRoles` and keep the existing `shippedThemes` import. The `accepted`
helper is the compile half: with the old signature, `isHexColor(value)` where
`value: unknown` is a type error, and the ternary cannot produce a `string`.

Do **not** delete the existing `isHexColor` cases in `color-format.test.ts`
(they cover the CSS-form matrix); this suite covers the boundary contract.

### 2.3 Documentation wording

Keep the shipped text's meaning and add the narrowing fact, so the page matches
the signature:

- `docs/tokens.md` §*Colour format*, the sentence after the example (currently
  "`isHexColor` is the predicate for one value, for a boundary that receives a
  role from storage, a URL or a payload:") — say that it takes the `unknown`
  value and narrows it to the hex string, e.g. "`isHexColor(value)` takes the
  `unknown` value a boundary receives — a role from storage, a URL or a payload
  — and narrows it to the hex string the token maths parses:".
- `docs/design-system.md` §*Colour format*, the closing clause "isHexColor is the
  predicate for a single stored role" — "`isHexColor` narrows a single stored
  role to the hex string".
- `packages/tokens/README.md`, §*Checking a theme*: "`isHexColor(value)` is the
  predicate for a single stored role" — append "and narrows the `unknown` value
  to the string".

Quote no new number and add no new figure; no change to a ratio, count, pair,
floor, metric, role or shipped theme.

### 2.4 Bookkeeping

- Add one row to `.agents/slop/plans/README.md` in the `tokens-theme` table:
  `| [780](./780-hex-guard-boundary.md) | The one boundary guard that cannot take a boundary value | F | 067, 068, 096, 371, 540, 565 | done |`.
- While editing that table, add the **missing** row for the existing plan
  `687-platform-theme-recipes.md` (its file exists and `TODO.md` cites it twice,
  but the index has no row): `| [687](./687-platform-theme-recipes.md) | Platform theme recipes: Windows XP (Luna), Aero, and Omarchy (Recipe B open) | E | 311, 688 | partial (Recipe A done in 311) |`.
- Add one ticked row to `TODO.md` under *Design tokens and theming*, phrased as
  the defect, with "(plan 780)".

## 3. Commands and expected results

Run from the worktree root.

```sh
# 1. can-fail: add the guards.test.ts block BEFORE changing color.ts
cd packages/tokens && nub exec tsc -p tsconfig.json --noEmit
# expected: FAIL — TS2345/TS2322 in src/guards.test.ts, the `unknown` value
# passed to `isHexColor` / not narrowed to `string`. Record the exact message.

# 2. apply the signature fix, then
cd packages/tokens && nub exec tsc -p tsconfig.json --noEmit
# expected: PASS.

# 3. the touched suites
cd packages/tokens && nub exec vitest run src/guards.test.ts src/color-format.test.ts src/docs.test.ts src/readme.test.ts src/snippets.test.ts src/inventory.test.ts
# expected: PASS.

# 4. the package suite
nub run --filter @gpuixui/tokens test
# expected: PASS (208 files; count grows by no new file).

# 5. gates
nub run check
nub run lint
nub run test
# expected: all green.
```

## 4. STOP conditions

- The `guards.test.ts` block **passes `tsc` before the signature change**. Then
  the guard was already boundary-safe and this plan's premise is wrong: report
  the actual signature and stop.
- Making the predicate breaks a shipped consumer type. `isHexColor` is only
  imported by `contrast.ts`, `opacity.ts` and tests; widening the parameter and
  adding a predicate is assignable to the old type. If a call site relies on
  `value` being `string` after the call in a way the predicate changes, report
  it instead of editing that call site in another package.
- Any documentation sentence in §2.3 also carries a derived count or figure that
  a suite parses. In that case edit only the clause named above and re-run the
  docs suite; do not reflow the paragraph.
- `docs.test.ts`/`readme.test.ts` reject the new wording. Then keep the old
  sentence and add one new sentence after it instead of rewriting it.

## 5. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| `guards.test.ts` — narrowing | a signature that takes `string`, or that returns `boolean` and cannot narrow `unknown` | Yes — it does not type-check before the fix (`check-types` fails), which is the recorded two-direction proof |
| `guards.test.ts` — non-strings | a guard that throws on `null`/`undefined`/`{}` instead of returning false | Yes — drop the `typeof` test and `hexColor.test({})` coerces to `"[object Object]"`; the case is a report, not a pass |
| `guards.test.ts` — shipped roles | a palette value outside the parseable form | Yes — set one role to `"black"` and the case names it |
| `color-format.test.ts` (existing) | the CSS-form matrix and `themeColorFailures` | already in place; unchanged |
| docs cases (existing) | the page still naming the predicate, the check and the failure type | already in place; unchanged |

Two-direction proof to record in §7:

1. before: `nub exec tsc -p tsconfig.json --noEmit` fails in `guards.test.ts`;
2. after: it passes and `vitest run src/guards.test.ts` passes;
3. revert only the signature (keep the test) and the same `tsc` failure returns.

## 6. Acceptance criteria

- `isHexColor` takes `unknown`, returns `value is string`, and is false for every
  non-string without throwing.
- `guards.test.ts` covers the guard like the other seven, including the
  narrowing case, and the block fails `check-types` without the fix.
- The three documents state the narrowing, and no figure, count, pair, floor,
  metric, role or shipped theme moves.
- Plan 687 has an index row and plan 780 is indexed.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Execution record

- **Before the fix**, with the `guards.test.ts` block in place and the signature
  unchanged, `nub exec tsc -p tsconfig.json --noEmit` failed with:
  - `src/guards.test.ts(173,44): error TS2345: Argument of type 'unknown' is not
    assignable to parameter of type 'string'.`
  - `src/guards.test.ts(178,18): error TS2345` — the `nonStrings` spread;
  - `src/guards.test.ts(178,27): error TS2322: Type 'unknown' is not assignable
    to type 'string'.` — the narrowing helper's return.
- **After the fix**: the same `tsc` passes, `vitest run src/guards.test.ts`
  passes **23 tests**, and `src/color-format.test.ts` still passes.
- **The runtime half, both directions**: mutating the body to call
  `hexColor.test` without the type test (a scratch mutation, reverted) failed
  the non-strings case with `TypeError: Cannot convert a Symbol value to a
  string` at `color.ts:774`; restored, the suite passes. The regex coerces its
  argument, so the `Symbol("hex")` case is what proves the guard tests the type
  before the form.
- **Docs**: `docs/tokens.md` §*Colour format*, `docs/design-system.md`
  §*Colour format* and `packages/tokens/README.md` §*Checking a theme* now state
  the narrowing; `docs.test.ts`, `readme.test.ts`, `snippets.test.ts` and
  `inventory.test.ts` pass unchanged (304 tests across the four).
- **Green after**: `@gpuixui/tokens` **208 files / 7042 tests** (up from 7038 —
  the four new guard cases), `nub run check`, `nub run lint` and `nub run test`
  pass. No colour, pair, floor, metric, role or shipped theme moves;
  `contrastPairs` stays **470** and the figure table stays **70**.
- **Index hygiene**: plan `687` gained the row it was missing (its file existed
  and `TODO.md` cited it twice); plan `780` is indexed.
