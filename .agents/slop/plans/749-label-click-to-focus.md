# 749 — `Label` can move focus to its control

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — removes a false Tier 1 limitation |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Label row in `COMPONENTS.md`) |
| Depends on | `030` (package), `041` (runtime suite), `045` (`labelledBy`), `047` (docs/examples), `059` (text semantics), `087` (the inert-label truth), `368`/`383` (label containment), `581` (required marker), `597` (paint bounds) |
| Status | **done** — `control` takes the field's ref; a press on the name, marker or description calls `renderer.focusElement(instance.id)`, pointer-only, with no `aria-labelledby` claim and a null ref a no-op. 9 element + 5 scoped runtime cases; both runtime press cases fail with focus left on the sentinel when the wiring is removed, and the offline "absent without a control" case fails when the activation is unconditional. The form example pairs all four labels; offline 71 files / 975 tests, runtime 69 files / 891 tests, examples 19/19 |

## 0. Why

`docs/label.mdx` §Limitations has said since plan `030`:

> No click-to-focus: the runtime has no `for`/`htmlFor`, and the label cannot move
> focus to another element.

The first half is true — there is no `htmlFor` and no `aria-labelledby`
(plans `020`, `045`, `087`) — but the second half is **false**. The renderer
publishes `focusElement(elementId: number)`, and the package already uses it to
move native focus (the radio group's roving ring, `Rating`'s clear, `OTPField`'s
caret, `Select`'s keyboard scroll). A label *can* move focus; it is the one
behaviour a native label has.

Measured on this host (2026-10-20, release-tag `0.10.0` binding, 1280 × 800)
with a probe that mounted a plain clickable `div` over a `<text>Email</text>`
and an `<Input testId="email" ref={fieldRef} />`:

| Probe | Result |
| ----- | ------ |
| click the name text | the text's **and** the root's `onClick` run — clicks bubble |
| `focusElement(fieldRef.current.id)` | `getFocusedElementId()` reports the field; `runtime.focused()` is `"email"` |
| click a transparent root that paints nothing | **no handler runs** — the hit-test needs painted content, so the name/description/marker is the real target |
| `getElementBounds("email")` | **throws** (`String` into `f64`): the renderer's lookups take the numeric instance id, not a `testId` |

The last row decides the API: a `testId: string` prop would need a
testId→id registry the app renderer does not have. A **ref** already carries the
instance (every `TriggerHandlers` control exposes `ref`, and `Instance.id` is
public), so `control` takes the ref.

Cost today: every form writes `<Label>…</Label>` beside an `<Input label="…" />`;
a pointer user who clicks the visible name gets **nothing**, while the same user
would focus the field on any desktop toolkit. This is the remaining half of
plan `087`'s finding (a label is not *associated*); it does not claim the
association, it restores the platform's pointer behaviour.

## 1. The contract

1. **One new optional prop:** `Label.control?: RefObject<PublicInstance | null>`
   — the ref of the control the label names. `PublicInstance` is
   `@gpuix/react`'s published instance type (already imported by `Select`).
2. With `control`, a **primary click anywhere on the painted label** — the name,
   the required marker, the description — moves **native focus** to the
   instance's `id` through `renderer.focusElement`. A click on the empty part of
   a full-width label does nothing (measured: an unpainted transparent box is
   not hit-tested; the text is the target).
3. Without `control` the element tree is **unchanged**: no handler, no style
   change. A label is not a control and invents no role and no tab stop.
4. The label is **pointer-only**, exactly like a native label: it is not
   focusable, takes no `tabIndex`, and adds no keyboard path. Keyboard users Tab
   to the control.
5. The click reports **focus only** — no activation, no value change.
6. **No association is claimed.** GPUix 0.10.0 has no `htmlFor`/
   `aria-labelledby`, so the control still carries its own `label`:
   `labelledBy(name)` stays the name channel. `<Label control={ref}>Email</Label>`
   plus `<Input ref={ref} label="Email" />` is the honest pair.
7. A `control` whose `.current` is `null` (not mounted yet, or unmounted) is a
   **silent no-op** — no throw and no render. A click never invents a target.
8. A **disabled** target receives focus if it is pointed at (the renderer has no
   "focusable" query and the ref carries no state). Its own handlers are guarded
   (plan `025`), it paints no ring (plan `332`), and the page says so: point
   `control` at a control that can take focus.
9. `control` targets a **single-root** control. The roving composites
   (`RadioGroup`, `CheckboxGroup`, `ToggleGroup`, `Rating`, `Slider`,
   `RangeSlider`, `OTPField`) focus their items, not their group root, so a click
   on the label would focus a non-focusable box; the page lists the supported
   targets (`Input`, `TextArea`, `NumberField`, `Select`, `Checkbox`, `Switch`,
   `Button`, `Toggle`) and states the limit.
10. The caller's `style` still merges last; a caller `cursor` wins over the
    pointer cursor.
11. **Styling answer:** a clickable label paints `cursor: "pointer"` and nothing
    else. A surface wash would turn a text label into a row, and the
    pointer-feedback matrix (plan `361`) governs **controls** — elements with a
    role, a tab stop and a handler. The page records the distinction; a one-line
    test pins that no background appears.

## 2. Files to change

### 2.1 `packages/primitives/src/components/Label.tsx`

- Import `useGpuix` and `type PublicInstance` from `@gpuix/react`,
  `type RefObject` from `react`, `stackStyle` from `../core/layout.js`, and
  `useTheme` from `./ThemeProvider.js`.
- `LabelProps` gains:

  ```ts
  /**
   * The control this label names, by ref. A press on the visible label moves
   * native focus to that control — a native label's one behaviour. GPUix has no
   * `htmlFor`/`aria-labelledby`, so the control still carries its own `label`;
   * this restores the pointer path, not the association. A null ref is a
   * no-op, and the label stays pointer-only (never a tab stop). Point it at a
   * single-root focusable control (`Input`, `TextArea`, `NumberField`,
   * `Select`, `Checkbox`, `Switch`, `Button`, `Toggle`); a roving group's ref
   * is its non-focusable root.
   */
  readonly control?: RefObject<PublicInstance | null>;
  ```

- `renderLabel(props, theme, onActivate?)`: replace the two `Stack`s with raw
  `div`s whose style comes from the shared `stackStyle` resolver, so the theme
  still owns spacing and nothing is copied:

  ```tsx
  const root = resolvePartStyle(
    {
      ...stackStyle({ direction: "column", gap: "2xs" }, theme),
      width: "100%",
      ...(onActivate === undefined ? {} : { cursor: "pointer" }),
    },
    style,
    { invalid: invalid === true },
  );
  const row = stackStyle(
    { direction: "row", gap: "2xs", align: "baseline" },
    theme,
  );
  ```

  Root: `<div testId={testId} onClick={onActivate} style={root}>`. Inner row:
  `<div style={row}>` with the name `Text` and the optional marker. The
  description stays a sibling `Text`. Keep every existing prop's output
  identical (tone, marker, gaps, `width: 100%`, blank-description rule).
- `Label` resolves the theme and the renderer and derives one callback:

  ```tsx
  const { renderer } = useGpuix();
  return renderLabel(props, theme, activate);
  ```

  where `activate` is `undefined` when `control === undefined`, else
  `() => { const instance = control.current; if (instance !== null) renderer?.focusElement?.(instance.id); }`.
  Convert the nullable ref only at this boundary (`Option.fromNullishOr`) if
  the linter asks; React refs are a nullish boundary.
- Docstrings: the module header and `Label` summary gain one sentence — a
  `control` ref makes a press focus that control, and the name channel is
  unchanged.

### 2.2 `packages/primitives/src/components/Label.test.tsx` (new)

Element-tree cases (pure, no runtime):

1. `control` present → the root has an `onClick`; absent → **no** `onClick`
   property (not `undefined`).
2. `control` present → `cursor: "pointer"`; absent → no `cursor` property.
3. A clickable label paints **no** `backgroundColor` and no `hover`/`active`.
4. The caller's `style` merges last and can override `cursor`.
5. The root is still not a tab stop (no `tabIndex`) and carries no role.
6. The name/description/required tree is byte-identical with and without
   `control` except the root's two additions (compare decoded props on the
   child subtree).
