# 640 — a selection mark must scale with its box

**Phase:** F (Tier 1 consistency / measured geometry)
**Owner:** primitives workstream (`packages/primitives`)
**Depends on:** 028 (skeleton circle), 053 (value controls), 078 (group shape),
329 (switch motion), 372 (field recipe — the surrounding size work)

## 0. The defect

`Checkbox` and `CheckboxGroup` paint their tick from one fixed step:

```tsx
// packages/primitives/src/components/Checkbox.tsx
<Icon name={markName(current)} size={theme.iconSize.sm} … />
// packages/primitives/src/components/CheckboxGroup.tsx
<Icon name={state === "indeterminate" ? "minus" : "check"} size={theme.iconSize.sm} … />
```

`theme.iconSize.sm` is **14 px at every control size**, while the box itself is
`theme.iconSize[size]` (14 / 16 / 20). Measured on this host (2026-10-19, the
store's release-tag build) by mounting `<Checkbox defaultChecked size={…} />` in
the real `TestRenderer` and reading the painted boxes:

| `size` | box (painted border box) | mark (`<svg>` viewport) |
| ------ | ------------------------ | ----------------------- |
| `sm`   | `14 × 14`                | `14 × 14`               |
| `md`   | `16 × 16`                | `14 × 14`               |
| `lg`   | `20 × 20`                | `14 × 14`               |

So `size` moves the box and not the tick:

- `sm`: the 14 px mark viewport is larger than the box's **content square**
  (12 px after the 1 px border), so it paints across the border band;
- `lg`: a 20 px box carries the same 14 px mark as `md`, so the control looks
  emptier the larger it gets;
- `md` is the accidental coincidence: 14 is both `iconSize.sm` and the content
  square of the 16 px box, which is why the defect was invisible at the default
  size.

The two other marks in the family already scale: `radioDotStyle` is
`iconSize[size] / 2` and `switchThumbSide` derives from `iconSize[size]`. The
check tick is the only one pinned to a single step, and it is copied in two
places — the duplication that lets a third caller drift (the same class plans
`099` and `355` removed elsewhere).

## 1. Files to change

### 1.1 `packages/primitives/src/core/selection.ts`

Add one exported rule beside `selectionBoxStyle`/`radioDotStyle`:

```ts
/**
 * The side of the mark a box paints inside its border.
 *
 * The box's **content square**: the icon size for the control size less the
 * thin border on both sides. A tick is drawn in the space the border leaves, so
 * it scales with `size` instead of being pinned to one step (measured, plan
 * `640`: the 14 px tick stayed 14 in a 20 px `lg` box and overhung `sm`'s
 * 12 px content square). `md` is unchanged at 14.
 */
export const selectionMarkSize = (
  size: ControlSize,
  theme: PrimitiveTheme,
): number => theme.iconSize[size] - 2 * theme.borderWidth.thin;
```

It uses the same `SelectionSpec["size"]` type the box does.

### 1.2 `packages/primitives/src/core/index.ts`

Export `selectionMarkSize` with the other `./selection.js` values. Check the
file's existing export idiom (it re-exports named values) and keep it sorted the
way that file already is.

### 1.3 `packages/primitives/src/components/Checkbox.tsx`

Replace `size={theme.iconSize.sm}` with `size={selectionMarkSize(spec.size, theme)}`.
`spec` is already in scope with `size: props.size ?? "md"`; pass the resolved
spec, not `props.size`, so the default and the box agree.

### 1.4 `packages/primitives/src/components/CheckboxGroup.tsx`

The row renderer resolves `size` from the group props; replace
`theme.iconSize.sm` with `selectionMarkSize(size, theme)` in the row's mark.
This is the second copy of the number, so the test in §3 must cover the row,
not only the standalone box.

### 1.5 `packages/primitives/docs/checkbox.mdx` and `checkbox-group.mdx`

The `size` rows say "box side from `iconSize`". Add the mark: **the tick is the
box's content square, so it scales with the box** (`sm`/`md`/`lg` =
12/14/18 px). In each Theming section, name the rule once and point at
`selectionMarkSize`. Do not invent a prop or a percentage.

