# 732 — Any overlay's layer order follows the nesting, not the open order

**Owner:** components workstream · **Phase:** F (Tier 2 hardening) ·
**Depends on:** 110, 112, 114, 116, 117, 200, 201, 317, 320, 366, 568, 583, 669, 730

**Numbering:** `729` (tokens-theme), `730` (this branch) and `731`
(primitives, `731-select-typeahead`) are taken; `732` is the first free number
across `main` and every worktree on 2026-10-20. Record it in `PLAN.md` D30.

## 1. Why

Plan 730 made **modal** layer order follow the nesting depth. Every other
overlay still pushes a plain layer at depth `0`, and React runs a child's layout
effects before its parent's — so an overlay mounted **open inside a dialog
already open at the same commit** pushes its layer first and the dialog is
topmost.

Measured on this host, from `packages/components`, scratch probe since deleted:

| fixture (dialog open at mount, overlay open at mount) | one `Escape` closes |
| ----------------------------------------------------- | ------------------- |
| `Popover defaultOpen` inside `DialogContent` | **both** the popover and the dialog (focus `none`) |
| `DropdownMenu defaultOpen` inside `DialogContent` | **both** the menu and the dialog (focus `none`) |

That is the plan-730 defect one level out: a saved route that restores a
popover open, a menu anchored in a settings dialog, a combobox mounted open in
an inspector. The component whose panel is painted on top is not the layer that
receives the key.

Plan 730 deliberately scoped its context to modals ("non-modal overlays keep
today's open-order tie-break"); this plan closes that hole by generalising the
same context to every overlay root:

- each overlay root reads the enclosing overlay depth, pushes its dismiss layer
  at `depth + 1`, and publishes `depth + 1` to its children, so a menu in a
  popover in a dialog is ordered `0 < 1 < 2`;
- open order still breaks ties between siblings at the same depth;
- modals keep their extra `contentId` (focus returns to the enclosing surface),
  which non-modal overlays leave undefined.

**Out of scope:** focus entry and focus return outside modals (popovers, menus
and the combobox keep their current `useCloseFocus`/trigger behaviour); the Tab
claim; the parts tree; portals; any change to placement, motion or hover.

## 2. What exists today (read these first)

- `packages/components/src/internal/modal-host.tsx` — plan 730's context:
  `ModalHost { depth, contentId }`, `useModalHost`, `ModalHostProvider`.
- `packages/components/src/internal/dismiss-layer.ts` — `pushDismissLayer(handler, depth = 0)`
  and `dismissTopLayer` (deepest, then latest), `hasDeeperLayer`.
- `packages/components/src/internal/modal.ts` — `useModalState` pushes at the
  modal depth and `useModalFocus` gates on `hasDeeperLayer`.
- The push sites that still use the default depth:
  `popover.tsx:309`, `preview-card.tsx:246`, `navigation-menu.tsx:303`,
  `combobox.tsx:431`, `dropdown-menu.tsx:149`, `context-menu.tsx:161`,
  `notification-centre.tsx:428`, `menu/sub.tsx:354`.
- `packages/components/src/behaviour/{popover,dropdown-menu,combobox}.test.tsx`
  — the suites that will gain the same-commit case.

## 3. Exact changes

### 3.1 Generalise the host: `internal/modal-host.tsx` → `internal/overlay-host.tsx`

Move the file with `git mv` and rename the identifiers:

- `ModalHost` → `OverlayHost` (`depth` unchanged; `contentId` docs become "the
  enclosing **modal** surface's native id, when there is one");
- `useModalHost` → `useOverlayHost`;
- `ModalHostProvider` → `OverlayHostProvider`;
- header: "Where a subtree sits among overlays. React runs a child's layout
  effects before its parent's, so an overlay mounted together with the one
  around it pushes its dismiss layer first; the nesting is known at render time
  and orders the stack (plans 730, 732)."

Update the three importers (`internal/modal.ts`, `dialog.tsx`, `drawer.tsx`) and
the JSDoc wording in `useModalState`/`useModalFocus`. No behaviour change there.

### 3.2 Every non-modal overlay root pushes at its nesting depth

In each file below, inside the root component that owns the layer, add:

```ts
const depth = useOverlayHost().depth + 1;
```

pass `depth` as `pushDismissLayer`'s second argument (replace a bare
`pushDismissLayer(handler)` with `pushDismissLayer(handler, depth)`; for the
curried multi-line forms only the call head changes), and add `depth` to the
effect's dependency array. Then wrap the root's children:

```tsx
<OverlayHostProvider depth={depth} contentId={undefined}>
  {children}
</OverlayHostProvider>
```

Files and their roots:

| File | Root | Layer push |
| ---- | ---- | ---------- |
| `popover.tsx` | `Popover` | line ~309 |
| `preview-card.tsx` | `PreviewCard` | ~246 |
| `navigation-menu.tsx` | `NavigationMenu` | ~303 |
| `combobox.tsx` | `Combobox` | ~431 |
| `dropdown-menu.tsx` | `DropdownMenu` | ~149 |
| `context-menu.tsx` | `ContextMenu` | ~161 |
| `notification-centre.tsx` | `NotificationCentre` | ~428 |
| `menu/sub.tsx` | `MenuSubContent` | ~354 |

For `MenuSubContent` the host it reads is the menu root's provider, so its own
depth is `menu + 1`; wrap its content children so a nested submenu is one deeper
again. Do not change `MenuSub` (the trigger/state owner) — it paints no layer.

`contentId` stays `undefined` for all eight: a non-modal overlay does not take
modal focus, and modal focus fallback only ever targets a modal surface.

Keep every existing handler body unchanged — the trigger-press claim, the
`insideSurface` check, the leave directions and the close-focus rules are not
part of this change. Only the depth argument and the provider are new.

### 3.3 Tests (three behaviour suites, each +1)

Add one case per suite, each proven to fail at `HEAD`:

1. `packages/components/src/behaviour/popover.test.tsx` —
   `it("keeps a popover mounted with its dialog on top", async () => {` — an open
   `Dialog` with a `Popover defaultOpen` in its content; one `Escape` after
   `nextTask()` closes the popover only, the dialog's control is still shown and
   focus is back on `popover-trigger`. Suite 26 → 27.
2. `packages/components/src/behaviour/dropdown-menu.test.tsx` —
   `it("keeps a menu mounted with its dialog on top", async () => {` — same shape
   with `DropdownMenu defaultOpen`; one `Escape` closes the menu only and leaves
   the dialog painted. Suite 62 → 63.
3. `packages/components/src/behaviour/combobox.test.tsx` —
   `it("keeps a combobox mounted with its dialog on top", async () => {` — a
   `Combobox defaultOpen` inside the dialog; one `Escape` closes the popup only,
   the dialog stays painted and the input keeps its value. Suite 62 → 63.

Each fixture follows the suite's existing imports and helpers (`nextTask`,
`finishMotion`, `isShown`, `focusedTestId`); do not add new helpers.

