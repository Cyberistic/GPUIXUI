# Plan 675 — A part's default testId must not discard the caller's

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 111, 117, 158, 300–305, 337, 391 |
| Status | **done** — `AlertDismiss` defaults its handle and the caller's `testId` wins; 2 native cases fail at `HEAD` and pass after, Alert 14/14 |
| Claimed number | `675` — `673` is `tokens-theme`'s and `674` is `playground`'s; checked across every worktree on 2026-10-19 and recorded in `PLAN.md` D30 |

## 0. Why this plan exists

`AlertDismiss` inherits the GPUix host props from `Props`, so `testId` is part of
its public type. The part hard-codes the handle **after** spreading `...rest`:

```tsx
<IconButton
  {...rest}
  size="sm"
  label={label}
  testId="alert-dismiss"
  onClick={...}
>
```

The caller's `testId` is therefore overwritten, silently. This is a host prop
that does nothing (the class of defect plan `049` fixed for `Switch`), and it
means two alerts on one screen cannot be addressed apart — a common composition
(a dismissable banner and a validation summary), and the exact problem a native
test or a consumer's test hits first.

Measured in this worktree on 2026-10-19 with the real `TestRenderer`, at `HEAD`:

```text
<AlertDismiss testId="close-notice" … />
  findByTestId("close-notice")   → undefined
  findByTestId("alert-dismiss")  → the control

two alerts, the second with testId="second-dismiss"
  findByTestId("second-dismiss") → undefined
```

The sibling parts already use the correct shape: `SearchInput` derives
`rest.testId ?? "search-input"`, `DialogContent`/`DrawerContent` destructure
`testId` with a default, and `DatePickerContent` spreads `...rest` after its
default. `AlertDismiss` is the outlier in `packages/components/src`.

## 1. The rule

A public part may ship a **default** handle, never a fixed one. If the part's
props include `testId`, the caller's value wins; the default keeps every
existing test and every documented handle working. Internal controls that are
not independently addressable (`search-clear`, `dialog-close`, `confirm-accept`)
keep their fixed ids — they are not parts a caller names.

## 2. Exact files to change

1. `packages/components/src/alert.tsx` — `AlertDismiss` destructures `testId`
   with the shipped default and passes it through.
2. `packages/components/src/behaviour/alert.test.tsx` — two native cases: a
   caller's `testId` is the handle, and two alerts' dismiss controls are
   distinct.
3. `packages/components/docs/alert.mdx` — the API row for `testId`, the
   accessibility sentence, and the verification count `12 → 14` with the new
   cases named.
4. `COMPONENTS.md` — the Alerts row: count `12 → 14`, plus the default-handle
   clause.
5. `TODO.md` — a new ticked hardening item under Tier 2.
6. `.agents/slop/plans/README.md` — index row `675`.
7. `PLAN.md` D30 — record `675` as the next components overflow number.

Delete `packages/components/src/behaviour/scratch-alert-testid.test.tsx` (the
measurement fixture used to write this plan); it must not be committed.

## 3. Implementation

### 3.1 `src/alert.tsx`

Destructure the prop and use it after `...rest`:

```tsx
export const AlertDismiss = ({
  onDismiss,
  label = "Dismiss",
  testId = "alert-dismiss",
  onClick,
  ...rest
}: AlertDismissProps) => {
```

and inside the `IconButton`:

```tsx
      testId={testId}
```

Everything else (the icon colour, `size="sm"`, the `onClick` composition) stays
as it is. `AlertDismissProps` already carries `testId` through `Props`; no type
change is needed. Do **not** allow a caller to drop the handle by passing
`testId={undefined}` — a default parameter gives the shipped id, which is the
same rule `DialogContent` follows.

### 3.2 Native cases

Add next to the existing dismiss-control cases in
`src/behaviour/alert.test.tsx`. Use a real keyboard activation, not a
coordinate press, so two stacked alerts cannot hit-test into each other.
`renderComponent`'s fixture must have one root: wrap the two alerts in a `div`.

