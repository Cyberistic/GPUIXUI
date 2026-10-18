# Plan 350: The brand-text example no test runs, and the examples-coverage guard

> **Status:** done 2026-10-18. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src`, `packages/tokens/README.md`, `docs/tokens.md`,
> `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`. No API or colour
> changes.

## Execution record (2026-10-18)

- `examples.test.ts` failed before the import with
  `primary-text.example.ts: expected '…' to contain './primary-text.example.js'`;
  it passes after the example is imported.
- Flipping the example's link colour to `theme.colors.primary` made the new
  assertion fail with `expected '#5F4BDB' to be '#4C39B5'`; it was reverted.
- Final: `nub run test` → **69 files / 4216 tests passed**; `nub run check`,
  `nub run lint` and `nub run test` are green.

## Why

An audit of every `*.example.ts` in `packages/tokens/src` found one example that
nothing imports: `primary-text.example.ts` (created by plan `082`). It compiles
because `tsconfig.json` includes `src`, but no test executes it and neither the
package README nor `docs/tokens.md` links it. Every other example is imported by
at least one suite (`accent-states`, `brand-theme`, `contrast`, `filled-control`,
`focus-ring`, `high-contrast`, `motion`, `persisted-choices`, `platform-styles`,
`platforms`, `selection`, `status-panel`, `status-text`, `status-tone`).

The convention this workstream states is that an example is runnable and
copyable: plans `067`, `068`, `096` and `311` all say "the example runs in the
suite rather than being sketched". An example nothing runs can drift from the
API it demonstrates while every gate stays green — the failure mode is silent,
because it is documentation rather than product code.

The same audit shows the convention itself is unguarded: a new
`src/*.example.ts` can ship with no test touching it. This plan fixes the one
instance and adds the missing guard.

## Files to change

### 1. New `packages/tokens/src/examples.test.ts`

```ts
/**
 * Guards the defect plan 350 fixes: `primary-text.example.ts` shipped in plan
 * 082 with no test importing it and no document linking it, so the snippet
 * could drift from the API it demonstrates while every gate stayed green. An
 * `*.example.ts` file is a runnable, copyable example by this package's own
 * convention, so a suite must import it.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// `node:fs` is deliberate: this is a policy test over the package's own source,
// and the tokens package ships zero runtime dependencies by design.
const src = new URL(".", import.meta.url);
const exampleFiles = readdirSync(src).filter((file) =>
  file.endsWith(".example.ts"),
);
const testFiles = readdirSync(src).filter(
  (file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx"),
);
const testSource = testFiles
  .map((file) => readFileSync(new URL(file, src), "utf8"))
  .join("\n");

describe("runnable examples", () => {
  it("has examples to check", () => {
    expect(exampleFiles.length).toBeGreaterThanOrEqual(15);
  });

  it("imports every example from a test, so the snippet runs", () => {
    exampleFiles.forEach((file) => {
      const specifier = `./${file.replace(/\.ts$/, ".js")}`;
      expect(testSource, file).toContain(specifier);
    });
  });
});
```

**Expected before step 2:** the second case fails with
`primary-text.example.ts` (the specifier `./primary-text.example.js` is absent
from every test). This is the two-direction proof for the guard; capture it.

### 2. `packages/tokens/src/primary-text.test.ts`

Import the example beside the other imports:

```ts
import { primaryTextStyles } from "./primary-text.example.js";
```

Add a case at the end of `describe("brand-toned text")`:

```ts
  it("runs the documented example against the role it teaches", () => {
    const theme = getTheme("light");
    const styles = primaryTextStyles(theme);

    expect(styles.link.color).toBe(theme.colors.primaryText);
    expect(styles.link.color).not.toBe(theme.colors.primary);
    expect(styles.hovered).toEqual({
      backgroundColor: theme.colors.hover,
      color: theme.colors.primaryText,
    });
    expect(styles.pressed).toEqual({
      backgroundColor: theme.colors.active,
      color: theme.colors.primaryText,
    });
    expect(styles.icon).toEqual({
      width: theme.iconSize.md,
      height: theme.iconSize.md,
      color: theme.colors.primaryText,
    });
  });
```

The `not.toBe(primary)` assertion can fail: it is the rule plan 082 exists for,
and the example is its copyable form.

### 3. `docs/tokens.md`

After the paragraph that ends "…while its text step `#0055B3` clears both."
(around line 157), add:

```md
A runnable example lives in
[`src/primary-text.example.ts`](../packages/tokens/src/primary-text.example.ts).
```

### 4. `packages/tokens/README.md`

After "A brand that changes `primary` should set `primaryText` beside it."
(around line 77), add:

```md
A runnable example lives in
[`src/primary-text.example.ts`](./src/primary-text.example.ts).
```

`readme.test.ts` parses the README's counts and tables; this sentence adds no
numeric claim, so it must not need a guard edit. If it does, stop and report.

### 5. `COMPONENTS.md`

Append to the **Design tokens** row's prose:

```md
Every `src/*.example.ts` is imported by a suite, so the copyable examples run
rather than drift (plan 350).
```

### 6. `TODO.md`

Add to the tokens section and tick it:

```md
`[x]` Make the package's own examples honest — `primary-text.example.ts` shipped
in plan 082 with no test importing it and no document linking it, so the snippet
could drift while every gate stayed green; it now runs in `primary-text.test.ts`
and is linked from the reference and README, and a new guard fails if a future
`*.example.ts` is imported by no suite (plan 350)
```

Update the section header: **118/163** (plan 349 left 117/162), bar
`[███████░░░]` (118/163 ≈ 72%).

### 7. `.agents/slop/plans/README.md`

Add after the 349 row:

```md
| [350](./350-runnable-examples.md) | The brand-text example no test runs | F | 082, 349 | done |
```

## Commands and expected results

```bash
nub run --filter @gpuixui/tokens test -- examples.test.ts
```

Expected before step 2: **1 failure**, `imports every example from a test` with
`primary-text.example.ts`. After step 2: passes.

```bash
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt
nub run check:tests
nub run check
nub run test
```

Expected: all green; report the exact test count the run prints (plan 349 leaves
68 files / 4213 tests; this plan adds one file with two cases and one case in
`primary-text.test.ts`, so expect **69 files / 4216 tests** — confirm, do not
assume).

## Both-directions verification (required)

1. Run `examples.test.ts` **before** adding the import: it must fail on
   `primary-text.example.ts`.
2. Add the import and the case: it passes.
3. Temporarily change the example's `link` colour to `theme.colors.primary` and
   run `primary-text.test.ts`: the new case must fail (`not.toBe`). Revert.
4. Run the full suite again.

## STOP conditions

- **STOP** if `readdirSync` finds an example that is intentionally documentation
  only. Report it and argue the exemption in the test rather than deleting the
  example.
- **STOP** if `readme.test.ts` or `docs.test.ts` rejects the new sentences. The
  guards are the contract; report the assertion, do not loosen it.
- **STOP** if the example's assertions reveal that it paints the wrong role.
  That is a product-doc defect: report it, and do not weaken the assertion.
- **STOP** if any colour, pair count or public export changes.

## Acceptance

- [ ] `primary-text.example.ts` is imported and asserted by
      `primary-text.test.ts`.
- [ ] Every `src/*.example.ts` is imported by a suite, and the new guard fails
      when one is not.
- [ ] The reference and README link the example.
- [ ] `COMPONENTS.md` and `TODO.md` record the change and the count re-derives.
- [ ] Plan 350 is indexed and marked done.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