### 1.6 `COMPONENTS.md`

In the **Checkboxes** and **Checkbox Group** rows, add the measured
before/after (mark `14 × 14` at every size → 12/14/18; `md` unchanged) and cite
plan `640`.

### 1.7 Package README runtime file count

A new runtime file (§2 below) changes `runtime/**/*.runtime.test.tsx` from 57
to 58. `src/docs-counts.test.ts` fails until
`packages/primitives/README.md` says **58 test files**. Change only that number.

## 2. Test plan — what is written, and why each test can fail

Three layers, because the defect has three observable forms.

### 2.1 `src/core/selection.test.ts` — the rule

Add a `describe("selectionMarkSize")`:

- `sm`/`md`/`lg` resolve to `[12, 14, 18]` on the test fixture;
- each value is the box's content square (`iconSize[size] - 2 × borderWidth.thin`),
  asserted from the theme rather than from the literal;
- `md` is `14` (the shipped default look does not move);
- the values strictly increase.

**Fails without the fix because** the helper does not exist (compile), and the
old expression (`theme.iconSize.sm`) is size-independent.

### 2.2 `src/components/selection.test.tsx` — the element tree

Add cases in the existing `Checkbox` and `CheckboxGroup` describes:

- a checked `Checkbox` at `sm`/`md`/`lg` passes the rule's number to `Icon.size`
  (read the `<svg>`'s component prop, `elementProp(icon, "size")`);
- an indeterminate `Checkbox` (the `minus` mark) uses the same number;
- a checked `CheckboxGroup` row at `sm`/`lg` uses the number, reached through
  `row → box div → Icon`, so the second copy is covered.

**Fails without the fix because** the prop is 14 at every size; the `sm`/`lg`
cases expect 12/18.

### 2.3 `runtime/selection-mark.runtime.test.tsx` (new) — the paint

Header comment states the bug above. Cases, one fresh window each:

1. `Checkbox` at `sm`/`md`/`lg` checked: find the box host by `testId`, find its
   `<svg>` child through `runtime.all()` (`parentId === host.id`), and assert
   its painted side equals `selectionMarkSize` and is **inside** the box's
   painted border box (the containment statement the old `sm` mark broke).
2. The same for the indeterminate mark (`minus`), because the name branch and
   the size branch are separate expressions.
3. `CheckboxGroup` row at `sm` and `lg`: the row's box child's `<svg>` paints the
   rule's side.

**Fails without the fix because** the painted mark is 14 at `sm` (expected 12)
and 14 at `lg` (expected 18) — measured in §0.

### 2.4 Both directions

1. Write the tests **before** the fix and run them; record the exact failures
   (expected/actual) in the plan's Result section.
2. Apply the fix; re-run the same files green.
3. `nub run --filter @gpuixui/primitives test` (offline) and the scoped runtime
   file, then the full `nub run check` / `nub run lint` / `nub run test`.

## 3. Commands and expected results

```sh
# red: the element and runtime cases must fail on the old code
nub exec vitest run --config vitest.runtime.config.ts runtime/selection-mark.runtime.test.tsx
nub run --filter @gpuixui/primitives test

# green after the fix (the scoped file, then the package and the gates)
nub exec vitest run --config vitest.runtime.config.ts runtime/selection-mark.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
nub run test
```

`nub exec vitest run …` runs from `packages/primitives/`. The full runtime suite
(`nub run --filter @gpuixui/primitives test:runtime`) is the end-of-task check
for the paint assertion; the scoped file is the iteration loop (AGENTS §3).

## 4. STOP conditions

Stop and report if:

- a **third** component turns out to paint a selection mark (grep
  `theme.iconSize.sm` after the change) — the rule must serve all of them, or the
  scope was wrong;
- the fix would change `md`'s painted mark (14): the default look is not part of
  this defect, and a change there means the rule is wrong;
- the `sm` mark cannot be contained without changing `selectionBoxStyle` — the
  box's side is a documented public metric and is out of scope;
- an existing test asserts `Icon.size === theme.iconSize.sm` for a selection
  mark: that is evidence of the old behaviour; update it and name it in the
  result, never delete it;
- the runtime box model (plan `597`) makes the assertion ambiguous: use
  `runtime.paintBounds`/`boundsOfId` with the measured convention, do not
  "fix" a coordinate by eye.

## 5. Acceptance

- [ ] the rule exists in `core/selection.ts`, exported from `core/index.ts`, and
      serves both components;
- [ ] core, element-tree and runtime cases fail on the old code and pass on the
      new one (commands + output recorded in §6);
- [ ] `docs/checkbox.mdx` and `docs/checkbox-group.mdx` state the rule;
- [ ] `COMPONENTS.md` rows carry the measured result and the plan number;
- [ ] README runtime file count = 58; `nub run check`, `nub run lint`,
      `nub run test` green;
- [ ] plan indexed in `.agents/slop/plans/README.md`, `TODO.md` row ticked;
- [ ] commit on `agent/primitives` and push.

## 6. Result

Measured and fixed on 2026-10-19, in this worktree, on the store's release-tag
`@gpuix/native@0.10.0` build.

### Red — the old expression, before any fix

Element tree (`nub exec vitest run src/core/selection.test.ts
src/components/selection.test.tsx`), **6 failed / 80 passed**:

```
× Checkbox > scales the tick with the box instead of pinning it to one step
  AssertionError: expected [ 14, 14, 14 ] to deeply equal [ 12, 14, 18 ]
× Checkbox > scales the indeterminate dash by the same rule
  AssertionError: expected 14 to be 12
× CheckboxGroup > scales a row's tick with the group's size
  AssertionError: expected [ 14, 14, 14 ] to deeply equal [ 12, 14, 18 ]
```

The three core cases failed as `TypeError: selectionMarkSize is not a function`
— the rule did not exist; the values above are the real old behaviour.

Runtime (`nub exec vitest run --config vitest.runtime.config.ts
runtime/selection-mark.runtime.test.tsx`), **5 failed / 1 passed**:

```
× paints a sm checkbox mark at 12 px     expected 14 to be 12
× paints a lg checkbox mark at 18 px     expected 14 to be 18
× keeps the mark's side when the box is larger   expected 14 to be greater than 14
× paints a sm group row's mark at 12 px  expected 14 to be 12
× paints a lg group row's mark at 18 px  expected 14 to be 18
```

The `md` case passed in both directions, which is the point of §0: the default
look is unchanged and the defect only shows at the ends of the scale.

### Green — after the fix

- scoped: core + element **86/86**; runtime file **6/6**;
- package offline **60 files / 854 tests**;
- full runtime **58 files / 805 tests**, all passing (the new file is the +1
  file / +6 tests);
- `nub run check`, `nub run lint`, `nub run test` green.

### What changed

- `core/selection.ts` gains `selectionMarkSize` (the box's content square),
  exported from `core/index.ts`; `Checkbox` and `CheckboxGroup` name it instead
  of `theme.iconSize.sm`;
- `docs/checkbox.mdx` and `docs/checkbox-group.mdx` state the rule and list the
  new runtime file; `COMPONENTS.md`'s Checkboxes row and runtime paragraph carry
  the measured result and the file count; the package README moves to 58
  runtime files.

### Notes

- No STOP condition fired: no third painter of a selection mark exists
  (`theme.iconSize.sm` remains only for the Select chevron, which is not a
  selection mark and whose trigger is fixed by the field recipe), `md` is
  unchanged, and `selectionBoxStyle` is untouched.
- The `sm` mark's viewport is now inside the box's content square; the old one
  painted exactly the border box (measured `12,12 14×14` for a `12×12` content
  square).
