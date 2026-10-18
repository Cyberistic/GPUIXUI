# 332 — A control that becomes disabled keeps acting, and keeps its focus ring

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `030` (the package), `041` (runtime verification), `065` (CheckboxGroup), `083`/`084` (the focus-ring rule and matrix), `025` (the field disabled state) |
| Status | implemented |
| Fixes | a `CheckboxGroup` row that is disabled **after** it took focus still toggles on Enter/Space; and every non-field control keeps painting its focus ring while disabled, unlike the fields |

---

## 1. The defect

`disabled` is decided from the props on the render that paints the control, but
**native focus outlives a change to it**. GPUix never blurs a host element whose
`tabIndex` disappears, so a form that disables its controls while a save is in
flight (the `examples/basic-app` save lifecycle does exactly this) leaves the
keyboard on a control that now claims to be disabled.

Measured on this host, 2026-10-18, real GPUix 0.10.0 `TestRenderer`, test theme.
Thirteen controls were focused while enabled, then re-rendered with
`disabled={true}`; `runtime.focused()` still named the same `testId` for every
one of them.

Two consequences:

1. **A `CheckboxGroup` row still acts.** `renderRow` guards its `onClick` with
   `!disabled` but not its `onKeyDown`/`onKeyUp`; every other control guards the
   handler itself (`Checkbox`, `Switch`, `Toggle`, `Button`, `Slider`,
   `NumberField`, `OTPField`, the `RadioGroup`'s `select`, the `Rating`'s
   `interactive`). Measured: the group's `onValueChange` reported **1** call
   while enabled and **2** after `disabled` became true — a toggle on a disabled
   control.
2. **A disabled control still advertises the caret.** The field painters
   (`fieldChrome`, `otpCellStyle`, `NumberField`, `Select`'s trigger) suppress
   the focus ring when `disabled`; the action/selection painters do not.
   Measured ring count after focus, then `disabled={true}`:

   | Controls | Rings while enabled | Rings after disabling |
   | -------- | ------------------- | --------------------- |
   | `Input`, `TextArea`, `NumberField`, `OTPField`, `Select` | 1 | **0** |
   | `Button`, `Toggle`, `Checkbox`, `Switch`, `Rating`, `ToggleGroup`, `RadioGroup`, `CheckboxGroup`, `Slider`, `RangeSlider` | 1 | **1** |

   A control that cannot act must not look focused — and the package already
   decided that rule for its fields in plan `025`; the other half of the library
   never adopted it.

## 2. The rule

> **A control that cannot act must not act and must not look focused.** Native
> focus can outlive a `disabled` prop change (measured), so every activation
> path guards on `disabled` at the event — pointer and keyboard — and the
> focus-ring rule has one owner: a disabled control paints no `boxShadow` ring,
> whether or not the runtime still holds its focus. Re-enabling it paints the
> ring again, because the element never lost focus.

The ring rule already exists in the field chrome; this plan moves it into the
shared painters and deletes the duplicated gates, so there is one owner.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/CheckboxGroup.tsx` | the row's key handler refuses a disabled row, like `Checkbox`/`Switch` |
| `packages/primitives/src/core/style.ts` | `controlFocusStyle` returns no ring for a disabled spec; `sliderThumbStyle` and `ratingStarStyle` ring only when focused **and** not disabled; `otpCellStyle` passes `disabled` to `controlFocusStyle` instead of re-testing it; the rule is documented once |
| `packages/primitives/src/core/selection.ts` | `selectionBoxStyle` and `switchTrackStyle` ring only when focused **and** not disabled |
| `packages/primitives/src/components/Input.tsx` | `fieldChrome` drops its own `disabled !== true` gate — the spec carries `disabled` |
| `packages/primitives/src/components/NumberField.tsx` | the same simplification |
| `packages/primitives/src/core/style.test.ts` | a disabled spec returns no ring; the slider thumb and rating star keep it while enabled |
| `packages/primitives/src/core/selection.test.ts` | the box and the switch track paint no ring while disabled, and still do while enabled |
| `packages/primitives/src/components/selection.test.tsx` | a disabled row ignores Enter and Space; a focused disabled row paints no ring |
| `packages/primitives/runtime/disabled.runtime.test.tsx` | **new**: the activation matrix (13 controls × enabled/disabled) and the ring matrix (15 controls × enabled/disabled) |
| `packages/primitives/docs/checkbox-group.mdx` | keyboard + theming + accessibility state that a disabled row is inert and ringless |
| `packages/primitives/README.md` | the focus-state row gains the disabled rule; the measured counts move |
| `COMPONENTS.md` | `CheckboxGroup` and the focus-ring matrix notes, plus the runtime count |
| `TODO.md` | add and tick the task under the primitives workstream |
| `.agents/slop/plans/README.md` | index this plan |
| `PLAN.md` | no decision row: `focusRing`'s disabled rule is the existing contract, not a new architecture |

## 4. Exact implementation

### 4.1 `components/CheckboxGroup.tsx`

`renderRow`'s key path must refuse exactly what its click path refuses:

```ts
  const onKey =
    (phase: "down" | "up") =>
    (event: EventPayload): void => {
      if (disabled) return;
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        onActivate();
    };
```

That is the only behavioural change: the select-all parent and every option row
share `renderRow`, so both paths are covered.

### 4.2 `core/style.ts`

The rule belongs where the ring is built, not in each caller:

```ts
export const controlFocusStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  // Focus can outlive `disabled` (measured, plan `332`): the runtime never
  // blurs a host element whose tab stop disappears. A control that cannot act
  // must not advertise the caret; the field chrome and every other painter
  // take this one rule from here.
  if (spec.disabled === true) return {};
  const ring = focusRing(theme);
  return spec.invalid === true
    ? { boxShadow: { ...ring.boxShadow, color: theme.colors.destructive } }
    : ring;
};
```

`sliderThumbStyle`:

```ts
  if (spec.focused === true && spec.disabled !== true)
    style.boxShadow = focusRing(theme).boxShadow;
