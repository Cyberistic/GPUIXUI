# 584 — `autoFocus` after a later mount, and the field locator that hid it

**Phase:** F (truth / interaction)
**Owner:** primitives workstream
**Depends on:** 025, 030, 041, 047, 054, 064, 327, 339, 574
**Status:** done — measured, implemented, documented and guarded

---

## 0. Outcome summary

## 1. The bug

`examples/basic-app` says a field added after the first render "does **not**
receive `autoFocus` from the runtime" and therefore ships no `autoFocus` at all
(`examples/basic-app/README.md`, plan `327` §7.1). That statement is false, and
the measurement behind it was taken with a tool that could not see the field.

Measured on this host, 2026-10-19, with the store's 0.10.0 binding
(`packages/primitives`, `runtime/auto-focus.runtime.test.tsx`): a field that
mounts **after** the window's first render does take native focus.

| Case (first render has no field) | `runtime.focused()` |
| -------------------------------- | ------------------- |
| `<Input autoFocus />`            | `field`             |
| controlled `<Input value="" autoFocus />` | `field`     |
| `<TextArea autoFocus />`         | `area`              |
| `<OTPField length={4} autoFocus />` | `code-cell-1`    |
| `<NumberField autoFocus />`      | `none` — the input carries no `testId`, so `focused()` has nothing to name |
| `<Input disabled autoFocus />`   | `none` (correct)    |

`Runtime.focused()` is defined as "the focused element's `testId`"
(`packages/primitives/src/testing/runtime.ts:332`). In `examples/basic-app` the
e-mail `Input` never had a `testId`, so the probe in plan `327` returned
`none` whether or not the field held focus; the app then removed a working prop
and documented a runtime limitation that does not exist.

`NumberField` is the one field that cannot be named because its text host has no
locator: the wrapper owns `testId`, while `Select` (`-trigger`), `OTPField`
(`-cell-N`) and both sliders (`-thumb`, `-thumb-start/end`) already expose the
element that actually holds focus.

## 2. The decision

1. **A field's focus contract is proven on every mount**, not only the window's
   first render. The runtime owns `autoFocus` when the host exists; nothing in
   the component needs to poll or steal focus.
2. **A `NumberField`'s text host gets a stable locator**, `${testId}-input`, the
   same child-locator shape the rest of the package uses. `testId` alone stays
   the chrome, so existing consumers are unaffected.
3. **`examples/basic-app` demonstrates the contract**: its first field
   (`Workspace name`) gets `testId="settings-workspace"` and `autoFocus`, and the
   app suite proves focus lands there after the skeleton is replaced. This is
   the realistic "form arrives after a load" shape, and it replaces a false
   limitation with a working example.
4. The old claim is corrected in the app README and plan `327`; the field pages
   state the measured contract (focus on every mount, including after a loading
   state).

No new runtime dependency, no polling, no focus model change.

## 3. Exact changes

### 3.1 `packages/primitives/src/components/NumberField.tsx`

On the native `<input>` (the host that takes focus), add:

```tsx
testId={props.testId === undefined ? undefined : `${props.testId}-input`}
```

Keep `testId={props.testId}` on the chrome wrapper. Do not change the steppers.

### 3.2 `packages/primitives/src/components/NumberField.test.tsx`

In the element-tree suite, add one case:

- render `{ testId: "nf", label: "Amount" }`;
- assert the wrapper's `testId` is `nf`;
- assert its child `<input>`'s `testId` is `nf-input`;
- assert no `testId` is invented when the prop is absent (`undefined`).

### 3.3 `packages/primitives/runtime/auto-focus.runtime.test.tsx` (new)

The file already exists from the probe; keep the header comment and finish the
table:

1. Input mounts later with `autoFocus` → `runtime.focused()` is `field`.
2. Controlled Input (`value=""`) mounts later → `field`.
3. TextArea mounts later → `area`.
4. NumberField mounts later → `runtime.focused()` is `number-input`, and
   `runtime.type("7")` reports `7` (the end-to-end proof).
5. OTPField mounts later → `code-cell-1`.
6. A field mounts later **without** `autoFocus` → focus stays on the earlier
   focused field (mount the earlier field in the same tree; do not rely on
   element reuse).
7. A disabled field mounts later **with** `autoFocus` → nothing focused.

### 3.4 `packages/primitives/docs/{input,textarea,number-field,otp-field}.mdx`

- Each page's `autoFocus` API row gains the measured scope: "on every mount,
  including a field added after a loading state (plan `584`)".
- `number-field.mdx`'s `testId` row becomes: "stable locator on the field's
  chrome; the inner text host is `${testId}-input`".
- No other behaviour claims change.

### 3.5 `examples/basic-app/src/App.tsx`

On the **Workspace name** `Input` (the first field in the form):

```tsx
testId="settings-workspace"
autoFocus
```

Do not add `autoFocus` to the e-mail field (one autofocus target per tree).

### 3.6 `examples/basic-app/runtime/app.runtime.test.tsx`

