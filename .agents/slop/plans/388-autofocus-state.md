# 388 — focus state follows `autoFocus`

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — a public state contract that lies on a documented host prop |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `117`, `200`, `201`, `305`, `332` |
| Status | done — 11 new native cases covering 12 parts (behaviour 578), 6 mutation proofs; Tabs' plan-367 characterisation flipped to the fixed behaviour |
| Evidence | §1 — measured in the real `TestRenderer` on this host, 2026-10-18 |

This plan is self-contained. Run every command; do not claim a test passed unless
it ran.

---

## 1. Why — the bug, measured

`autoFocus` is a published host prop (`@gpuix/react`'s `Props` / `InputProps`,
the same `autoFocus` plan `140` measured). Twelve parts paint a focus ring from
their own `focused` state and expose that state to `StateStyle`. Each of them
sets `focused` **only** in React's `onFocus`.

`autoFocus` sets native focus during commit **after** React's effects, so
`onFocus` never runs. The element is natively focused and paints **no ring**, and
the public `StateStyle` reports `focused: false`. Probe, in the real renderer:

```tsx
const button = renderComponent(<Button testId="b" autoFocus />);
focusedTestId(button);                        // Some("b") — natively focused
button.renderer.findByTestId("b")?.style.boxShadow; // undefined — no ring

const accordion = renderComponent(
  <Accordion type="single" defaultValue="a">
    <AccordionItem value="a">
      <AccordionTrigger testId="t" autoFocus>A</AccordionTrigger>
      <AccordionContent>body</AccordionContent>
    </AccordionItem>
  </Accordion>,
);
focusedTestId(accordion);                     // Some("t")
accordion.renderer.findByTestId("t")?.style.boxShadow; // undefined

const list = renderComponent(
  <List selectionMode="single" defaultValue="one">
    <ListItem value="one" testId="one"><ListItemTitle>One</ListItemTitle></ListItem>
    <ListItem value="two" testId="two" autoFocus>
      <ListItemTitle>Two</ListItemTitle>
    </ListItem>
  </List>,
);
focusedTestId(list);                          // Some("two")
list.renderer.findByTestId("two")?.style.boxShadow; // undefined
```

`SearchInput` and `FieldInput` were measured the same way: the `StateStyle`
function receives `focused: false` after an `autoFocus` mount (the resolved
input style kept `width: 100` where the probe's style returns `200` when
focused).

A probe also established that React cannot observe this focus in an effect:
a layout effect **and** a passive effect both read
`renderer.getFocusedElementId() !== instance.id` immediately after the
`autoFocus` mount; the runtime applies the focus after the effects run. So a
"query the renderer" hook cannot fix it without a timer, which is the kind of
hack this repo rejects. The `autoFocus` prop itself is the knowledge: it means
"this element owns native focus on mount".

Two consequences, both public:

- the ring is missing, so a keyboard user cannot see where a `Dialog`'s first
  field or an `autoFocus`'d control is;
- `StateStyle` and every exported `<Part>State` report the wrong `focused` value
  to a consumer.

## 2. Fix

Initialise each part's `focused` state from `autoFocus`, and pass `autoFocus`
through to the host element (it must be destructured, so it can no longer ride
in `...rest`):

```ts
const [focused, setFocused] = useState(autoFocus === true && !disabled);
```

`autoFocus` only acts on mount, and this state is only initialised on mount, so
the two agree for the supported use. A disabled element is never focused; the
guard keeps the state truthful. The existing `onFocus` / `onBlur` handlers stay
unchanged for every other path.

The two roving-focus parts — `TabsTrigger` and `ListItem` — must also tell their
root, because the ring is painted from the root's active/highlight value:

```ts
useEffect(() => {
  if (autoFocus === true && !disabled) noteFocus(value);
}, [autoFocus, disabled, noteFocus, value]);
```

Both roots' `noteFocus` is a stable `useCallback` and idempotent
(`setActiveIfChanged` / `setActive(Option.some(...))`), so the effect cannot
loop. No timer, no renderer query.

## 3. Files