```

`ratingStarStyle`: the same condition. The `interactive` local already knows
`disabled`/`readOnly`; use `interactive && spec.focused === true` — a read-only
rating keeps its focus ring when focused, which is correct (it is still a tab
stop and an informational focus target), so the condition is `spec.focused ===
true && spec.disabled !== true`, not `interactive`.

`otpCellStyle` passes the state it already has and stops re-testing it:

```ts
    ...(spec.focused === true
      ? controlFocusStyle(
          {
            variant: fieldVariant,
            size: spec.size,
            invalid: spec.invalid,
            disabled: spec.disabled,
          },
          theme,
        )
      : {}),
```

### 4.3 `core/selection.ts`

Two painters, one condition each:

```ts
  if (spec.focused === true && spec.disabled !== true)
    style.boxShadow = focusRing(theme).boxShadow;
```

in `selectionBoxStyle` (the checkbox/radio box) and in `switchTrackStyle` (the
switch). The switch's thumb never paints a ring.

### 4.4 `components/Input.tsx` and `components/NumberField.tsx`

The gates are now redundant and would become a second owner of the rule:

```ts
  const ring = focused ? controlFocusStyle(spec, theme) : {};
```

```ts
      focus.focused ? controlFocusStyle(spec, theme) : {},
```

Both specs already carry `disabled`.

### 4.5 The core tests

`src/core/style.test.ts`, next to the existing ring cases:

```ts
  it("paints no ring for a control that cannot act", () => {
    // Plan 332: focus outlives `disabled`, so a disabled control used to keep
    // its ring while the fields dropped theirs.
    expect(controlFocusStyle(spec({ disabled: true }), testTheme)).toEqual({});
    expect(
      sliderThumbStyle({ size: "md", focused: true, disabled: true }, testTheme)
        .boxShadow,
    ).toBeUndefined();
    expect(
      ratingStarStyle({ size: "md", focused: true, disabled: true }, testTheme)
        .boxShadow,
    ).toBeUndefined();
    // The enabled direction still rings, so the assertions above cannot pass
    // by the painter having lost its ring entirely.
    expect(
      sliderThumbStyle({ size: "md", focused: true }, testTheme).boxShadow,
    ).toBeDefined();
    expect(
      ratingStarStyle({ size: "md", focused: true }, testTheme).boxShadow,
    ).toBeDefined();
  });
