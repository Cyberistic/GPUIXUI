# 662 — Tag input: a fractional `max` admits one token too many

**Phase:** F (data truth)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 110 (package and harness), plan 117 (verification gate),
plan 314 (Tag / token input), plan 562 (a refused tag edit reports nothing),
plan 651 (the malformed-count-cap rule and `wholeCap`).
**Status:** done 2026-10-19 — `wholeCap` normalises the cap once: a fractional
`max` truncates and a non-finite one means no cap. 2 pure cases (one of which
also pins the non-finite meaning) + 1 native case (Tag / token input 16, unit
472); the fractional assertions are red on the old raw comparison. Docs,
`COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the inventory synced.

## 1. The bug

`addTokens` compares the live length with the caller's raw cap:

```ts
if (rules.max !== undefined && Arr.length(tokens) >= rules.max) return tokens;
```

With `max={1.5}` and one token, `1 >= 1.5` is false, so a second token is
admitted: the control allows `Math.ceil(max)` tokens. Every other count cap in
the package was normalised by plan 651 (`Pagination.siblingCount`,
`MentionInput.maxVisible`, `CommandMenu.recentLimit`); the tag input was missed.

Measured on this host, 2026-10-19, with the pure rule and the native harness:

| Start | Add | `max` | At `HEAD` | Expected |
| ----- | --- | ----- | --------- | -------- |
| `["a"]` | `"b"` | `1.5` | `["a", "b"]` | `["a"]` |
| `[]` | `"a"` | `NaN` | `["a"]` | `["a"]` (no cap) |

A non-finite cap already behaves as "no cap" by accident of comparison; the fix
keeps that meaning deliberately through `wholeCap`.

## 2. Scope

**In scope**

- `packages/components/src/tag-input/logic.ts`: normalise `rules.max` once with
  `wholeCap` before the reduction, and compare against the normalised cap.
- `packages/components/src/tag-input/logic.test.ts`: one pure case for a
  fractional cap and one for a non-finite cap.
- `packages/components/src/behaviour/tag-input.test.tsx`: one native case — an
  initial token with `max={1.5}` refuses the next commit.
- Docs, `COMPONENTS.md`, the plan index, `PLAN.md` D30, `TODO.md` and the
  inventory test count (native 15 → 16; pure 14 → 16).

**Out of scope — do not touch**

- No public API change: `max?: number` stays.
- No change to `allowDuplicates`, duplicate refusal, `editDraft`, removal, the
  disabled contract or the no-op reporting rule (plan 562).
- No playground edit (owned by the playground workstream).

## 3. Exact implementation

### 3.1 `packages/components/src/tag-input/logic.ts`

1. Import the shared rule:

   ```ts
   import { wholeCap } from "../internal/count.js";
   ```

2. Normalise once at the top of `addTokens`, then use it in the guard:

   ```ts
   export const addTokens = (
     current: ReadonlyArray<string>,
     incoming: ReadonlyArray<string>,
     rules: AddRules = {},
   ): ReadonlyArray<string> => {
     const max = rules.max === undefined ? undefined : wholeCap(rules.max);
     return Arr.reduce(incoming, current, (tokens, token) => {
       if (max !== undefined && Arr.length(tokens) >= max) {
         return tokens;
       }
       // … unchanged duplicate and append branches
     });
   };
   ```

   `wholeCap` truncates a finite value (floor at `0`) and maps a non-finite one
   to `Infinity`, so `max={0}` still refuses every addition, `max={1.5}` admits
   one token, and `max={NaN}` is no cap.

### 3.2 What must not change

- The refusal returns the same array reference, so a controlled consumer still
  sees no change (plan 562).
- Duplicate refusal and `allowDuplicates: true` ordering: the cap check runs
  first, exactly as now.
- `splitDraft`, `editDraft`, `removeToken` and the component wiring.

## 4. Test plan

### 4.1 Pure cases — `src/tag-input/logic.test.ts`

Add to the `addTokens` describe, after the integer-cap case:

```ts
it("truncates a fractional cap", () => {
  expect(addTokens(["a"], ["b"], { max: 1.5 })).toEqual(["a"]);
  expect(addTokens([], ["a", "b"], { max: 1.5 })).toEqual(["a"]);
});

