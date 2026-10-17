# 077 — `alpha` must not emit a colour the runtime ignores

| Field | Value |
| ----- | ----- |
| Phase | F (quality) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`) |
| Depends on | plans `014` (`alpha`), `056`–`059` (catalogue guards) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

`alpha(color, amount)` is the public helper that turns a semantic role into a
translucent one. Its contract says the amount is clamped to `0…1`, and its
fallback convention is that a value it cannot parse is returned unchanged, so a
colour stays solid rather than silently disappearing.

A computed amount can be `NaN` — a progress fraction whose total is zero, a
number parsed from a payload that was absent. `Math.min(Math.max(NaN, 0), 1)` is
`NaN`, so the current implementation produces:

```ts
alpha("#2559D6", Number.NaN); // "#2559D6NAN"
```

That is not a colour. GPUix ignores an unparseable colour per property, so the
surface paints the previous value or black — a silent visual failure, which is
exactly what the function's fallback convention exists to prevent.

The fix treats a non-clampable amount the same way as an unparseable colour:
return the input unchanged. `Infinity` and `-Infinity` already clamp correctly
and must keep doing so; only `NaN` is outside the range's arithmetic.

## 2. Design decisions (do not re-litigate)

1. **Return the colour, not `0` or an error.** `0` would make a `NaN` fraction
   silently transparent; a throw would break the pure inline-style path. The
   helper's documented fallback is "unchanged", and an unchanged colour is still
   paintable.
2. **Check only `Number.isNaN`.** `Number.isFinite` would change the existing
   clamp of `infinity` (`1`) and `-infinity` (`0`), which is not a defect.
3. **No new export.** The helper stays total and pure.

## 3. Exact files to change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/077-alpha-nan.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and paragraph |
| `packages/tokens/src/color.ts` | one guard in `alpha`, one JSDoc sentence |
| `packages/tokens/src/color.test.ts` | one test for a non-clampable amount |
| `docs/tokens.md` | one clause in the `alpha` section |
| `TODO.md` | one ticked row, bar updated |

Do **not** edit any path outside the workstream.

## 4. Exact changes

### 4.1 `packages/tokens/src/color.ts`

```diff
 export function alpha(color: string, amount: number): string {
+  if (Number.isNaN(amount)) {
+    return color;
+  }
   const match = hexColor.exec(color);
```

JSDoc: after "`amount` is clamped to `0…1` and rounded to the nearest byte",
add "a `NaN` amount — a computed fraction with no value — returns the colour
unchanged, the same fallback as an unparseable colour".

### 4.2 `packages/tokens/src/color.test.ts`

Inside `describe("alpha")`:

```ts
it("returns the colour unchanged for an amount it cannot clamp", () => {
  expect(alpha("#2559D6", Number.NaN)).toBe("#2559D6");
  expect(alpha("#2559D64D", Number.NaN)).toBe("#2559D64D");
});
```

The second assertion proves a translucent input keeps its alpha byte rather than
being normalised to a fake one.

### 4.3 `docs/tokens.md`

In `### alpha`, after the "A colour the parser does not recognise is returned
unchanged" sentence, add: "A `NaN` amount returns the colour unchanged for the
same reason: a computed fraction with no value must not erase a role."

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/tokens test          # exit 0; 881 → 882 tests
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

## 6. Test plan and both directions

1. Run the new test **before** the guard: both assertions fail with
   `"#2559D6NAN"` / `"#2559D64DNAN"` (the result is upper-cased). Apply the
   guard; both pass.
2. Run the existing clamp tests: `alpha(c, 2) → FF`, `alpha(c, -1) → 00`,
   `alpha(c, Infinity) → FF` and `alpha(c, -Infinity) → 00` still pass, so the
   guard did not widen into the finite clamps.
3. Delete the guard temporarily (do not commit) and confirm the new test fails
   again; restore.

## 7. STOP conditions

- If any existing `alpha` test changes behaviour, stop: the guard is too broad,
  narrow it to `Number.isNaN`.
- If a consumer needs `alpha` to fail loudly, that is a different API decision;
  report rather than throwing from a pure style helper.

## 8. Acceptance criteria

- `alpha(color, Number.NaN)` returns `color` unchanged for both six- and
  eight-digit inputs.
- The finite and infinite clamps keep their existing results.
- The JSDoc and `docs/tokens.md` state the fallback.
- The plan is indexed, `TODO.md` is ticked, and every gate in §5 exits 0.