```

`src/core/selection.test.ts`:

```ts
  it("rings a focused control, but never a disabled one", () => {
    // Plan 332: a disabled control kept its ring when focus survived the prop
    // change; the fields had always dropped theirs.
    expect(
      selectionBoxStyle(spec({ focused: true }), testTheme).boxShadow,
    ).toBeDefined();
    expect(
      selectionBoxStyle(spec({ focused: true, disabled: true }), testTheme)
        .boxShadow,
    ).toBeUndefined();
    expect(
      switchTrackStyle(spec({ focused: true }), testTheme).boxShadow,
    ).toBeDefined();
    expect(
      switchTrackStyle(spec({ focused: true, disabled: true }), testTheme)
        .boxShadow,
    ).toBeUndefined();
  });
```

### 4.6 The element-tree tests

In `src/components/selection.test.tsx`'s `describe("CheckboxGroup")`, extend the
ring case and add the key case:

```ts
  it("paints no ring on a focused row that cannot act", () => {
    // Plan 332: `disabled` can arrive while the row holds native focus.
    const element = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ],
      },
      [],
      { ...groupFocus, focusedIndex: Option.some(2) },
    );
    expect(hostStyle(box(element, 1), "boxShadow")).toStrictEqual(Option.none());
    expect(Option.isSome(hostStyle(box(element, 2), "boxShadow"))).toBe(false);
  });

  it("ignores Enter and Space on a row that cannot act", () => {
    // Plan 332: the click path refused a disabled row, the key path did not.
    const onToggle = vi.fn();
    const element = render(
      {
        options: [
          { value: "email", label: "Email" },
          { value: "push", label: "Push", disabled: true },
        ],
      },
      [],
      groupFocus,
      { onToggle, onToggleAll: vi.fn() },
    );
    expectSome(hostHandler(row(element, 2), "onKeyDown"))(keyEvent("enter"));
    expectSome(hostHandler(row(element, 2), "onKeyUp"))(keyEvent("space"));
    expect(onToggle).not.toHaveBeenCalled();
    // The enabled neighbour still reports, so the case above is not vacuous.
    expectSome(hostHandler(row(element, 1), "onKeyDown"))(keyEvent("enter"));
    expect(onToggle).toHaveBeenCalledWith("email");
  });
```

`keyEvent` is the file's existing helper for an `EventPayload`-shaped key.

### 4.7 The runtime matrix — `runtime/disabled.runtime.test.tsx`

Two `it.each` tables in one file, one window per case (the ring matrix's rule:
opening windows together reports rings for the last tree only).

**Activation** — thirteen controls. Each case renders enabled, activates, then
re-renders the same tree with `disabled`, and proves three things: the enabled
half reported (so the test is live), focus survived (the measured premise), and
the disabled half reported nothing.

```tsx
interface ActivationCase {
  readonly name: string;
  readonly node: (disabled: boolean, report: () => void) => ReactElement;
  readonly focusId: string;
  readonly key: string;
  readonly release?: true;
}

