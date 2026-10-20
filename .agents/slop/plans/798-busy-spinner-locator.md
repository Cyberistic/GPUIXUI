# 798 — The busy spinner's locator, and the three red runtime cases plan 785 left behind

**Phase:** F (suite truth) · **Depends on:** `030`, `041`, `047`, `086`, `370`,
`375`, `644`, `754`, `785`

## 1. The gap (measured 2026-10-20, full runtime suite)

    nub run --filter @gpuixui/primitives test:runtime
    Test Files  1 failed | 73 passed (74)
         Tests  3 failed | 936 passed (939)

    FAIL runtime/controls.runtime.test.tsx > fits a loading IconButton's spinner inside the sm square
    FAIL runtime/controls.runtime.test.tsx > fits a loading IconButton's spinner inside the md square
    FAIL runtime/controls.runtime.test.tsx > fits a loading IconButton's spinner inside the lg square
    AssertionError: the loading button painted no status node

Scoped: `runtime/controls.runtime.test.tsx` is **53 passed / 3 failed**.

Two plans disagree about how a test finds the busy button's spinner, and neither
one is wrong about the product:

- plan `644` wrote the three **fit** cases (the dots must stay inside the icon
  button's square) and located the spinner by `role="status"`;
- plan `785` made a busy button's spinner **decorative** (`role="presentation"`,
  no name) because the button's `aria-description` already says `Loading` and the
  nested `Status` announced the same state twice.

So the fit contract is still required, and its locator no longer exists. The
same inference appears offline: `Button.test.tsx` finds the spinner as
`elementChildren(button)[0]` in three cases, and
`runtime/button-loading.runtime.test.tsx` does the same with
`Arr.head(childrenOf(…))`. "The first child" happens to be the spinner today; a
leading element added to a busy button would silently retarget every one of
those assertions.

This is the one remaining red file on the branch, and it must not be repaired by
deleting the fit assertion or by restoring the second `Status` node.

## 2. Contract

A busy `Button` (and therefore `IconButton`) publishes a **stable locator** for
its spinner:

- when the button has a `testId`, the spinner's row is `${testId}-spinner`;
- without a `testId`, the spinner has none (no invented id);
- the spinner stays `decorative` (plan `785`): no `Status` node, no name;
- the fit rule (plan `644`) is unchanged: the dots stay inside the button's
  square, and a text button keeps the text-sized dot step.

The suffix follows the package's existing locator convention — `${testId}-thumb`
(Slider), `${testId}-trigger`/`-option-…` (Select), `${testId}-input`
(NumberField), `${testId}-cell-N` (OTPField).

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Button.tsx` | pass `testId` to the busy `Spinner` as `${testId}-spinner` |
| `packages/primitives/src/components/Button.test.tsx` | one case: the seam exists with a `testId` and is absent without one |
| `packages/primitives/src/components/IconButton.test.tsx` | the loading case renders with a `testId` and asserts it reaches the composed `Button` — the seam's input |
| `packages/primitives/runtime/controls.runtime.test.tsx` | the three fit cases locate `ib-spinner`; header comment records the plan-785 locator change |
| `packages/primitives/runtime/button-loading.runtime.test.tsx` | the contrast case locates `busy-spinner` instead of the first child |
| `packages/primitives/docs/button.mdx` | `testId` row names the spinner seam |
| `packages/primitives/docs/icon-button.mdx` | the same row |
| `COMPONENTS.md` | Button and IconButton rows record the seam and the red-suite repair |
| `TODO.md` | a primitives row for the repair, ticked |
| `.agents/slop/plans/README.md` | index this plan |

Nothing outside these paths.

## 4. Exact implementation

### 4.1 `src/components/Button.tsx`

In `renderButton`, the `props.loading === true` branch:

```tsx
<Spinner
  size={spinnerDot}
  color={buttonVariants[variant].foreground(theme)}
  // The button's `aria-description` already says "Loading"; a second
  // `Status` node inside it would announce the same state twice
  // (measured, plan 785).
  decorative
  testId={
    props.testId === undefined ? undefined : `${props.testId}-spinner`
  }
