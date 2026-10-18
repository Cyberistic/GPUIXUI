# 517 — The controlled-state hook reports a no-op change in uncontrolled mode

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening, controlled-state contract) |
| Owner | components workstream |
| Depends on | `110`, `113`, `117`, `200`, `201` |
| Status | done — the hook compares the resolved value; 3 hook cases + 1 Tabs case (behaviour 672), both-direction proof (the same-value hook case and the Tabs case fail on the old comparison) |
| Number | `517` — `516` is the last claimed number in this block |

This plan is self-contained. Facts marked **measured** were reproduced on this
host (Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. The defect (measured 2026-10-18, this host)

`packages/components/src/internal/controllable.ts` compares a requested value
against the **prop**, not against the resolved current value:

```ts
const controlled = value !== undefined;
const setValue = useCallback((next) => {
  if (!controlled) setInternal(next);
  if (value !== next) onChange?.(next); // `value` is undefined when uncontrolled
}, [controlled, value, onChange]);
```

In uncontrolled mode `value` is always `undefined`, so `value !== next` is true
for every request — including a request for the value the component already
holds. The change callback therefore fires with no change.

Measured with a throwaway behaviour probe (deleted before this plan landed): an
uncontrolled `Tabs` mounted with `defaultValue="profile"` and a
`vi.fn()` `onValueChange`, pressing the already-selected `Profile` tab, produced

```
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
Received: [ "profile" ]
```

The controlled path is correct: the same press on
`<Tabs value="profile" onValueChange={…}>` reports nothing, which the existing
suite does not assert for `Tabs` but does for Pagination (`plan 513`: "does
nothing when the current page is pressed").

This contradicts the package's own contract in `docs/component-api.md` §2 (a
change callback reports a change) and GPUix's published `useControllableState`
(`dist/components/floating.js`), which compares the resolved value with
`Object.is`.

Blast radius: every component that calls `setValue` with the current value in
uncontrolled mode. `Tabs` is the reproducible case. Components that guard a
no-op before calling the hook (`List` with `sameValues`, Pagination's
`isCurrent`, InlineEdit's unchanged draft, TagInput's duplicate rule) are not
affected.

## 2. The rule

> A controlled-state setter reports a change **only when the requested value
> differs from the value the component currently holds**. A request for the
> current value updates nothing and calls no callback — in controlled and
> uncontrolled mode alike.

## 3. Design

### 3.1 One fix, in the hook

`packages/components/src/internal/controllable.ts`:

```ts
const [internal, setInternal] = useState(defaultValue);
const controlled = value !== undefined;
const current = controlled ? value : internal;

const setValue = useCallback(
  (next: Value) => {
    if (!controlled) setInternal(next);
    if (!Object.is(current, next)) onChange?.(next);
  },
  [controlled, current, onChange],
);

return [current, setValue];
```

This mirrors the published GPUix implementation. `Object.is` (not `!==`)
keeps `NaN` a no-op and distinguishes `-0`, which is the React convention for
state identity. The returned setter's identity changes when the value changes;
that is already true in controlled mode and is what makes the comparison
correct in uncontrolled mode.

Do **not** move `onChange` into the `setInternal` updater: a side effect in a
state updater can run twice under React's strict checks and would report changes
React later discards.

### 3.2 No component edits

No call site changes. The hook is the single place the rule lives
(`docs/component-api.md` §2) and every component already uses it.

## 4. Test plan

### 4.1 New root-cause suite: `src/behaviour/controllable.test.tsx`

A behaviour suite, because the hook needs a React render. Three cases; state
rendered as text so the assertions read the resolved value, not a variable the
test set:

1. **uncontrolled, same value** — mount with `defaultValue="a"`; call
   `set("a")`; expect `onChange` not called and the readout still `a`. This is
   the regression: it fails on the old hook.
2. **uncontrolled, different value** — call `set("b")`; expect exactly
   `[["b"]]` and the readout `b`. This proves the fix does not suppress real
   changes.
3. **controlled** — mount with `value="a"`; call `set("a")` (no callback), then
   `set("b")` (one callback), and the readout stays `a` until the harness
   rerenders with `value="b"`. This pins the classic controlled contract and
   ensures the new comparison did not make the hook uncontrolled.

The harness is `renderComponent` + a button with `testId="set-a"` /
`testId="set-b"` and `clickCentreOf`, so the setter runs inside a real event
like every other suite.

### 4.2 Component-level guard: one case in `tabs.test.tsx`

Add to the existing suite:

```ts
it("does not report a press on the already selected uncontrolled tab", ...)
```

Mount `<Settings onValueChange={onValueChange} />` — the suite's fixture is
already uncontrolled (`defaultValue="profile"`), so no fixture change is needed.
Press `tab-profile`, expect no call; then press `tab-danger`, expect
`["danger"]` (so the case can fail in both directions). `tab-billing` is
disabled in the fixture and is not part of this case.

### 4.3 Mutation proof (the required both-direction proof)

- Revert `controllable.ts` to the old comparison → 4.1 case 1 and 4.2's
  same-value assertion fail; the other cases pass.
- Leave the fix in place and delete the `Object.is` guard (always call
  `onChange`) → the same cases fail again.
- `scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1), so
  record this manual proof in the plan and the commit message.

**Measured result (2026-10-18):** with the old comparison restored, exactly two
cases failed — `useControllableState > does not report a request for the value an
uncontrolled control already holds` and `Tabs > does not report a press on the
already selected uncontrolled tab` — and both pass with the fix. No other case
changed its expectation.

## 5. Commands and expected results

```sh
cd packages/components
nub run test:behaviour src/behaviour/controllable.test.tsx   # 3 passed
nub run test:behaviour src/behaviour/tabs.test.tsx           # 23 passed (22 + 1)
```

Then, from the worktree root:

```sh
nub run --filter @gpuixui/components test            # 404+ unit tests pass
nub run --filter @gpuixui/components test:behaviour  # 669+ native tests pass
nub run check                                        # exit 0
nub run lint                                         # exit 0
nub run test                                         # exit 0
```

Expected: the hook suite and the Tabs case pass; no other suite changes its
expectations, because none asserted a duplicate callback.

## 6. Docs and records

- `docs/component-api.md` §2: state the rule explicitly — a setter reports only
  a real change; a request for the current value is a no-op in both modes.
  Correct the same paragraph's false absolute that `onValueChange` "is the only
  change callback name": the same rule covers the state-specific callbacks
  (`onOpenChange`, `onQueryChange`, `onPageChange`, `onStepChange`,
  `onRecentChange`, `onPinnedChange`, `onStatusChange`, `onCheckedChange`,
  `onEditingChange`).
- `packages/components/docs/tabs.mdx`: mention that pressing the current tab
  reports nothing; refresh the stated native-test count to 23.
- `COMPONENTS.md`: Tabs row gains the no-op clause and the count 23.
- `TODO.md`: add and tick the Tier 2 hardening item.
- `.agents/slop/plans/README.md`: index this plan.

## 7. STOP conditions

- If any existing behaviour case starts failing because it expected a duplicate
  callback, stop and report the case: that is a contract question, not a
  silent test rewrite.
- If the controlled case in 4.1 cannot stay on the caller's value after
  `set("b")`, stop: the fix must not make the hook control itself.
- If `Object.is` suppresses a callback for a value the caller considers a
  change (a new array/object with equal content is still a change), stop and
  report the case.
- If a component's own identity guard makes the hook-level change invisible,
  keep the hook fix anyway; do not delete local guards.

## 8. Acceptance criteria

- The hook compares the resolved current value, not the prop.
- The new suite's same-value case fails on the old hook and passes on the fix;
  the different-value and controlled cases pass in both directions.
- The Tabs component case fails on the old hook and passes on the fix.
- Docs, `COMPONENTS.md`, `TODO.md` and the plan index are in sync.
- The gates above are green.