it("treats a non-finite cap as no cap", () => {
  expect(addTokens(["a"], ["b"], { max: Number.NaN })).toEqual(["a", "b"]);
  expect(addTokens([], ["a"], { max: Number.POSITIVE_INFINITY })).toEqual([
    "a",
  ]);
});
```

At `HEAD`: the fractional case returns `["a", "b"]` / `["a", "b"]`, so both
assertions fail. The non-finite case passes before and after; it pins the
intended meaning so the fix cannot change it.

### 4.2 Native case — `src/behaviour/tag-input.test.tsx`

Add beside the existing integer `max` case:

```tsx
/**
 * The bug this guards (plan 662): the cap was compared as a raw number, so a
 * fractional max admitted a token past its whole bound.
 */
it("truncates a fractional max", () => {
  const onValueChange = vi.fn();
  const tags = renderComponent(
    <Harness initial={["a"]} max={1.5} onValueChange={onValueChange} />,
  );

  type(tags, "b");
  tags.renderer.simulateKeystrokes("enter");

  expect(onValueChange).not.toHaveBeenCalled();
  expect(tags.renderer.findByTestId("chip-b")).toBeUndefined();
  expect(tags.renderer.findByTestId("chip-a")).toBeDefined();

  tags.unmount();
});
```

At `HEAD`: `onValueChange` is called with `["a", "b"]` and `chip-b` exists.

### 4.3 Commands and expected results

```sh
cd packages/components

# Before the source fix: the two pure fractional assertions and the native case
# are red.
nub run test src/tag-input/logic.test.ts
nub run test:behaviour src/behaviour/tag-input.test.tsx

# After the fix: the pure file passes 12, the native file passes 16.
nub run test src/tag-input/logic.test.ts
nub run test:behaviour src/behaviour/tag-input.test.tsx

# The package gates stay green.
nub run test
nub run check-types
```

Both-direction proof after the fix:

- restore the raw `rules.max` comparison → the fractional pure assertions and
  the native case fail;
- replace `wholeCap` with `Math.trunc` → the non-finite pure case fails
  (`Math.trunc(NaN)` is `NaN`, so every addition is refused).

If the behaviour suite reports `unsupported-host`, **STOP** and report; never
claim a pass.

## 5. Docs, inventory and ledger

- `packages/components/docs/tag-input.mdx`
  - The cap row in the rules table: say a fractional `max` truncates and a
    non-finite one means no cap (plan 662).
  - Verification: `(15 tests)` → `(16 tests)` and name the fractional-cap case;
    `(10 pure tests)` → `(16 pure tests)`, naming the new cap cases.
- `COMPONENTS.md`, Tag / token input row: `15 native behaviour tests` → `16`,
  and add the cap normalisation sentence with plan 662.
- `.agents/slop/plans/README.md`: index this plan after 661.
- `PLAN.md` D30: append that the components workstream took `662` (checked
  across every worktree: no `662` plan exists).
- `TODO.md`: add and tick the hardening task under the Tier 2 rows.

## 6. STOP conditions

Stop and report (do not improvise) if any of these happen:

- the fractional assertions pass **before** the source fix — the measurement or
  the assertion is wrong, so the bug is not proven;
- the native harness's `max` prop does not reach `addTokens` (record the tree
  and stop);
- another worktree has claimed `662` (re-check
  `find /Users/cyberistic/GPUIXUI/workspaces -path '*/.agents/slop/plans/662-*'`);
  take the next free number and record it in `PLAN.md` D30;
- `check-types`, `check-tests`, `check` or `lint` fails for a reason outside
  these files.

## 7. Acceptance

- [x] The two fractional pure assertions and the native case fail before the
      fix and pass after it; the two non-finite pure assertions pin "no cap".
- [x] The existing 15 Tag / token input cases and the existing pure cases stay
      green (the suite's one focus-ring case remains the recorded plan-540
      binding failure).
- [x] No public API, duplicate, removal, disabled or no-op-reporting change.
- [x] Docs, `COMPONENTS.md`, the plan index, `PLAN.md`, `TODO.md` and the
      inventory state the shipped behaviour and the new counts.
- [x] `nub run --filter @gpuixui/components test`,
      `nub run --filter @gpuixui/components check-types` and the targeted files
      pass.
- [x] `nub run check` and `nub run lint` pass at the repository root.
- [x] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.