7. `invalid` and `required` still resolve (existing cases keep passing).

Use the existing harness helpers (`elementProp`, `elementChildren`,
`expectSome`, `testTheme`) from `presentational.test.tsx`; export them if they
are private, or keep the new file to the same handful of local helpers.

### 2.3 `packages/primitives/runtime/label-control.runtime.test.tsx` (new)

Header comment: the bug guarded is the documented "cannot move focus" — a real
press on the visible label must focus the field, and a label without `control`
must not.

1. `"a press on the label focuses its control"` — mount
   `<Label testId="label" control={ref}>Email</Label>` and
   `<Input testId="email" label="Email" ref={ref} />` in a `Surface`; click the
   painted name's `text` element (found through `runtime.element("label")` →
   first child → first child, or `runtime.all()` with `type === "text"`), then
   `expect(runtime.focused())` to be `Some("email")`. Start focus on a sentinel
   `Button` so the assertion cannot pass by default.
2. `"the description is a target too"` — same shape with
   `description="Shown on invitations"`; click the description's text; focus
   moves.
3. `"without control nothing moves"` — the same label with no `control`, a
   sentinel keeps focus after a press.
4. `"a null ref is a no-op"` — `control` points at an empty
   `useRef<PublicInstance | null>(null)` and no field carries it; the press runs
   without throwing and focus stays on the sentinel.
