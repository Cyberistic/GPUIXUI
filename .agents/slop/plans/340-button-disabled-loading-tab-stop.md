# 340 — A disabled button keeps its tab stop while loading

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives |
| Depends on | `030` (the package), `041` (runtime verification), `085`/`086` (the activation and icon-button contracts), `089` (the tab-order matrix) |
| Status | done |
| Fixes | `Button`'s disabled guard is conditional on `loading`, so a disabled + loading button — the common "disable the submit control while it saves" call — stays a tab stop |

---

## 1. The defect

`Button` decides its tab stop with a two-prop expression:

```tsx
// packages/primitives/src/components/Button.tsx (before)
tabIndex={
  props.disabled === true && props.loading !== true ? undefined : 0
}
```

The intent was documented and is sound: a `loading` button **stays** focusable so
a keyboard user is not dropped from the page mid-action, while a `disabled` one
leaves the tab order (plans `085`, `089`; `docs/button.mdx` §Keyboard,
`docs/icon-button.mdx` §Keyboard). Both pages state the rule as a property of
`disabled` — "a `disabled` button is not tabbable".

The expression makes that rule conditional on a second prop. When `disabled` and
`loading` are both true, the guard fails and the element gets `tabIndex: 0`. The
call is not exotic: a form that disables its controls while saving writes
`disabled={saving} loading={saving}`, and the same combination reaches
`IconButton`, which composes `Button`.

Measured on this host, 2026-10-18, real GPUix 0.10.0 `TestRenderer`, between two
focusable sentinels (`before` → control → `after`, focus advanced with
`renderer.focusNext()`):

```
<Button     testId="c" disabled loading>Save</Button>   next Tab stops on  "c"      (a dead control)
<IconButton testId="c" icon="x" label="Close"
            disabled loading />                        next Tab stops on  "c"
<Button     testId="c" loading>Save</Button>            next Tab stops on  "c"      (correct, by design)
```

The tab-order matrix (plan `089`) only toggles `disabled` with `loading` false,
so the combination has no assertion at all — the same blind spot that produced
plan `332`'s disabled-after-focus bug: a guard written per control, tested on the
axis its author was thinking about.

## 2. The rule

> **`disabled` always wins over `loading` for the tab order.** A button leaves
> the tab order whenever `disabled` is true, regardless of any other prop; a
> `loading` button that is *not* disabled keeps its stop, so the busy-but-live
> case is unchanged.

One expression, no second prop in the guard:

```tsx
tabIndex={props.disabled === true ? undefined : 0}
```

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Button.tsx` | the `tabIndex` guard; the docstring keeps the loading rationale and says `disabled` wins |
| `packages/primitives/src/components/Button.test.tsx` | the element-tree case: `disabled + loading` is `None`, while `loading` alone stays `0` (the existing case) |
| `packages/primitives/runtime/tab-order.runtime.test.tsx` | a two-direction block for `Button` and `IconButton`: `disabled + loading` is skipped, `loading` alone is reached |
| `packages/primitives/docs/button.mdx` | §Keyboard: state that `disabled` wins when both are set |
| `packages/primitives/docs/icon-button.mdx` | same sentence |
| `COMPONENTS.md` | the Buttons row appends the fix and the measured result |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Exact implementation

### 4.1 `src/components/Button.tsx`

Replace the `tabIndex` expression (line ~122):

```tsx
tabIndex={props.disabled === true ? undefined : 0}
```

and extend the `loading` prop docstring:

```tsx
/**
 * Busy: shows a spinner and blocks activation, but stays focusable — unless
 * `disabled` is also set, which always leaves the tab order.
 */
readonly loading?: boolean;
```

### 4.2 `src/components/Button.test.tsx`

Beside "takes a disabled button out of the tab order":

```tsx
it("leaves the tab order when disabled, even while loading", () => {
  // The bug guarded (plan 340): the disabled guard read
  // `disabled === true && loading !== true`, so the common
  // `disabled={saving} loading={saving}` call stayed a tab stop — against the
  // rule both docs pages state.
  expect(
    hostProp(resting({ disabled: true, loading: true }), "tabIndex"),
  ).toStrictEqual(Option.none());
  // and the busy-but-live case is untouched
  expect(expectSome(hostProp(resting({ loading: true }), "tabIndex"))).toBe(0);
});
```

### 4.3 `runtime/tab-order.runtime.test.tsx`

After the existing matrix, a dedicated pair — the two parts that own a `loading`
state, in both directions:

```tsx
/**
 * The disabled guard must not be conditional on a second prop.
 *
 * Plan 340 measured the case the matrix above cannot see: `Button` read
 * `disabled && !loading`, so `disabled={saving} loading={saving}` — the common
 * save lifecycle — left the dead control in the tab order. `loading` alone must
 * still be reachable, so both halves run.
 */
