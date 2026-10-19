# 655 — Confirmation dialog: the busy state is announced

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110` (package), `112` (dialog), `117` (inventory), `181` (confirmation dialog), `516` (state descriptions) |
| Status | done — measured: a loading confirm announced `Confirm` / `Disabled` only; the `…` glyph's own `aria-label` is not part of the parent's name. The action now carries `aria-description="In progress"`, joined with `Disabled`. 1 native case (Confirmation dialog 7), both-direction proof; docs, `COMPONENTS.md`, `TODO.md` and the inventory synced. |

## 1. The problem

`ConfirmDialog` accepts `loading` and, while it is true, renders a `…` glyph
inside the confirm action:

```tsx
<Button ... disabled={loading} onClick={onConfirm}>
  {loading ? (
    <text aria-label="In progress" ...>…</text>
  ) : null}
  {confirmLabel}
</Button>
```

`Button` is a `div role="button"`. GPUix 0.10.0 does not derive a control's
accessible name from descendants (plan 391), so `internal/button.tsx` names it
from **plain-text children** via `controlName`. Plain text in the glyph is
skipped because the glyph is an element, so the name is `confirmLabel`, and
`aria-label` on the child contributes nothing. The button is also `disabled`, so
`stateDescription` appends `Disabled`.

Measured on this host, 2026-10-19, in the real `TestRenderer` with
`loading` true and the default labels:

```
button "Cancel"  description "Disabled"
button "Confirm" description "Disabled"
```

The busy state exists only as the painted `…`. A screen-reader user who presses
the confirm action and waits hears that the action is unavailable, not that the
request is in flight — which is the one thing the state is for. The component's
own docs promise "marks the confirm button busy".

`aria-busy` is not in the 0.10.0 host props, so the supported state channel is
`aria-description` — the same substitution plans 516 and 626 already use.

## 2. Scope

**In scope**

- `packages/components/src/confirm-dialog.tsx`: while `loading`, give the
  confirm action `aria-description="In progress"` and drop the dead
  `aria-label` from the glyph. Keep the glyph, its style and both actions'
  disabled behaviour unchanged.
- `packages/components/src/behaviour/confirm-dialog.test.tsx`: one native case
  that reads the accessibility tree (name and description) in both states.
- `packages/components/docs/confirm-dialog.mdx`: the behaviour/accessibility
  text and the canonical verification count (6 → 7).
- `COMPONENTS.md` (Confirmation dialogs row), `TODO.md`, `PLAN.md` D30, and
  this plan's row in `.agents/slop/plans/README.md`.

**Out of scope — do not touch**

- No new prop. `loading` already exists.
- No change to Dialog, Drawer, Button, `stateDescription` or the a11y helper.
- No spinner: the primitives `Spinner` reads a second theme context (recorded
  interlock); the `…` glyph stays.
- No playground edit (playground owns `apps/playground`).

## 3. Exact files and changes

### 3.1 `packages/components/src/confirm-dialog.tsx`

In the confirm `Button`:

1. Add the busy description next to the other props:

   ```tsx
   aria-description={loading ? "In progress" : undefined}
   ```

   `Button` spreads the caller's `aria-description` into
   `stateDescription(disabled, ...)`, which joins parts with `". "` and appends
   `Disabled`. While loading the description is therefore
   `"In progress. Disabled"`; when idle it is absent.

2. In the glyph, remove `aria-label="In progress"` (it never reached the
   control's name) and keep the text:

   ```tsx
   {loading ? (
     <text style={{ ...textStyle(theme, "label"), color: "inherit" }}>…</text>
   ) : null}
   ```

3. Update the module header's third bullet to say the action is **announced**
   as in progress, not only painted.

### 3.2 `packages/components/src/behaviour/confirm-dialog.test.tsx`

Import `nodesNamed` from `../internal/a11y.js` (keep `nodesWithRole`).

Add one case after "refuses both actions and Escape while loading":

```tsx
/**
 * The bug this guards: the busy state lived only in the `…` glyph's own
 * `aria-label`, which 0.10.0 never folds into its parent button's name, so a
 * loading confirm announced "Confirm, Disabled" and not that work was running.
 */