### 3.4 Docs and inventory

- `docs/component-api.md` §4: replace the plan-730 sentence's modal-only wording
  with the general rule — "**Layer order is nesting order**: every overlay's
  dismiss layer ranks by how deeply it is nested in other overlays (a dialog, a
  popover, a menu, a submenu), with open order only breaking ties between
  siblings. A modal additionally ranks its initial focus and returns focus to
  the enclosing surface (plans 730, 732)."
- `packages/components/docs/popover.mdx`, `dropdown-menu.mdx` and `combobox.mdx`
  — one sentence in the keyboard/dismissal section: "Mounted open together with
  a dialog, it is still the top layer: one `Escape` closes it and leaves the
  dialog open (plan 732)." Update each `## Verification` count (`26 → 27`,
  `62 → 63`, `62 → 63`) and name the new case.
- `COMPONENTS.md` — Popovers `26 → 27`, Dropdown menus `62 → 63`, Comboboxes
  `62 → 63`; add the nesting sentence to each of the three rows.
- `.agents/slop/plans/README.md` — index this plan in numeric order.
- `PLAN.md` D30 — append "`731` then went to primitives
  (`731-select-typeahead`), so the overlay-nesting plan takes `732`".
- `TODO.md` — one ticked bullet under Tier 2 hardening with the measurement and
  the three counts.

## 4. Test plan

Run from `packages/components`.

1. **Before the fix:** the three suites with the new cases. Expected at `HEAD`:
   Popover 26/27, Dropdown 62/63, Combobox 62/63 — each new case fails because
   one `Escape` closed the dialog too (measured above). Record the assertion.
2. **After the fix:** the same commands. Expected: Popover 27, Dropdown 63,
   Combobox 63 — with only the recorded plan-540 placement failures (Popover 3,
   Dropdown 2).
3. **Mutation proof:** in `popover.tsx` only, drop the `depth` argument (back to
   the default) → the new popover case fails and nothing else changes. Repeat
   once for `dropdown-menu.tsx`. Record both.
4. **Neighbour suites:** `dialog`, `drawer`, `context-menu`,
   `navigation-menu`, `preview-card`, `notification-centre`, `command-menu`.
   Expected: the same counts and the same recorded failures as at `HEAD`
   (Dialog 21, Drawer 18 with its width defect, Context menu 24, Navigation menu
   28, Preview card 18, Notification centre 20, Command menu 25 with its scroll
   defect).
5. **Scoped smoke:** `nub apps/playground/dist/smoke/run.js --only overlay-dialog`
   and `--only modal-focus-trap`; both `ok`.
6. **Gates:** `nub run check`, `nub run lint`, `nub run test`, then the full
   behaviour suite. All three exit `0`; the full behaviour suite is
   `915 passed / 28 failed of 943` (the same plan-540 classes). Record the real
   totals. Do not run the live suite or `--all`.

## 5. STOP conditions

- Stop if a new case does **not** fail at `HEAD`: the fixture is not nested or
  the overlay does not own a layer.
- Stop if any neighbour suite gains a failure beyond its recorded plan-540
  class — depth must only reorder an enclosing overlay, never a sibling.
- Stop if a submenu or menu suite changes count without a new case: the
  `MenuSubContent` depth is wrong for its parent level.
- Do not touch focus entry, `useCloseFocus`, the Tab claim, motion or placement.

## 6. Acceptance

- The host is `internal/overlay-host.tsx` with `OverlayHost` semantics; every
  overlay root in §3.2 pushes at its nesting depth and publishes one level
  deeper to its children.
- Three new behaviour cases fail before the fix and pass after; two mutation
  proofs recorded.
- Docs, `docs/component-api.md`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and
  the plan index synced; stated counts match the suites.
- `nub run check`, `nub run lint`, `nub run test` exit `0`; the full behaviour
  suite shows no new failure class.
- Committed on `agent/components` in small commits and pushed.