const ACTIVATIONS: ReadonlyArray<ActivationCase> = [
  { name: "Button", focusId: "x", key: "enter", node: (d, r) => (
      <Button testId="x" disabled={d} onActivate={r}>Save</Button>) },
  { name: "Toggle", focusId: "x", key: "enter", node: (d, r) => (
      <Toggle testId="x" disabled={d} onPressedChange={r}>Bold</Toggle>) },
  { name: "Checkbox", focusId: "x", key: "space", release: true, node: (d, r) => (
      <Checkbox testId="x" label="Accept" disabled={d} onValueChange={r} />) },
  { name: "Switch", focusId: "x", key: "enter", node: (d, r) => (
      <Switch testId="x" label="On" disabled={d} onValueChange={r} />) },
  { name: "Rating", focusId: "x", key: "right", node: (d, r) => (
      <Rating testId="x" label="Score" disabled={d} onValueChange={r} />) },
  { name: "Slider", focusId: "x", key: "right", node: (d, r) => (
      <Slider testId="x" label="Volume" disabled={d} onValueChange={r} />) },
  { name: "RangeSlider", focusId: "x-thumb-start", key: "right", node: (d, r) => (
      <RangeSlider testId="x" label="Band" defaultValue={[20, 80]}
        disabled={d} onValueChange={r} />) },
  { name: "CheckboxGroup", focusId: "x-a", key: "enter", node: (d, r) => (
      <CheckboxGroup testId="x" label="Topics" disabled={d}
        options={[{ value: "a", label: "Alpha" }]} onValueChange={r} />) },
  { name: "RadioGroup", focusId: "x-a", key: "down", node: (d, r) => (
      <RadioGroup testId="x" label="Size" disabled={d}
        options={[{ value: "a", label: "Small" }, { value: "b", label: "Large" }]}
        onValueChange={r} />) },
  { name: "ToggleGroup", focusId: "x-a", key: "enter", node: (d, r) => (
      <ToggleGroup testId="x" label="Align" type="single" disabled={d}
        options={[{ value: "a", label: "Left" }, { value: "b", label: "Right" }]}
        onValueChange={r} />) },
  { name: "Input", focusId: "x", key: "a", node: (d, r) => (
      <Input testId="x" label="Name" disabled={d} onValueChange={r} />) },
  { name: "TextArea", focusId: "x", key: "a", node: (d, r) => (
      <TextArea testId="x" label="Notes" disabled={d} onValueChange={r} />) },
  { name: "OTPField", focusId: "x-cell-1", key: "1", node: (d, r) => (
      <OTPField testId="x" label="Code" disabled={d} onValueChange={r} />) },
];

it.each(ACTIVATIONS.map((c) => [c.name, c] as const))(
  "%s acts while enabled and not after it becomes disabled",
  async (_name, testCase) => {
    const runtime = await openWindow();
    const reports: string[] = [];
    const report = () => reports.push(_name);
    runtime.render(<Surface>{testCase.node(false, report)}</Surface>);
    runtime.keyDown(testCase.focusId, testCase.key);
    if (testCase.release === true)
      runtime.keyUp(testCase.focusId, testCase.key);
    runtime.type(testCase.key);
    runtime.flush();
    const live = reports.length;
    expect(live).toBeGreaterThan(0);
    const focused = runtime.focused();
    runtime.render(<Surface>{testCase.node(true, report)}</Surface>);
    runtime.flush();
    // The premise: focus outlived the prop change (measured, plan 332 §1).
    expect(runtime.focused()).toEqual(focused);
    runtime.type(testCase.key);
    runtime.flush();
    expect(reports.length).toBe(live);
  },
);
```

**Ring** — fifteen controls with a `disabled` prop. Enabled: focus via
`focusNext()` and expect exactly one `boxShadow`; disabled after that: none.

```tsx
const RINGS: ReadonlyArray<RingCase> = [
  ...the same fifteen controls as `focus-ring.runtime.test.tsx`, with `disabled`
  threaded through a node builder and a `testId` of "c"...
];