const BUSY_CASES: ReadonlyArray<{ readonly name: string; readonly node: ReactElement }> = [
  {
    name: "Button",
    node: (
      <Button testId="c" disabled loading>
        Save
      </Button>
    ),
  },
  {
    name: "IconButton",
    node: <IconButton testId="c" icon="x" label="Close" disabled loading />,
  },
];

const LOADING_CASES: ReadonlyArray<{ readonly name: string; readonly node: ReactElement }> = [
  {
    name: "Button",
    node: (
      <Button testId="c" loading>
        Save
      </Button>
    ),
  },
  {
    name: "IconButton",
    node: <IconButton testId="c" icon="x" label="Close" loading />,
  },
];

it.each(BUSY_CASES.map((testCase) => [testCase.name, testCase.node] as const))(
  "%s leaves the tab order when disabled while loading",
  async (_name, node) => {
    const runtime = await mountAtStart(node);
    runtime.focusNext();
    expect(focusedId(runtime)).toBe("after");
  },
);

it.each(LOADING_CASES.map((testCase) => [testCase.name, testCase.node] as const))(
  "%s keeps its tab stop while loading",
  async (_name, node) => {
    const runtime = await mountAtStart(node);
    runtime.focusNext();
    expect(focusedId(runtime)).toBe("c");
  },
);
```

### 4.4 Docs

- `docs/button.mdx` §Keyboard, after the current two sentences: "When both are
  set, `disabled` wins: a busy control that is also disabled is not a tab stop."
- `docs/icon-button.mdx` §Keyboard: the same sentence.
- `COMPONENTS.md` Buttons row appends: "**Busy + disabled (340):** the disabled
  guard read `disabled && !loading`, so `disabled={saving} loading={saving}`
  stayed a tab stop; `disabled` now wins unconditionally, measured on `Button`
  and `IconButton` in both directions."

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/primitives test -- Button` **before** §4.1 | the new element-tree case fails: `expected Some(0) to strictly equal None` |
| 2 | `nub run --filter @gpuixui/primitives test:runtime -- tab-order` **before** §4.1 | the two busy cases fail: `expected 'c' to be 'after'` |
| 3 | apply §4.1–§4.4 | — |
| 4 | `nub run --filter @gpuixui/primitives test` | 41 files green (546 + 1 = 547 tests) |
| 5 | `nub run --filter @gpuixui/primitives test:runtime` | 22 files green (371 + 4 = 375 tests) |
| 6 | `nub run lint` / `nub run check` | every gate green |

## 6. STOP conditions

- **STOP** if a `loading`-only button stops being reachable — that is the
  documented busy state, not part of this fix.
- **STOP** if any other control's tab stop changes; every other control already
  guards `disabled` alone.
- **STOP** outside §3's files.
- **STOP** if the docs are changed to say the old behaviour was intended; the
  library's own rule (`disabled` ⇒ not tabbable) is the contract.

## 7. Acceptance

- [x] A button that is `disabled` and `loading` leaves the tab order; measured on
      `Button` and `IconButton`.
- [x] A `loading`-only button keeps its stop (over-fix guard).
- [x] Both directions proven (offline element tree + real `TestRenderer`), and
      the failure re-measured by restoring the old expression.
- [x] `docs/button.mdx`, `docs/icon-button.mdx`, `COMPONENTS.md`, `TODO.md` and
      this plan agree.
- [x] `nub run check`, `nub run lint` and `nub run test` green.

## 8. Measured results

### 8.1 Before the fix

```
runtime/tab-order.runtime.test.tsx — 2 failed:
  Button leaves the tab order when disabled while loading
    expected 'c' to be 'after'
  IconButton leaves the tab order when disabled while loading
    expected 'c' to be 'after'
  (the loading-only pair passed: 'c' is correct there)
```

### 8.2 After the fix

```
nub exec vitest run --config vitest.runtime.config.ts runtime/tab-order.runtime.test.tsx
  Test Files  1 passed (1)
       Tests  36 passed (36)

nub run --filter @gpuixui/primitives test
  Test Files  41 passed (41)
       Tests  547 passed (547)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  22 passed (22)
       Tests  375 passed (375)
```

The loading-only pair passed before and after, so the fix removes the dead stop
without changing the documented busy state.
