# 326 — A failing behaviour test must not poison the next one

**Phase:** F · **Owner:** components workstream · **Depends on:** 110, 117.

## 1. Why

`renderComponent` enforces the runtime's one-window rule: a second root while the
first is mounted throws "a root is still mounted". Every suite unmounts at the end
of each test, so a **passing** suite is clean. A **failing assertion** throws
before `unmount()`, and the root stays mounted for the rest of the file.

Measured during plan 325 (`navigation-menu.test.tsx`, 2026-10-18):

```
Tests  5 failed | 453 passed
  FAIL switches panels … (the one real assertion)
  FAIL stays open … (Error: a root is still mounted)
  FAIL refuses the pointer … (same)
  FAIL never opens a disabled trigger … (same)
  FAIL reports one hover intent … (same)
```

One defect produced five failures, four of them naming tests that never ran. A
weaker executor chases the wrong tests; a report quoting the count is wrong. The
harness currently has no teardown hook at all.

## 2. What changes

### 2.1 `src/internal/test-root.tsx` — one tracked root and an idempotent teardown

- Replace `let mounted = false` with `let mounted: ComponentTestRoot | null`.
- `renderComponent` still throws when a root is mounted.
- The returned `unmount` clears the tracker only when it is this root's handle,
  then tears the root down; calling it twice is safe.
- Export `unmountComponentRoot(): void` — tears down the tracked root if any,
  and is safe when none is mounted.

### 2.2 `src/behaviour/setup.ts` (create) — teardown after every test

```ts
import { afterEach } from "vitest";
import { unmountComponentRoot } from "../internal/test-root.js";

afterEach(unmountComponentRoot);
```

### 2.3 `vitest.behaviour.config.ts` — register it

Add `setupFiles: ["./src/behaviour/setup.ts"]` to `test`. The default unit config
does not render, so it is unchanged.

### 2.4 `src/behaviour/harness.test.tsx` (create) — the two-test proof

1. Render `<text>first</text>`, assert the text, and **do not unmount**. This is
   the deliberate leak that models a failed assertion.
2. Render `<text>second</text>` and assert its text. Without the setup file this
   throws "a root is still mounted" at render time; with it, it passes.

No assertion is vacuous: both read the renderer's own text.

## 3. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types          # clean
nub run --filter @gpuixui/components test:behaviour       # 44 files, 460 tests
nub run check
nub run test
```

`test:behaviour` grows by two tests (458 → 460) and one file (43 → 44).

## 4. STOP conditions

- `createTestRoot`/`unmount` cannot be called after a test has failed (capture
  the exact error) — stop rather than weakening the one-window rule.
- Any existing suite changes behaviour or needs an edit beyond none at all.
- `afterEach` ordering (e.g. a test's own `unmount` running after the hook's)
  throws — the handle guard in §2.1 must make double teardown a no-op; if it
  still throws, stop and report the sequence.

## 5. Both-direction proof

1. Implement §2.1–§2.4, land green.
2. Comment out `setupFiles` in `vitest.behaviour.config.ts` and run
   `test:behaviour -- harness`: the second test fails with "a root is still
   mounted". Restore and re-run: 2/2. Record both results in §6.
3. Break one assertion in `navigation-menu.test.tsx` (e.g. expect the pricing
   panel after opening platform) and confirm the run reports **one** failure, not
   a cascade; revert the assertion. Record the counts.

## 6. Result

Landed 2026-10-18.

- `renderComponent` now tracks the mounted root as a handle; `unmount` clears the
  tracker only for its own root, so calling it twice is a no-op. The new
  `unmountComponentRoot` tears down whatever is mounted.
- `src/behaviour/setup.ts` registers it as an `afterEach` through
  `vitest.behaviour.config.ts` `setupFiles`. The unit config is untouched: it
  never renders.
- `src/behaviour/harness.test.tsx` is the two-test proof: a test that renders and
  deliberately leaves its root, then a test that renders normally.
- Both-direction proof, measured:
  - with `setupFiles` commented out, the harness file reports **1 failed | 1
    passed**, the failure being `renderComponent: a root is still mounted` at the
    second test;
  - restored, it reports **2 passed**.
- Cascade proof, measured: one wrong assertion in `navigation-menu.test.tsx`
  (`switches panels`, expecting the pricing panel to be absent) now reports
  **1 failed | 16 passed**; before this change the same failure reported
  **5 failed | 453 passed** because four later tests never got a window. The
  assertion was restored.
- The suite is now **44 files / 460 tests**.

## 7. Acceptance

- A test that throws after rendering does not affect the next test in the file.
- The one-window rule still rejects a second live root.
- The behaviour suite has 44 files / 460 tests and every gate in §3 is green.
- The plan is indexed and `TODO.md` records the task.