it("announces the confirm action as in progress while loading", () => {
  const loading = renderComponent(<Harness onConfirm={vi.fn()} loading />);
  const busy = nodesNamed(loading.renderer, "Confirm")[0];
  expect(busy?.name).toBe("Confirm");
  expect(busy?.description).toEqual(Option.some("In progress. Disabled"));
  loading.unmount();

  // The idle action carries no busy description: the state is not permanent.
  const idle = renderComponent(<Harness onConfirm={vi.fn()} />);
  const ready = nodesNamed(idle.renderer, "Confirm")[0];
  expect(ready?.description).toEqual(Option.none());
  idle.unmount();
});
```

### 3.3 `packages/components/docs/confirm-dialog.mdx`

- Behaviour table, `loading` row: `both actions disabled and described, \`…\`
  shown, Escape and outside press ignored`.
- Accessibility bullets: add "While `loading`, the confirm action is described
  **In progress** (joined with **Disabled**); `@gpuix/native@0.10.0` has no
  `aria-busy`, so the supported description channel carries it. The `…` glyph is
  skipped by the name, which stays `confirmLabel`."
- Verification line: `(7 tests)` and add the busy-announcement case to the
  sentence.

### 3.4 `COMPONENTS.md` — Confirmation dialogs row

Change `6 native behaviour tests` to `7 native behaviour tests` and add, after
the description sentence: "while `loading`, the confirm action is described
`In progress. Disabled`, because 0.10.0 has no `aria-busy`".

### 3.5 `TODO.md` — Tier 2 hardening

Add after the plan-652 item:

```
    - [x] A loading confirmation announces that it is in progress — plan 655.
      Measured: the `…` glyph's own `aria-label` never reaches its parent
      `div role="button"`, so a loading confirm announced "Confirm / Disabled".
      The action now carries `aria-description="In progress"`, joined with
      `Disabled`; 1 native case (Confirmation dialog 7), both-direction proof;
      docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory synced
      (owner: components)
```

### 3.6 `PLAN.md` D30

Append to the existing D30 cell: `…; `653`/`654` were claimed by the playground
before this branch claimed a number, so the confirmation busy-state plan takes
`655``.

### 3.7 `.agents/slop/plans/README.md`

Add to the components table, after the 652 row:

```
| [655](./655-confirm-dialog-busy-description.md) | Confirmation dialog: the busy state is announced | F | 110, 112, 117, 181, 516 | done — measured: the `…` glyph's `aria-label` never reached the button, so loading announced "Confirm / Disabled"; the action now describes "In progress. Disabled". 1 native case (Confirmation dialog 7), both-direction proof; docs, `COMPONENTS.md` and the inventory synced |
```

## 4. Commands and expected results

Run from `packages/components` (nub supplies Node 24.18.0):

1. `nub run check-types`
   → exit 0, no diagnostics.
2. `nub run test` (unit)
   → exit 0; `src/inventory.test.ts` passes with the docs count at 7 and the
   `COMPONENTS.md` count at 7.
3. `nub run test:behaviour src/behaviour/confirm-dialog.test.tsx`
   → `7 passed` for this file.
4. `nub run test:behaviour` (full native suite, end-of-task)
   → the same recorded plan-540 failures as `HEAD` (31 at the last full run),
   `Confirmation dialog` all green, total native cases +1.
5. From the repo root: `nub run check` and `nub run lint`
   → exit 0.

## 5. STOP conditions

- STOP if `aria-description` does not appear on the confirm button's a11y node
  (the host drops it) — report the measured tree instead of inventing a prop.
- STOP if the idle case reports a description (the state would be permanent);
  inspect `Button`'s spread order rather than changing `stateDescription`.
- STOP if the new case passes against the **old** source (it would not guard
  the bug); report the measurement.
- STOP if any unexpected behaviour case fails beyond the recorded plan-540
  classes; do not "fix" unrelated files from this plan.

## 6. Test plan (both directions)

- **Without the fix** (remove the `aria-description` line): the loading case
  reports `Option.some("Disabled")` and fails on
  `"In progress. Disabled"`. Proven by running the case, observing the
  failure, then restoring the line.
- **With the fix**: `7 passed` in the confirmation suite; the idle pin stays
  green in both directions.
- **Meaningfulness**: the assertion reads the runtime's accessibility tree
  (the channel a screen reader consumes), not a prop echoed from the source.
  It fails for the real defect and passes only when the state is delivered.

## 7. Acceptance

- The measured tree for a loading confirmation contains a `button` named
  `confirmLabel` with description `In progress. Disabled`.
- An idle confirmation's action has no busy description.
- The docs state the limitation and the real count; the inventory check and
  all three gates pass; the plan and TODO are indexed.