Add one case after the skeleton→form case:

```tsx
it("focuses the first field when the form replaces the skeleton", async () => {
  const runtime = await openApp();
  expect(Option.getOrUndefined(runtime.focused())).toBe("settings-workspace");
});
```

Leave the existing six cases untouched; they never assert focus, so restoring
`autoFocus` cannot mask a failure in them.

### 3.7 `examples/basic-app/README.md`

Replace the "field that mounts after the first render does not receive
`autoFocus`" paragraph with the measured truth: the runtime does grant it, the
app's first field uses it, and the app suite proves focus after the skeleton.
Update the test count in the verified row from 5 to 7.

### 3.8 `COMPONENTS.md`

Append one short sentence to the Tier 1 rows for **Text inputs**, **Text
areas**, **Number Field** and **OTP Field** (or the Number Field row alone if
the others become noisy): "A later mount takes `autoFocus`; plan `584` proves it
after a loading state. `NumberField`'s inner text host is `${testId}-input`."

### 3.9 `.agents/slop/plans/327-basic-app-native-workflow.md`

Under §7.1's `autoFocus` bullet, add: "**Corrected by plan `584`:** the empty
`runtime.focused()` was a locator artifact — the app's field had no `testId`,
and `focused()` names the focused element's `testId`. A later mount does receive
`autoFocus`; plan `584` restores it and proves it."

### 3.10 `TODO.md`

Add under the primitives workstream:

```
`[x]` `packages/primitives` + `examples/basic-app`: **the false `autoFocus`
      limitation** — ...
```

Tick after the tests run, with the measured counts.

## 4. Commands and expected results

```sh
# New runtime matrix (binding present on this host)
cd packages/primitives
nub exec vitest run --config vitest.runtime.config.ts runtime/auto-focus.runtime.test.tsx
# expect 7 passed

# Element-tree locator + the whole offline suite
nub exec vitest run src/components/NumberField.test.tsx
# expect the new case passes
nub run --filter @gpuixui/primitives test
# expect all offline tests passing (52 files)

# The app example
nub run --filter @gpuixui/basic-app test:runtime
# expect 7 passed, including the new focus case
nub run --filter @gpuixui/basic-app check-types
# expect exit 0

# Completion gate
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
nub run check && nub run lint && nub run test
# expect green
```

## 5. STOP conditions

- **STOP** if the app's first field does **not** take focus after the skeleton
  even with `testId` and `autoFocus`. Do not fake it: record the measurement and
  leave `autoFocus` off, or investigate the real cause (the element may be
  reused rather than mounted).
- **STOP** if `focused()` reports the *wrapper* rather than `settings-workspace`;
  do not add a second testId to the same host as a workaround.
- **STOP** before editing `packages/components`, `apps/docs` or any other
  workstream's paths. The component-library consequence of the app fix is none.
- **STOP** if the new matrix passes with `autoFocus` removed (it must fail in
  the no-prop direction); then the assertion is not measuring the prop.

## 6. Test plan (two directions)

The new runtime cases must fail with the fix reverted:

1. Remove `autoFocus` from the app's first field → the app focus case fails
   (`none` instead of `settings-workspace`).
2. Remove `${testId}-input` from `NumberField` → its matrix case fails on the
   locator and the typing proof has no focused host to type into.
3. Remove `autoFocus` from the NumberField matrix case → focus stays on the
   earlier control; the case fails by name.
4. Disabled + `autoFocus` must stay a no-op in both directions.

## 7. Acceptance

- The app's first field takes focus after the skeleton, proven in the native
  runner.
- Every field that accepts `autoFocus` is proven on a later mount, or its
  absence is explained by a measured fact.
- `NumberField`'s focus host is addressable as `${testId}-input` and documented.
- The false limitation is gone from the app README and corrected in plan `327`.
- Offline, app-runtime, `check`, `lint` and `test` are green.

## 8. Outcome (measured 2026-10-19)

- **The runtime grants `autoFocus` on a later mount.** The 7-case matrix in
  `packages/primitives/runtime/auto-focus.runtime.test.tsx` passes: `Input`,
  controlled `Input`, `TextArea`, `NumberField` (typing reports `7`) and
  `OTPField` (first cell), plus the no-prop and disabled refusals.
- `NumberField`'s inner text host is `${testId}-input`; without the locator the
  matrix's NumberField case fails `none` vs `number-input`, and the element-tree
  case fails on the missing child locator.
- `examples/basic-app`'s first field (`Workspace name`) takes focus after the
  skeleton. Removing `autoFocus` fails the new app case with `undefined`; adding
  it back passes. The suite is 6/7 on this host because the existing consent-row
  reachability case is short by the release-tag published box model (plan `529`
  §6.5) — independent of this change, measured with and without `autoFocus`.
- Offline: `nub run test` → primitives **52 files / 751 tests**, all passing;
  `nub run check` green.
- The false claim is gone from `examples/basic-app/README.md`, plan `327` §7.1
  points at this correction, and the four field pages state the real scope.
