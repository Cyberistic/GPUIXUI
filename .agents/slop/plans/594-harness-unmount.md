# 594 — the runtime harness never unmounts a window

**Phase:** F (verification truth)
**Depends on:** `041`, `379`, `590`, `591`, `592`
**Owns:** `packages/primitives` only.

## 1. The bug

`runtime/fixture.tsx`'s `openWindow` calls `createRuntime`, which calls
`createTestRoot` — but nothing ever calls the root's `unmount`. Every runtime
test therefore leaves a whole React root and window alive. Since plan `590`
that root contains a `NativeFocusProvider` with a 50 ms `setInterval`, so a file
with N tests runs N tracker timers per tick. Plan `379` §6 recorded the symptom
without the cause: "a full run can still fail a couple of focus-ring cases after
many windows"; plan `592` saw it as `disabled > Button paints no ring` and
`activation` flakes that pass scoped. The leaked timers also make the
`loading` suite's `setInterval` spy depend on test order.

Evidence: `openWindow` is the only constructor used by the runtime suites
(`grep createRuntime packages/primitives/runtime` finds only the fixture), and
`TestRoot` exposes `unmount` in `@gpuix/react/testing` (`dist/testing.d.ts`), but
`packages/primitives/src/testing/runtime.ts` never forwards it.

## 2. The fix

### 2.1 Expose the teardown on the test adapter, `src/testing/runtime.ts`

Add one member to the `Runtime` interface next to `render`:

```ts
/** Unmount the React root and release the window. */
readonly unmount: () => void;
```

and return `unmount: () => root.unmount()` from `createRuntime`.

This is test-only: the root package does not export `src/testing`, and the
interface is documented as the native test adapter (plan `041` §2.2).

### 2.2 Unmount every window after its test, `runtime/fixture.tsx`

```ts
import { afterEach } from "vitest";

/** Every window opened during the current test, so its root can be closed. */
const opened: Runtime[] = [];

export const openWindow = async (
  size: { readonly width?: number; readonly height?: number } = {},
): Promise<Runtime> => {
  const runtime = await Effect.runPromise(createRuntime({ ...WINDOW, ...size }));
  opened.push(runtime);
  return runtime;
};

afterEach(() => {
  for (const runtime of opened.splice(0)) runtime.unmount();
});
```

A test that opens more than one window (the `loading` timer helper, a scene and
its re-render) has all of them closed. Tests that keep a runtime across the
test still work: the unmount happens after the body.

## 3. Test plan

No new assertions in component suites; the proof is that the existing ones
become order-independent.

1. Baseline (current `main`/branch):
   `nubx vitest run --config vitest.runtime.config.ts runtime/fields.runtime.test.tsx`
   twice — record the failure list; the `Select` Tab ring case was observed to
   pass scoped but fail in the file.
2. After the fix, run the same file twice. Expected: identical failure lists
   (the known geometry/tooltip cases only; the Tab-ring case passes in both).
3. Run `runtime/controls.runtime.test.tsx` twice: the ring cases (separated,
   radio, checkbox/switch) pass in both; the attached-group and switch geometry
   cases remain.
4. Run the whole suite twice and compare the failure count. Expected: no
   `disabled`/`activation` order flake; the count is stable and no higher than
   plan `592`'s 53 (it may drop).
5. `nub run test`, `nub run check-types`, `nub run check`, `nub run lint` —
   green.

### Both directions

- Remove the `afterEach` (or the `unmount` forwarding) and re-run item 3; the
  flake returns by case name. Restore and re-run.
- A test that opens two windows must still pass with teardown after the body
  (`loading`'s determinate/indeterminate helper is the case).

## 4. STOP conditions

- `root.unmount()` throws or crashes the native renderer: STOP, record the
  exact error, and leave the harness unchanged; do not call `render(null)` as a
  substitute without measuring it.
- A suite depends on a window surviving its test (a module-level runtime):
  STOP and report the file; the fixture is the only constructor today.
- Unmounting changes a painted result inside a test: STOP; teardown must run
  after the body only.

## 5. Acceptance

- `Runtime` has `unmount`; every `openWindow` window is closed after its test.
- The two repeated runs in §3 are order-independent and no worse than plan
  `592`'s totals.
- All gates green; plan indexed; TODO row ticked.

## 7. Result

Measured on this host, release-tag build, 2026-10-19.

**The leak:** `createRuntime` built a `TestRoot` and discarded its `unmount`, so
every `openWindow` left a React root and a 50 ms `NativeFocusProvider` interval
alive for the rest of the file.

**After the fix, repeated full-suite runs are byte-identical:**

| Run | Result |
| --- | --- |
| first | `50 files / 723 tests — 675 passed / 48 failed`, 10 failing files |
| second | `50 files / 723 tests — 675 passed / 48 failed`, the same 48 by name (`diff` empty) |

Before the fix the same suite measured 669/53 with order-dependent flakiness
(`disabled > Button paints no ring`, four activation cases) and the
`number-field` commit cases failed in the file while passing scoped. Five cases
left the failure list and none appeared; `fields` is a stable 25 and `controls`
a stable 3. The remaining 48 are the published box model and the headless
tooltip's open-on-focus:

| Family | Cases |
| --- | --- |
| geometry (box model, plan `529` §6.5) | fields 25, layout 3, controls 3, value 2, number-field 2, theme-axes 1, overflow 1, examples 1 |
| headless `Tooltip` open-on-focus (plan `583`) | overlay-trigger 8, info-tip 1, fields 1, examples 1 |

**Both directions:** removing the `afterEach` (or the `unmount` forwarding)
makes `number-field > commits the draft…` fail in its file again (while passing
with `-t`) and makes `controls`/`activation` order-dependent; restoring it
returns both runs to the table above. A test that opens two windows
(`loading > animates an indeterminate Progress…`) still passes with all windows
closed after the body.

`nub run test` (57 files / 808 tests after plan `593`), `nub run check-types`,
`nub run check` and `nub run lint` are green.