it.each(RINGS.map((c) => [c.name, c] as const))(
  "%s paints no ring once it becomes disabled",
  async (_name, testCase) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{testCase.node(false)}</Surface>);
    runtime.focusNext();
    runtime.flush();
    expect(ringCount(runtime)).toBe(1);
    runtime.render(<Surface>{testCase.node(true)}</Surface>);
    runtime.flush();
    expect(ringCount(runtime)).toBe(0);
  },
);
```

`ringCount` is `Arr.length(Arr.filter(runtime.all(), (e) => e.style.boxShadow !== undefined))`.

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | write §4.5–§4.7's tests **before** §4.1–§4.4 | the old code fails: `CheckboxGroup` activation 1, and ten ring cases 1 instead of 0 |
| 2 | `nub run --filter @gpuixui/primitives test -- selection style` | the new core/element cases fail in the old direction |
| 3 | `nub run --filter @gpuixui/primitives test:runtime -- disabled` | the CheckboxGroup activation case and ten ring cases fail |
| 4 | apply §4.1–§4.4 | — |
| 5 | repeat steps 2–3 | all green |
| 6 | `nub run --filter @gpuixui/primitives test` | 40 files green (529 + the new cases) |
| 7 | `nub run --filter @gpuixui/primitives test:runtime` | 22 files green (319 + 28) |
| 8 | `nub run --filter @gpuixui/primitives check-types` | `Done` |
| 9 | `nub run check` | tests, lint, fmt and types green |
| 10 | `nub run test` | every workspace green |
| 11 | `nub run --filter @gpuixui/basic-app test:runtime` | the composed app still green (it disables its form during save) |

## 6. STOP conditions

- **STOP** if a **read-only** `Rating` loses its focus ring: read-only is still a
  tab stop and an informational focus target; only `disabled` suppresses.
- **STOP** if `controlFocusStyle` starts returning a ring for a disabled spec
  from any caller — the rule has one owner and every caller must get the same
  answer.
- **STOP** if the enabled half of the matrix reports zero: the case is then
  vacuous and the disabled half proves nothing.
- **STOP** if focus does **not** survive a disable in a matrix case: the premise
  changed and the plan's rule needs re-measuring before the guard is trusted.
- **STOP** outside §3's files.

## 7. Acceptance

- [x] A `CheckboxGroup` row that becomes disabled while focused reports nothing
      on Enter or Space; a disabled row never reports from either path.
- [x] Every control that takes `disabled` paints no focus ring once disabled,
      including the ten that used to keep it, and still paints one while enabled.
- [x] The rule has one owner (`controlFocusStyle`) plus the three painters that
      do not use it; no caller re-tests `disabled` before asking for the ring.
- [x] The activation and ring matrices run in the real runtime and fail in the
      old direction (measured below).
- [x] Docs, `COMPONENTS.md`, `TODO.md` and the plan index agree; both suites,
      `nub run check` and `nub run test` are green.

## 8. Measured results

### 8.1 Both failing directions

The probes that found the defect (old code, this host, 2026-10-18):

```
focused → re-render disabled → runtime.focused()      same testId, all 13 controls
CheckboxGroup: onValueChange calls                    enabled 1 → disabled 2
rings after disable   Input/TextArea/NumberField/OTPField/Select   1 → 0
rings after disable   Button/Toggle/Checkbox/Switch/Rating/
                      ToggleGroup/RadioGroup/CheckboxGroup/
                      Slider/RangeSlider                            1 → 1
```

With the new tests written first, the fix was reversed as one patch
(`git apply -R`), the suites run, and the patch re-applied:

| Suite | Failures in the old direction |
| ----- | ----------------------------- |
| `src/core/style.test.ts` | `paints no ring for a control that cannot act` — `expected { boxShadow: … } to deeply equal {}` |
| `src/core/selection.test.ts` | `rings a focused control, but never a disabled one` — `expected { offsetX: 0, … } to be undefined` |
| `src/components/selection.test.tsx` | `paints no ring on a focused row that cannot act` — `expected Some {…} to strictly equal None`; `ignores Enter and Space on a row that cannot act` — `expected "vi.fn()" to not be called at all, but actually been called 2 times` |
| `runtime/disabled.runtime.test.tsx` | 12 of 29 — `CheckboxGroup acts while enabled and not after it becomes disabled` (`expected 3 to be 2`), the ten action/selection ring cases (`expected 1 to be +0`), and `keeps the ring off a disabled control that still holds focus` |

The five field ring cases and the other twelve activation cases pass in both
directions by design: their guard already existed. That is the point of the
matrix — the bug is a control that **forgot** the rule, and the enabled half of
each case proves the case is live.

### 8.2 After the fix

```
nub run --filter @gpuixui/primitives test
  Test Files  40 passed (40)
       Tests  533 passed (533)   (529 + 4)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  22 passed (22)
       Tests  348 passed (348)   (319 + 29)

nub run --filter @gpuixui/basic-app test:runtime
  Test Files  1 passed (1)
       Tests  6 passed (6)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done          (exit 0)

nub run test
  tokens 196, testing 19, icons 19, playground 11, components 308,
  primitives 533 — all green
```

The rule is now one line in `controlFocusStyle` plus the same condition in the
four painters that do not call it; `fieldChrome`, `NumberField` and
`otpCellStyle` lost their duplicate `disabled` tests, so a future change to the
rule cannot land in one half of the library only.
