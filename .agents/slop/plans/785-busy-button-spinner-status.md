# 785 — A busy button's spinner is a second, nested `Loading` status

| Field | Value |
| ----- | ----- |
| Phase | F — an accessibility duplicate the element tree could not see |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Button and Loading-indicator rows in `COMPONENTS.md`) |
| Depends on | `058` (names from text), `086` (IconButton), `093` (the accessible-name matrix), `644` (the spinner is sized inside a button), `754` (the busy spinner's contrast) |
| Status | done — measured both directions (§6) |

## 0. The defect, in one sentence

A busy `Button` announces `"Loading"` in its own `aria-description` **and** paints
a `Spinner` whose `role="status"` publishes a second, nested `Status: Loading`
node — so one control contributes two accessibility nodes that say the same
thing, and the second is a live-status role nested inside a button.

## 1. Measured evidence (2026-10-20, native `TestRenderer`)

One window, one busy primary button and one standalone spinner:

```tsx
<Button testId="b" loading>Save</Button>
<Spinner testId="s" />
```

`a11yNodes` reported four nodes (trimmed to the relevant fields):

| Node | Role | Name | Description | Children |
| ---- | ---- | ---- | ----------- | -------- |
| busy button | `Button` | `"Save"` | `"Loading"` | `["a"]` |
| its spinner | `Status` | `"Loading"` | — | — |
| standalone spinner | `Status` | `"Loading"` | — | — |
| window | `Window` | `"GPUIX Test"` | — | `["b", "c"]` |

The busy button's child `a` **is** the nested status. `IconButton` inherits the
same tree (it composes `Button`). The standalone spinner is correct: it is the
only thing that says "Loading" and it is a status.

`docs/button.mdx`, `docs/icon-button.mdx` and `docs/spinner.mdx` already say the
button's busy state is announced through `aria-description="Loading"`; the
spinner's node is therefore redundant, not a second affordance.

## 2. The contract

1. `Spinner` gains `decorative?: boolean` (default `false`). A decorative
   spinner paints exactly the same dots, but its host is `role="presentation"`
   and carries no `aria-label`, so it produces no accessibility node — the rule
   `Icon` already follows for a decorative mark.
2. `Button` passes `decorative` to the spinner it paints while busy, because the
   button itself already announces `"Loading"` (and joins a slot tip after it,
   `"Loading. <tip>"`, plan `341`). `IconButton` inherits the fix.
3. A standalone `Spinner` is unchanged: `Status`, named `"Loading"` by default
   or by `label`, with a blank label falling back (plan `026`).
4. A busy button with no name stays unnamed — the spinner was never its name.
   The page states that an icon-only busy action must pass `label`
   (`IconButton` already requires it).
5. The runtime matrix proves the class: a busy `Button` and `IconButton` add no
   `Status` node, while a standalone `Spinner` still does.

## 3. Files to change (exact)

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Spinner.tsx` | `decorative` prop; `role`/`aria-label` resolved from it |
| `packages/primitives/src/components/Button.tsx` | the busy `<Spinner>` passes `decorative` and no longer carries a dead `label` |
| `packages/primitives/src/components/Spinner.test.tsx` | **new** — default status vs decorative presentation, and the blank-label fallback |
| `packages/primitives/src/components/Button.test.tsx` | one tree case: the busy spinner is decorative and the button still announces `Loading` |
| `packages/primitives/runtime/button-loading.runtime.test.tsx` | one case: busy `Button` + busy `IconButton` + standalone `Spinner`; exactly one `Status` node, and it is the standalone one |
| `packages/primitives/docs/spinner.mdx` | API row, Accessibility section and Verification list |
| `packages/primitives/docs/button.mdx` | the `loading` row and the busy paragraph say the indicator is decorative |
| `packages/primitives/docs/icon-button.mdx` | the same one-line clarification |
| `COMPONENTS.md` | Button and Loading-indicator rows |
| `TODO.md` | one ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | index row for this plan |

No other source file changes. `contract.test.ts` reads the page's `## API`
table, so the new prop must be added there in the same commit.

## 4. Implementation

### 4.1 `Spinner`

```tsx
export interface SpinnerProps {
  // ...
  /**
   * Paint without an accessibility node.
   *
   * Use it where the surrounding control already announces the busy state — a
   * `Button` says "Loading" in its description — so the indicator is decoration
   * instead of a second `Status` node. The dots are unchanged.
   */
  readonly decorative?: boolean;
}

export const renderSpinner = (
  { size, accent = "primary", color, label = "Loading", decorative, style, testId },
  theme: PrimitiveTheme,
  step: number,
): ReactElement => {
  const dot = size ?? theme.iconSize.md;
  return (
    <div
      role={decorative === true ? "presentation" : "status"}
      aria-label={decorative === true ? undefined : ariaNameOr(label, "Loading")}
      testId={testId}
      style={mergeStyle(spinnerRowStyle(theme), style)}
    >
      {/* dots unchanged */}
    </div>
  );
};
```

`role="presentation"` is what `Icon` uses for a decorative mark, and the runtime
documents `none`/`presentation` as producing no node.

### 4.2 `Button`

```tsx
<Spinner
  size={spinnerDot}
  color={buttonVariants[variant].foreground(theme)}
  decorative
/>
```

The button's `description` already resolves `"Loading"` (or `"Loading. <tip>"`),
so no second announcement is needed.

## 5. Test plan (both directions)

**Offline — `src/components/Spinner.test.tsx` (new)**

1. the default tree is `role="status"` named `"Loading"`;
2. `decorative` is `role="presentation"` with no `aria-label`;
3. `label="  Uploading  "` is trimmed, and `label="   "` falls back to
   `"Loading"` (the existing rule, now guarded here).

**Old direction:** revert the `role`/`aria-label` expressions and case 2 fails
(`status` and a name where presentation and no name are required).

**Offline — `src/components/Button.test.tsx`**

One case: the spinner child of a busy button carries `decorative: true`, and the
button's `aria-description` is `"Loading"`; with `aria-description="A hint"` it is
`"Loading. A hint"`.

**Old direction:** remove `decorative` from the busy `<Spinner>`; the case fails
on the missing prop.

**Runtime — `runtime/button-loading.runtime.test.tsx`**

One case mounts a busy `Button`, a busy `IconButton` and a standalone `Spinner`.
Assertions:

- `a11yNodes(...).filter(node => node.aria?.role === "Status")` has **one**
  entry and its label is the standalone spinner's — the two busy controls add
  none;
- the busy `Button` node is named `"Saving"` with description `"Loading"`;
- the busy `IconButton` node is named `"Apply"` with description `"Loading"`;
- the standalone node is `Status` with its label.

**Old direction:** the same scene before the fix reports **three** `Status` nodes
(two nested), so the count assertion fails; it also fails with `decorative`
ignored while the button keeps announcing `Loading`.

## 6. Commands and expected results

```sh
# old direction: the new offline cases against the unfixed source
nub run --filter @gpuixui/primitives test src/components/Spinner.test.tsx src/components/Button.test.tsx
# 2 failed (role/name; the missing decorative prop)

nub run --filter @gpuixui/primitives test:runtime runtime/button-loading.runtime.test.tsx
# 1 failed: expected 1 Status node, received 3

# new direction
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime runtime/button-loading.runtime.test.tsx
nub run --filter @gpuixui/primitives check-types
nub run lint
nub run check:tests
```

Then the scoped headless smoke scenario(s) that mount the Tier 1 set (derive
their ids with `--list`; do **not** run `--all`).

The full live suite is the merge/release gate and is **not** run while iterating.

Measured results (2026-10-20):

- **Old direction — the button wiring:** dropping `decorative` from the busy
  `<Spinner>` fails `Button.test.tsx`'s new case with `expected { _tag: 'None' }
  to strictly equal { _tag: 'Some' }`, and the runtime case fails with
  `expected [ … ] to have a length of 1 but got 3`.
- **Old direction — the spinner rule:** making `decorative` still send
  `role="status"` fails `Spinner.test.tsx` with `expected 'status' to be
  'presentation'`, and the runtime case again reports 3 statuses.
- **New direction:** `Spinner.test.tsx` + `Button.test.tsx` are 28/28, the
  runtime file is 2/2 (the new case reports exactly one `Status`, named
  `Standalone`, and both busy controls carry `description: "Loading"`), the full
  offline suite is **72 files / 1005 tests, 0 failed**, and `check-types`,
  `nub run lint`, `nub run check:tests` and `nub run fmt` (one known cross-team
  file aside: `apps/docs/src/components/docs/demos.tsx`) are green.
- **Smoke:** `nub apps/playground/dist/smoke/run.js --only layout-flex` passes
  (`layout=verified`). `focus-traversal` fails on the pinned release-tag binding
  with no `onFocus` dispatch (`focus=none`) — the known artifact limitation
  recorded in plans `583`/`590`, unrelated to this change (no focus path was
  touched).

## 7. STOP conditions

Stop and report instead of improvising if:

- `role="presentation"` still produces an accessibility node on this runtime
  (then the decorative form is not expressible; report the dump and do not
  remove the standalone status);
- the standalone `Spinner` loses its `Status` node or its name (the public
  contract regresses for every consumer);
- the button's `aria-description` no longer reaches the `Button` node (the
  duplicate would be replaced by silence, which is worse);
- the runtime suite cannot load the binding (record "unverified", do not claim
  the runtime half).

## 8. Acceptance criteria

- A busy `Button`/`IconButton` publishes exactly one accessibility node — the
  control — and it says `"Loading"` through its description.
- A standalone `Spinner` remains a named `Status`.
- `Spinner.decorative` is documented in the props table and the Accessibility
  section, with the reason (a control that already announces the state).
- The offline and runtime cases fail in the old direction and pass in the new
  one; `check-types`, `lint`, `check:tests` and the offline suite are green.
- The Button, Loading-indicator, TODO and plan-index records are current.