```tsx
/**
 * The bug this guards (plan 675): `AlertDismiss` hard-coded its testId after
 * `...rest`, so a caller's `testId` was silently discarded and two alerts on a
 * screen shared one handle. The default stays `alert-dismiss`.
 */
it("keeps the caller's testId on its dismiss control", () => {
  const onDismiss = vi.fn();
  const alert = renderComponent(
    <Alert testId="alert">
      <AlertDismiss testId="close-notice" onDismiss={onDismiss} />
    </Alert>,
  );

  const dismiss = alert.renderer.findByTestId("close-notice");
  expect(dismiss).toBeDefined();
  if (dismiss === undefined) return;

  alert.renderer.focusElement(dismiss.id);
  alert.renderer.simulateKeystrokes("enter");

  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(alert.renderer.findByTestId("alert-dismiss")).toBeUndefined();

  alert.unmount();
});

it("gives two alerts' dismiss controls distinct handles", () => {
  const first = vi.fn();
  const second = vi.fn();
  const alerts = renderComponent(
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Alert testId="first">
        <AlertDismiss onDismiss={first} />
      </Alert>
      <Alert testId="second">
        <AlertDismiss testId="second-dismiss" onDismiss={second} />
      </Alert>
    </div>,
  );

  const dismiss = alerts.renderer.findByTestId("second-dismiss");
  expect(dismiss).toBeDefined();
  expect(alerts.renderer.findByTestId("alert-dismiss")).toBeDefined();
  if (dismiss === undefined) return;

  alerts.renderer.focusElement(dismiss.id);
  alerts.renderer.simulateKeystrokes("enter");

  expect(second).toHaveBeenCalledTimes(1);
  expect(first).not.toHaveBeenCalled();

  alerts.unmount();
});
```

`vi`, `renderComponent` and `Alert`/`AlertDismiss` are already imported by the
file. Add no other imports.

### 3.3 Docs and inventory

`docs/alert.mdx`:

- API table, after the `label` row:

  | `AlertDismiss` | `testId` | `string` | `"alert-dismiss"` |

- Accessibility bullet currently reads “Its `testId` is `alert-dismiss`.” Change
  it to say the handle **defaults** to `alert-dismiss` and that a caller passes
  its own when more than one alert can be on screen.
- Verification sentence: `(12 tests)` → `(14 tests)`, and name the two new
  cases alongside the existing dismiss clause.

`COMPONENTS.md`, Alerts row: `12 native behaviour tests` → `14`, and add
“`AlertDismiss` defaults its handle to `alert-dismiss` and honours a caller
`testId`, so two alerts are addressable apart (plan 675)”.

## 4. Test plan

From `packages/components`:

```sh
# HEAD: both new cases fail (`findByTestId("close-notice")` /
# `findByTestId("second-dismiss")` are undefined). Paste the two failures.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/alert.test.tsx

# After §3.1–§3.2: 14/14.
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/alert.test.tsx

# The docs count and inventory contract still agree.
nub run test

# Package gates.
nub run check
nub run lint
```

Both-direction proof: run the Alert suite **before** the source change and
paste the two failures (each must fail alone); apply the source change and run
all four commands again. Reverting only `src/alert.tsx` must restore both
failures.

## 5. STOP conditions

- Either new case passes at `HEAD`: stop — the measurement in §0 no longer holds
  and the plan's premise is wrong.
- Any existing Alert case changes verdict: stop and name it. The default handle
  must keep `clickCentreOf(alert, "alert-dismiss")` and the keyboard case
  working unchanged.
- `inventory.test.ts` reports a docs count mismatch: stop — update the page, do
  not weaken the check.
- A caller `testId` that is only whitespace is refused by the runtime: stop and
  report; do not add trimming that no other part does.
- The fix needs a change outside `packages/components`: stop. `docs/component-api.md`
  belongs to this workstream but is not needed here.

## 6. Acceptance

- `<AlertDismiss testId="close-notice" />` is found by that handle, and the
  shipped default `alert-dismiss` still names an unnamed control.
- Two alerts' dismiss controls are distinct and each runs its own `onDismiss`;
  one press runs once.
- `alert.test.tsx` is 14 tests, all passing; the unit suite and the docs count
  check are unchanged; `nub run check` and `nub run lint` exit `0`.
- `docs/alert.mdx`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan
  index agree.
- One commit: `fix(components): AlertDismiss honours the caller's testId (plan 675)`.

## 7. Results

- `src/alert.tsx`: `AlertDismiss` destructures `testId = "alert-dismiss"` and
  passes it after `...rest`, so a caller's handle is preserved while the shipped
  default stays the same.
- `behaviour/alert.test.tsx`: two cases — a caller `testId` is the handle (and
  the default is then absent), and two alerts' dismiss controls are distinct and
  each runs only its own `onDismiss`. The file is 14 tests.
- Both-direction proof: with only `src/alert.tsx` stashed, both new cases fail
  (`expected undefined to be defined` for `close-notice` and
  `second-dismiss`); restoring the source gives 14/14.
- `docs/alert.mdx`: the `testId` API row, the accessibility default sentence and
  the 14-test verification paragraph; `COMPONENTS.md` row synced.
- Gates: `nub run --filter @gpuixui/components test` 473/473 (46 files),
  `nub run test` (all workspaces) green, `nub run check` and `nub run lint` exit
  `0`.