| Action | Path | Change |
| ------ | ---- | ------ |
| change | `packages/components/src/internal/button.tsx` | `Button` + `IconButton`: destructure `autoFocus`, init `focused`, forward it |
| change | `packages/components/src/search-input.tsx` | `SearchInput`: same |
| change | `packages/components/src/field.tsx` | `FieldInput`: same (guard with the derived `isDisabled`) |
| change | `packages/components/src/accordion.tsx` | `AccordionTrigger`: same |
| change | `packages/components/src/collapsible.tsx` | `CollapsibleTrigger`: same |
| change | `packages/components/src/tabs.tsx` | `TabsTrigger`: same + `noteFocus` effect |
| change | `packages/components/src/breadcrumb.tsx` | `BreadcrumbLink`: same (the `current` branch stays plain text) |
| change | `packages/components/src/context-menu.tsx` | `ContextMenuTrigger`: same |
| change | `packages/components/src/hotkey-recorder.tsx` | `HotkeyRecorder`: same |
| change | `packages/components/src/inline-edit.tsx` | the display branch: same |
| change | `packages/components/src/list.tsx` | `ListItem`: same + `noteFocus` effect |
| change | `packages/components/src/behaviour/{button,search-input,field,accordion,collapsible,tabs,breadcrumb,context-menu,hotkey-recorder,inline-edit,list}.test.tsx` | one `autoFocus` case each (§5); `tabs.test.tsx`'s plan-367 characterisation asserted **no** ring on the auto-focused tab and is flipped to the fixed behaviour |
| change | `packages/components/docs/{search-input,field,accordion,collapsible,tabs,breadcrumb,context-menu,hotkey-recorder,inline-edit,list}.mdx` | one sentence in the focus section and the new suite count in the verification line |
| change | `COMPONENTS.md` | the ten Tier 2 rows' native-test counts |
| change | `docs/component-api.md` | one sentence in §3: `autoFocus` establishes the initial `focused` state |
| change | `TODO.md` | add and tick the task |
| change | `.agents/slop/plans/README.md` | index this plan |

Do **not** touch `packages/primitives`, `packages/tokens`, `apps/*` or the
playground. `InlineEdit`'s field and `Tabs`' panel need no change.

## 4. Per-file detail

Every component follows the same three edits; the compiler enforces that the
prop exists and is forwarded.

1. add `autoFocus = false` to the destructured props (before `...rest`);
2. replace `useState(false)` for `focused` with
   `useState(autoFocus === true && !disabled)` — `FieldInput` uses the derived
   `isDisabled`, which is computed before the state declaration in that file;
   move the declaration below it if needed;
3. add `autoFocus={autoFocus}` after `{...rest}` on the same host element that
   carries `onFocus` (for `SearchInput`/`FieldInput` it is the `<input>`; for the
   rest the ringed `div`). In `AccordionTrigger`, `ContextMenuTrigger`,
   `TabsTrigger`, `BreadcrumbLink` and `ListItem` the element also has an
   internal `ref`; keep the existing merged ref and place `autoFocus` with the
   other explicit props.

`Button` and `IconButton` are separate functions in one file and both need the
edit. Every button-shaped trigger (`DialogTrigger`, `PopoverTrigger`,
`DropdownMenuTrigger`, `DatePickerTrigger`, `PaginationPrevious/Next`,
`AlertDismiss`, `DrawerTrigger`, `PickerTrigger`) renders through this stand-in,
so one fix covers them all.

`TabsTrigger` already imports `useEffect`? Check the import list and add it only
if absent. `ListItem` imports `useLayoutEffect` already; add `useEffect` to the
same React import.

`BreadcrumbLink` renders `<BreadcrumbPage {...rest} …/>` when `current`; do not
forward `autoFocus` there (the page is not interactive). The interactive branch
gets it.

`InlineEdit` only forwards `autoFocus` to the display branch. The editing branch
is focused programmatically when it mounts (`useLayoutEffect` calls
`focusElement`), so it needs nothing.

## 5. Tests

One case per suite, named `reflects autoFocus in its focus state`. Each renders
the smallest valid composition with `autoFocus`, then asserts **both** the
native focus and the public state:

| Suite | Composition | Assertions |
| ----- | ----------- | ---------- |
| `button.test.tsx` | `<Button testId="b" autoFocus />` and `<IconButton label="x" testId="i" autoFocus />` | `focusedTestId` is the element; `style.boxShadow` is defined. A second render with `disabled autoFocus` keeps `boxShadow` undefined |
| `search-input.test.tsx` | style callback records `state.focused` | `focusedTestId` is `search-input`; the last style call has `focused: true` |
| `field.test.tsx` | `Field` + `FieldInput autoFocus` with a style callback | `focusedTestId` is the input; last style call `focused: true`; `boxShadow` defined |
| `accordion.test.tsx` | one item, trigger `autoFocus` | `focusedTestId` is the trigger; last style call `focused: true`; `boxShadow` defined |
| `collapsible.test.tsx` | trigger `autoFocus` | same |
| `tabs.test.tsx` | two tabs, second trigger `autoFocus` | `focusedTestId` is the second trigger; its state is `focused: true`; `boxShadow` defined |
| `breadcrumb.test.tsx` | link with `current={false}` and `autoFocus` | `focusedTestId` is the link; `boxShadow` defined |
| `context-menu.test.tsx` | trigger `autoFocus` | `focusedTestId` is the trigger; `boxShadow` defined |
| `hotkey-recorder.test.tsx` | recorder `autoFocus` | `focusedTestId` is the control; `boxShadow` defined |
| `inline-edit.test.tsx` | display `autoFocus` | `focusedTestId` is the display; `boxShadow` defined |
| `list.test.tsx` | two rows, second `autoFocus` | `focusedTestId` is the second row; only that row paints the ring (`boxShadow` defined on it, undefined on the other) |

Use `hoverCentreOf`/`clickCentreOf` only where a composition needs it; these
cases need no pointer. Every case must fail on today's code for the stated
reason — the ring assertion is the one that does.

