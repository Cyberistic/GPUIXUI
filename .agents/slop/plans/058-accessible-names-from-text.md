# 058 — Text buttons and toggles have no accessible name

- **Phase:** C/F (Tier 1 truth pass). **Owner:** primitives workstream.
- **Depends on:** `030`, `040`, `041`, `047`, `057`.
- **Status:** done — implemented and measured. Evidence in §8.
  `COMPONENTS.md` keeps the rows at `wip` (the docs-site page and the
  published-binary confirmation are the remaining bar, as for every Tier 1 row).

## 0. The bug, with evidence

`Button` and `Toggle` render their `children` as a bare React text node inside a
`div` with `role="button"`. The runtime does **not** turn that text into an
accessibility node, and AccessKit does not derive a button's name from it.
Measured on this host (`@gpuix/native@0.10.0`, ADR 0003) with:

```tsx
<Button testId="b">Save changes</Button>
<Text role="h2">A headline</Text>
<Text role="body">Some body copy</Text>
```

the dump is:

```json
[
  {"aria":{"role":"Button","on_action":["Click","Focus"]}},
  {"aria":{"role":"Label","value":"A headline"}},
  {"aria":{"role":"Label","value":"Some body copy"}}
]
```

Two facts fall out of it:

- `<text>` elements **are** exposed automatically (`Label` + value), so `Text`
  needs no change — and this is why `Label`/`RadioGroup`/`ToggleGroup` names
  work;
- the **button has no `label` at all**. A screen reader announces "button" and
  nothing else for every text-button in the library unless the caller happens to
  pass `label`. The `ButtonProps.label` doc says "Required when the button has
  only an icon", which wrongly implies text buttons are named by their text.
  `Toggle` has the same shape and the same gap.

## 1. What changes

| Piece | Today | After |
| ----- | ----- | ----- |
| `Button` | `aria-label={label}` | `aria-label={label ?? textOf(children)}` |
| `Toggle` | `aria-label={label}` | `aria-label={label ?? textOf(children)}` |
| Non-text children | unnamed | still unnamed (we do not invent a name from an icon) |
| Explicit `label` | wins | still wins |

`textOf(children)` is a small pure helper in `components/internal.ts`: it
returns the joined string when **every** child is a string or number and the
result is non-blank, and `Option.none()` otherwise. A button whose content is an
icon, another element, or a mix therefore stays unnamed until the caller passes
`label` — which is exactly the honest rule the docs already intend.

`ToggleGroup` is unaffected: its items already carry `aria-label` from
`option.label`. `Checkbox`/`Switch`/`Input`/`Slider` take a `label` prop and
have no text children; the visible `Label` beside them is a separate
`Label` node, and the association limitation stays documented.

## 2. Files

```
A .agents/slop/plans/058-accessible-names-from-text.md
M .agents/slop/plans/README.md
M packages/primitives/src/components/internal.ts
M packages/primitives/src/components/Button.tsx
M packages/primitives/src/components/Toggle.tsx
M packages/primitives/src/components/Button.test.tsx
M packages/primitives/src/components/Toggle.test.tsx
M packages/primitives/runtime/controls.runtime.test.tsx
M packages/primitives/docs/button.mdx
M packages/primitives/docs/toggle.mdx
M COMPONENTS.md
M TODO.md
```

## 3. Implementation sketch

```ts
// components/internal.ts
/** The name a text-only child list gives a control, or nothing. */
export const textOf = (children: ReactNode): Option.Option<string> => {
  const parts = Children.toArray(children);
  const texts = Arr.filterMap(parts, (part) =>
    P.isString(part) || P.isNumber(part) ? Option.some(`${part}`) : Option.none(),
  );
  if (texts.length !== parts.length) return Option.none();
  return pipe(Arr.join(texts, ""), Str.trim, (name) =>
    Str.isEmpty(name) ? Option.none() : Option.some(name),
  );
};
```

```tsx
// Button.tsx and Toggle.tsx
aria-label={props.label ?? Option.getOrUndefined(textOf(props.children))}
```

The helper lives with the other component-boundary utilities (`mergeStyle`,
`useStep`) because it adapts React's `ReactNode`, not a domain value.

## 4. Test plan

### Element tree

`Button.test.tsx` and `Toggle.test.tsx`:

1. text children become the `aria-label` (`"Save changes"`);
2. an explicit `label` overrides the text;
3. children that are not all text (an element child) produce **no**
   `aria-label` — no invented name;
4. whitespace-only children produce no name;
5. a number child (`{3}`) is named `"3"`.

### Runtime (`controls.runtime.test.tsx`)

1. Mount `<Button testId="save">Save changes</Button>`; the accessibility tree
   has a `Button` node named `Save changes` (fails today: no label).
2. Mount `<Toggle testId="bold">Bold</Toggle>`; the node is named `Bold`.
3. Mount `<Button label="Close">×</Button>`; the explicit label wins.
4. Mount a button whose child is an element (`<div style={...} />`); it has no
   name — the test asserts the refusal so a future "guess the name" change is
   deliberate.

### Two-direction proof

Revert `aria-label` to `props.label` only and re-run the runtime suite: tests 1
and 2 must fail with `no accessibility node for Button "Save changes"` /
`... "Bold"`. Restore; both pass.

## 5. Commands, expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/primitives test` | all offline suites pass |
| 2 | `nub run --filter @gpuixui/primitives test:runtime` | all runtime suites pass (14 files; 130 before + new assertions) |
| 3 | `nub run check` | `check:tests`, lint, format and every `tsc` pass |
| 4 | `nub run lint` | exit `0` |
| 5 | `nub run test` | every workspace suite passes |

## 6. STOP conditions

Stop and report with evidence if:

- AccessKit reports a button's name from a child `Label` node on any path (then
  the bug is different and this plan is void — record the dump);
- joining string/number children changes the painted text (it must not — the
  helper only reads, the render path is unchanged);
- an explicit `label` no longer wins on either component;
- the runtime test cannot be made to fail before the fix.

## 7. Acceptance

- Every text-only `Button` and `Toggle` carries an accessible name in the real
  renderer; explicit labels win; non-text content stays unnamed and documented.
- Element-tree and runtime tests pin all four rules; two-direction proof
  recorded in §8.
- `docs/button.mdx` and `docs/toggle.mdx` state the naming rule, and the
  `label` prop description says when it is required.
- `COMPONENTS.md` Button and Toggle rows record the measured name contract.
- `TODO.md` ticked; gates green.

## 8. Measured evidence (2026-10-17, this host)

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **27 files / 302 tests pass** (+2 element-tree tests) |
| `nub run --filter @gpuixui/primitives test:runtime` | **14 files / 133 tests pass** (+3 runtime tests; 130 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run check` | `check:tests`, lint, format and every `tsc` pass |
| `nub run lint` | exit `0` |
| `nub run test` | every workspace suite passes |

Measured after the fix: `<Button>Save changes</Button>` produces a `Button`
node labelled `Save changes`; `<Toggle>Bold</Toggle>` produces a `Button` node
labelled `Bold`; an icon-only button produces a `Button` node with **no**
label; an explicit `label` wins over the text.

**Two-direction proof, observed:** reverting both components to
`aria-label={props.label}` made exactly two runtime tests fail with
`expected false to be true` — the text-content name test and the toggle name
test; the icon-only test kept passing (it already expected no name). Restored:
133/133.

**One test-writing trap measured:** the shared `renderButton` helper writes
`{...props}` *before* its JSX children, so passing `children` in `props` is
overridden by the literal `Save`. The icon-only test therefore mounts its own
tree; a future reader should not assume `renderButton({ children })` changes the
content.