5. `"the label is not a tab stop"` — from a sentinel, `focusNext()` lands on the
   input, not the label (the label never appears in `focused()`).
6. `"a caller's cursor wins"` — `style={{ cursor: "default" }}` on a clickable
   label paints `default` (element tree covers the value; this case may live in
   `Label.test.tsx` instead if no runtime paint adds information).

Use `awaitFrame` for the focus assertion if the click dispatch settles on the
next frame (plan `691`'s rule: wait for the paint, never a fixed sleep).

### 2.4 `packages/primitives/docs/label.mdx`

- Replace the false limitation with the real contract:
  - **Click-to-focus** — `control` takes the field's ref and a press on the
    label focuses it; no association is implied.
  - The pointer-only rule and the "empty area of a full-width label is not a
    target" rule (the text is).
  - The single-root targets and the roving-composite limit.
  - A disabled target receives focus; point it at a focusable control.
- API table: add `control` (`RefObject<PublicInstance | null>`, default none).
- Usage: show the ref pair next to the existing `labelledBy` snippet.
- Keyboard: still not focusable; the label adds no key path.
- Accessibility: re-state that the visible label and the control's name remain
  **two nodes** (no `aria-labelledby`); `control` does not change that.
- Verification: name the new element and runtime files.
- Theming: a clickable label's only style answer is `cursor: "pointer"`; no
  wash (a label is text, not a row).

### 2.5 `packages/primitives/examples/form.example.tsx`

Use the new pair in the form screen: a `useRef<PublicInstance | null>(null)` for
the first field, `<Label control={nameRef}>…</Label>` and
`<Input ref={nameRef} … />`. The example is already mounted by
`runtime/examples.runtime.test.tsx`, so this proves the composition in both
palettes. Do not change the screen's behaviour otherwise.

### 2.6 Existing tests that call `renderLabel`

The pure renderer's new `theme` argument means these call sites change (pass
`testTheme`):