/>
```

`Spinner.testId` already places the id on the dot row, so no `Spinner` change.

### 4.2 `src/components/Button.test.tsx`

Add beside the existing "makes the busy spinner decorative" case:

```tsx
it("publishes the busy spinner as `<testId>-spinner`", () => {
  // The locator the runtime suites read (plan 798): plan 644's fit cases found
  // the spinner by `role="status"`, which plan 785 removed.
  const named = resting({ loading: true, testId: "save" });
  const spinner = expectSome(Option.fromNullishOr(elementChildren(named)[0]));
  expect(elementProp(spinner, "testId")).toStrictEqual(
    Option.some("save-spinner"),
  );
  const anonymous = resting({ loading: true });
  const bare = expectSome(
    Option.fromNullishOr(elementChildren(anonymous)[0]),
  );
  expect(elementProp(bare, "testId")).toStrictEqual(Option.none());
});
```

### 4.3 `src/components/IconButton.test.tsx`

`renderIconButton` returns the **`Button` element**, not its rendered tree, so
the spinner does not exist at this level. The loading case therefore proves the
seam's *input* — the computed button id — because `${testId}-spinner` is derived
from it:

```tsx
const button = render({ loading: true, testId: "ib" });
expect(elementChildren(button)).toStrictEqual([]);
expect(elementProp(button, "loading")).toStrictEqual(Option.some(true));
expect(elementProp(button, "label")).toStrictEqual(Option.some("Close"));
expect(elementProp(button, "testId")).toStrictEqual(Option.some("ib"));
```

The end-to-end proof of `ib-spinner` is the runtime fit case (§4.4).

### 4.4 `runtime/controls.runtime.test.tsx`

Replace the `role === "status"` lookup in the three fit cases:

```tsx
const spinner = Option.getOrElse(
  runtime.bounds("ib-spinner"),
  () => expect.fail(`the ${size} icon button painted no ib-spinner`),
);
const node = Option.getOrElse(runtime.element("ib-spinner"), () =>
  expect.fail(`the ${size} icon button retained no ib-spinner`),
);
expect(node.children).toHaveLength(3);
```

Keep every containment assertion and the `expect(status.children).toHaveLength(3)`
intent (now `node.children`). Add one line to the case's header comment:

```tsx
// The locator (plan 798): the spinner is decorative since plan 785, so the
// case reads the button's `${testId}-spinner` seam rather than a status node.
```

The `Array`/`Option` imports already present stay; remove an import only if it
becomes unused (`Arr` and `Option` are used elsewhere in the file — verify).

### 4.5 `runtime/button-loading.runtime.test.tsx`

Replace:

```tsx
const spinnerId = Option.getOrElse(
  Arr.head(childrenOf(runtime, idOf(runtime, "busy"))),
  () => expect.fail("the Button painted no spinner"),
);
```

with:

```tsx
const spinnerId = idOf(runtime, "busy-spinner");
```

`idOf` already fails with `the runtime retained no busy-spinner`. `Arr` stays
used by the dot assertions; `childrenOf` stays used for the dots.

### 4.6 Docs

`docs/button.mdx` API row:

```
| `testId` | `string` | — | stable locator; the busy spinner becomes `${testId}-spinner` |
```

`docs/icon-button.mdx` API row: the same sentence, inherited from `Button`.

### 4.7 Inventory and TODO

- `COMPONENTS.md`, Buttons row: append a sentence — "**Busy locator (798):** the
  spinner is `${testId}-spinner`; the three spinner-fit runtime cases locate it
  by name, because plan `785` made it decorative (a `role="status"` locator is
  gone)."
- `COMPONENTS.md`, the IconButton sentence in the Buttons row or the Toggles
  area: not required separately — it composes `Button`.
- `TODO.md`: a new ticked primitives row naming the red suite and the repair.
- Plan index: add the `798` row with the measured counts.

## 5. Commands and expected results

Run from the repo root:

```sh
# 1. the failing file, before the change: 53 passed / 3 failed
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx

# 2. after the change: 56 passed
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx

# 3. the contrast suite the seam also changes: 2 passed
nub run --filter @gpuixui/primitives test:runtime runtime/button-loading.runtime.test.tsx

# 4. the offline suites and types
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types

# 5. repo lint
nub run lint
```

Expected: step 1 is the recorded red state; steps 2–5 are green. Do **not** run
the full runtime suite for this plan; it is the merge gate.

## 6. Both directions

1. **Old direction (the recorded bug):** before the change, step 1 reports the
   three cases failing with `the loading button painted no status node`.
2. **Seam direction:** delete the `testId` prop from `Button`'s `Spinner` after
   the fix; step 2 must fail all three cases with
   `the sm|md|lg icon button painted no ib-spinner`, step 3 must fail with
   `the runtime retained no busy-spinner`, and the new offline case must fail.
   Restore it and everything is green.
3. **No invented id:** the offline case's second half fails if the spinner is
   given a testId when the button has none.

## 7. STOP conditions

- If step 2 fails a **containment** assertion (the dots paint outside the
  button), STOP and report the measured boxes: that is a real regression of plan
  `644`'s contract, not a locator problem. Do not widen the button or shrink the
  dots inside this plan.
- If any other runtime file changes state, STOP: the seam is not local.
- Do not restore a `role="status"` to the busy spinner to make a locator work;
  plan `785`'s contract wins.

## 8. Acceptance

- `runtime/controls.runtime.test.tsx` is 56/56 and the full suite's only red
  file is green.
- The busy spinner's locator is documented on both pages, in the inventory, and
  guarded by an offline case plus two runtime files.
- No change to the painted geometry, the decorative contract, or any public prop
  other than the locator suffix.