Preferred assertion shape: the state callback is the public contract, so capture
it, e.g.

```tsx
const states: Array<boolean> = [];
const root = renderComponent(
  <SearchInput
    testId="search"
    autoFocus
    style={(state) => {
      states.push(state.focused);
      return {};
    }}
  />,
);
expect(focusedTestId(root)).toEqual(Option.some("search"));
expect(states.at(-1)).toBe(true);
expect(root.renderer.findByTestId("search")?.style.width).toBeDefined();
```

The wrapper ring is asserted through `findByTestId` only where the `testId` is
on the ringed element (`FieldInput`, `Button`, triggers, list rows). For
`SearchInput` the ring is on the parent `div`; assert the state callback and the
**input's** `boxShadow` is not the contract — record the state assertion as the
proof instead of inventing a wrapper id.

## 6. Commands and expected results

```sh
cd packages/components
nub run check-types
# expect: exit 0

nub run --filter @gpuixui/components test
# expect: 38 files, 374 tests pass (inventory counts updated, still green)

nub run --filter @gpuixui/components test:behaviour
# expect: 47 files, 578 tests pass (567 + 11 new cases covering 12 parts)
```

Then at the repo root:

```sh
nub run check
nub run lint
nub run test
# expect: all exit 0
```

The inventory suite fails first if a docs verification line or a `COMPONENTS.md`
row was not updated; that failure is the check working, not a reason to relax
it.

## 7. Both-direction proof

Apply each mutation, run the named case, revert:

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | `internal/button.tsx`: `useState(false)` | the Button and IconButton cases (`boxShadow` undefined) |
| M2 | `search-input.tsx`: `useState(false)` | the SearchInput case (last `focused` is `false`) |
| M3 | `field.tsx`: `useState(false)` | the FieldInput case |
| M4 | `accordion.tsx`: `useState(false)` | the Accordion case |
| M5 | `tabs.tsx`: remove the `noteFocus` effect **and** the initial state | the Tabs case (both `focused` and the ring) |
| M6 | `list.tsx`: remove the `noteFocus` effect | the List case (the auto-focused row has no ring) |

Record every failing label in the commit message. The remaining files share the
same mechanism; M1–M3 cover the input, button and disclosure shapes, M5–M6 the
two roving roots.

## 8. STOP conditions

- A part's prop type does not accept `autoFocus`: stop and record it in
  `TODO.md` as a cross-team task instead of widening the type.
- A suite cannot observe the ring because its `testId` is not on the ringed
  element **and** the public state callback does not expose `focused`: stop and
  report the part; do not add a `testId` that the component API does not
  document.
- A case still reports `focused: false` after the fix: the runtime applied
  `autoFocus` to a different element. Record the measured id in the plan; do
  not weaken the assertion to "a ring exists somewhere".
- `nub run check-types` reports a duplicate `autoFocus` prop: the prop is still
  in `...rest`; destructure it rather than reordering spreads.

## 9. Acceptance

- [x] All twelve parts forward `autoFocus` and start with a truthful `focused`
      state; `TabsTrigger` and `ListItem` also tell their root.
- [x] Eleven new native cases (covering twelve parts) pass on this host; the
      behaviour suite is 578, and Tabs' plan-367 characterisation now asserts the
      ring.
- [x] Every mutation in §7 fails its named case.
- [x] Docs pages and `COMPONENTS.md` state the new counts; the inventory check
      passes.
- [x] `nub run check`, `nub run lint` and `nub run test` pass at the repo root.
- [x] The plan index and `TODO.md` are updated in the same commit.

## 10. Measured results

Ran 2026-10-18 on this host against the locally built `darwin-x64` 0.10.0 binding
(ADR 0003):

| Command | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/components test:behaviour` | 578 passed (47 files); `-t autoFocus` 11/11 |
| `nub run --filter @gpuixui/components test` | 374 passed (38 files) |
| `nub run check-types` (components) | pass |
| `nub run check` / `nub run lint` / `nub run test` (root) | pass |

Mutation proofs (§7), each applied, run with `-t autoFocus`, reverted:

| # | Mutation | Failing assertion |
| - | -------- | ----------------- |
| M1 | `internal/button.tsx`: `useState(false)` (both parts) | `reflects autoFocus in its focus state` — `boxShadow` undefined |
| M2 | `search-input.tsx`: `useState(false)` | the same case — last `focused` is `false` |
| M3 | `field.tsx`: `useState(false)` | the same case |
| M4 | `accordion.tsx`: `useState(false)` | the same case |
| M5 | `tabs.tsx`: `useState(false)` | the same case |
| M6 | `list.tsx`: the `noteFocus` effect made a no-op | `reflects autoFocus in the roving focus state` — the auto-focused row has no ring |

The full suite exposed one expected behaviour change: Tabs' plan-367 case
asserted the old miss (`boxShadow` undefined on the auto-focused tab); it now
asserts the ring, with the reason recorded on the line.