- `src/components/presentational.test.tsx` — four calls; the "own contribution"
  assertion becomes `flexDirection: "column"` (the old case read the `Stack`
  component's `direction` prop).
- `src/components/state-style.test.tsx` — one call.
- `src/components/style-order.test.tsx` — one call.

No assertion semantics change; only the resolver's input.

### 2.7 `COMPONENTS.md`

Label row: add **Click-to-focus (749):** `control` takes the field's ref; a press
on the visible name, marker or description calls `renderer.focusElement` on that
instance. The label stays pointer-only, paints a cursor and no wash, and claims
no association (the control's own `label` is still the name). Measured: a
transparent, unpainted root is not hit-tested, so the text is the target; a null
ref is a no-op.

The row's existing "No click-to-focus" phrase is not in `COMPONENTS.md` (it is
only in the page) — check before editing.

### 2.8 `TODO.md` and `.agents/slop/plans/README.md`

- Add a ticked primitives row for plan `749`.
- Add plan `749` to the primitives table with the measured result.

## 3. Commands and expected results

```sh
# 1. the pure element tree, first with the click handler removed to record the
#    failing direction.
nub run --filter @gpuixui/primitives test src/components/Label.test.tsx
# expect before: case 1 fails (no onClick without the wiring); after: 7/7.

# 2. the scoped runtime file, first without the onClick pass-through.
nub run --filter @gpuixui/primitives test:runtime runtime/label-control.runtime.test.tsx
# expect before: case 1/2 fail with focus still on the sentinel; after: 1 file /
# 5-6 tests pass.

# 3. the suites the renderer signature touches.
nub run --filter @gpuixui/primitives test src/components/presentational.test.tsx src/components/state-style.test.tsx src/components/style-order.test.tsx
# expect: green, with only the `flexDirection` assertion changed.

# 4. the example mount.
nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
# expect: every registered example still mounts in both palettes.

# 5. the package gates (inside this workstream).
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
nub run check:tests
nub run lint
```

`nub run check` currently stops on `apps/docs/src/components/docs/demos.tsx`
formatting (a docs-site path, already recorded in `TODO.md`); run the package
gates and `check:tests`/`lint` separately and say so.

## 4. Test plan — both directions

The defect being fixed is a **documented limitation that is not true**: the page
says the label cannot move focus while the renderer publishes exactly that API.

1. **Offline, old direction.** With `onClick` not passed to the root, case 1
   fails by name ("the root carries a press handler"), cases 2–3 fail on the
   cursor, and the runtime cases fail because the sentinel still holds focus.
2. **Offline, over-broad direction.** Attaching the handler when `control` is
   absent fails case 1's negative half; painting `hover`/`active` fails case 3.
3. **Runtime, old direction.** `runtime.focused()` stays `Some("sentinel")` for
   a real press on the name.
4. **Runtime, after.** A press on the name and on the description each move
   native focus to the field; the no-control and null-ref cases leave focus
   alone; the tab order is unchanged.
5. **Regression.** The field, label-required, layout, style-order, state-style
   and examples suites stay green; the Label's name/description/marker tree is
   unchanged apart from the root's handler and cursor.

## 5. STOP conditions

Stop and report rather than improvise if:

- a press on the label's text does **not** reach the root after the
  `Stack`→`div` change (the probe measured that it does; if a later runtime
  disagrees, the interaction is not expressible and the limitation must stay);
- `focusElement` cannot focus an `<input>` in the scoped file (the probe says it
  can; a failure means the contract is wrong, not the test);
- the label's accessibility tree changes (a nameless node appearing, the name
  losing its `Label` role) — the interaction must not add semantics;
- `renderLabel`'s theme argument forces a caller to read a provider outside
  `ThemeProvider` (the package's existing contract is that a missing theme is a
  type error, not a runtime fallback);
- a roving composite's ref turns out to be focusable after all (then the target
  list widens and the page changes, not the code).

## 6. Acceptance

- `Label.control` moves native focus on a real press, for the name, the marker
  and the description.
- No `control` → the tree and behaviour are byte-identical to today; a null ref
  is a silent no-op.
- The label is still not a tab stop, invents no role, and claims no
  `aria-labelledby` association; the control's own `label` remains the name.
- The new element and runtime cases fail against the old direction and pass
  after; the touched suites and the examples mount stay green.
- `docs/label.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index tell the truth
  about what is and is not associated.
- `nub run --filter @gpuixui/primitives test`, the scoped runtime files,
  `check-types`, `check:tests` and `lint` pass.
