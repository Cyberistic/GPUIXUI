# 730 — A modal's layer and focus order follow the nesting, not the mount order

**Owner:** components workstream · **Phase:** F (Tier 2 hardening) ·
**Depends on:** 110, 112, 117, 200, 201, 309, 525, 587, 638, 669, 704, 719, 728

**Numbering:** `729` is claimed by tokens-theme (`729-soft-panel-caption-tier`),
`728` by this branch; every other number from `720` up is taken across `main` and
the worktrees. `730` is the first free number on 2026-10-20. Record it in
`PLAN.md` D30.

## 1. Why

A dialog can open a confirmation at the same moment it is itself open — a
settings dialog restored from saved state with an interrupted delete still
pending, a route that mounts a dialog and its confirmation together. React runs
**child effects before parent effects**, so the two shared modal rules are both
derived from an order that is the opposite of the paint order:

- `useModalState` pushes the dismiss layer in a layout effect, so the
  **enclosing** dialog pushes **after** the confirmation → the enclosing dialog
  is the topmost layer;
- `useModalFocus` moves focus in when its content id lands, so the enclosing
  dialog focuses **after** the confirmation → focus ends on the dialog surface.

Measured on this host, from `packages/components`, with a `ConfirmDialog`
mounted inside an open `Dialog`'s content, both `open` at mount (scratch probe,
since deleted; the fixture is the one in §3.6):

| moment | focus | outer shown | confirmation shown |
| ------ | ----- | ----------- | ------------------ |
| mount | `outer-content` | yes | yes |
| one `Escape` | `none` | **no** | **no** |
| one `Tab` after that | `outer-first` | — | — |

So the user sees a confirmation painted on top, but:

1. `Enter` runs an action in the dialog **behind** it (focus is on the outer
   surface, not on Cancel);
2. one `Escape` closes **both** surfaces — the outer layer was topmost, closed
   first, and took the confirmation with it;
3. focus ends on nothing, because the confirmation's saved opener was `null`
   (nothing was focused when both mounted) and it had nowhere to return.

The later-opened path is correct and must stay correct (plan 728, re-measured
today): a confirmation opened by a press focuses `confirm-cancel`, and one
`Escape` closes only it and returns focus to `outer-delete`.

The rule to fix is therefore **ordering**, not the claim or the trap:

- a layer's position comes from **how many modal surfaces enclose it** in the
  React tree, with open order only breaking ties between siblings;
- a modal only takes initial focus when **no deeper modal is open**, and a close
  with no live opener returns focus to the **enclosing surface**.

`@gpuix/react@0.10.0` exposes no element parent chain (`NativeRenderer` hands
back ids and bounds only — plan 540), so nesting cannot be read from the
renderer after the fact. It is available at render time, which is where the
provider below reads it.

Scope of this plan:

- a modal host context (`depth` + the enclosing surface's native id);
- a depth-aware dismiss stack, with depth as the topmost rule and open order as
  the tie-break;
- focus entry gated on "no deeper modal", and close-focus falling back to the
  enclosing surface;
- `Dialog` and `Drawer` publish the host; `ConfirmDialog` and any modal composed
  from them inherit it with no API change;
- 3 pure dismiss-stack cases, 3 confirmation cases and 1 drawer case;
- docs, `docs/component-api.md`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and
  the plan index synced.

**Out of scope** (do not add): the Tab claim (plan 728 — already correct and
independent of order); Escape's one-event claim (plans 587/669); the exit
motion; a portal; `aria-modal`; non-modal overlays (a `Popover` mounted open
inside a dialog in the same commit keeps today's open-order tie-break — they
push at depth `0` and are not part of this plan's contract; record it as a
limitation on the Popover page only if the probe shows it, do not build a
second host context).

## 2. What exists today (read these first)

- `packages/components/src/internal/modal.ts` — `useModalState` (open state +
  `pushDismissLayer` in a layout effect keyed on `open`), `useModalFocus`
  (captures `previousFocus` at render, focuses content then `initialFocus`,
  restores on cleanup), `handleModalKeyDown` (Escape through
  `dismissTopLayer`, Tab through `focusNextWithin` + `claimEvent`).
- `packages/components/src/internal/dismiss-layer.ts` — a module-level
  `ReadonlyArray<DismissHandler>`; `dismissTopLayer` offers the event to
  `Arr.last`, and the shared claim makes one event close one layer.
- `packages/components/src/internal/dismiss-layer.test.ts` — 8 cases: topmost
  only, payload copies, the claim across a microtask, three nested readers, the
  next event reaching the new top, a removed layer.
- `packages/components/src/dialog.tsx` line 110 (`Dialog` root),
  line 222 (`DialogSurface`) and line 250 (`useModalFocus`).
- `packages/components/src/drawer.tsx` line 106 (`Drawer` root),
  line 236 (`DrawerSurface`) and line 266 (`useModalFocus`).
- `packages/components/src/confirm-dialog.tsx` — the nested workflow; it
  renders `Dialog` inside the caller's `DialogContent`, which is why the two
  pushes happen in one commit.
- `packages/components/src/behaviour/confirm-dialog.test.tsx` — 10 native
  cases; `DialogWithConfirm` opens the confirmation from a press (the correct
  path), and `nextTask()` separates gestures (plan 587).

`assertParts` is family-scoped (`internal/parts.ts`): a `ConfirmDialog` is not a
`Dialog` part, so it may sit inside `DialogContent`; a bare `Dialog` may not.
That is why the same-commit fixture uses a confirmation (the real workflow) and
not two nested `Dialog`s — a nested bare `Dialog` fixture renders nothing and is
not valid evidence.

## 3. Exact changes

### 3.1 New `packages/components/src/internal/modal-host.tsx` (~40 lines)

One context: how deeply a subtree sits in modals, and which surface encloses it.

```tsx
/**
 * Where a subtree sits among modal surfaces.
 *
 * React runs a child's layout effects before its parent's, so an enclosing
 * dialog pushes its dismiss layer and takes focus *after* a modal nested in its
 * content. The nesting is known at render time, so it is published here and the
 * dismiss stack and focus entry order by it (plan 730).
 */

import { createContext, useContext, type ReactNode } from "react";

/** The enclosing-modal facts a surface reads. */
export interface ModalHost {
  /** The layer depth this modal pushes; `-1` outside every modal. */
  readonly depth: number;
  /** The enclosing modal surface's native id, when there is one. */
  readonly contentId: number | undefined;
}

const ModalHostContext = createContext<ModalHost>({
  depth: -1,
  contentId: undefined,
});

/** The modal host this subtree sits in. `depth: -1` outside every modal. */
export const useModalHost = (): ModalHost => useContext(ModalHostContext);

/** Publish the host a modal's parts (or its surface's children) inherit. */
export const ModalHostProvider = ({
  depth,
  contentId,
  children,
}: ModalHost & { readonly children?: ReactNode }) => (
  <ModalHostContext.Provider value={{ depth, contentId }}>
    {children}
  </ModalHostContext.Provider>
);
```

No memo, no state: the value is two scalars and every consumer re-renders with
its provider anyway.

### 3.2 `packages/components/src/internal/dismiss-layer.ts`

1. A layer is a handler plus a depth:

   ```ts
   interface Layer {
     readonly onDismiss: DismissHandler;
     readonly depth: number;
   }

   let layers: ReadonlyArray<Layer> = [];
   ```

2. `pushDismissLayer(onDismiss, depth = 0)` appends `{ onDismiss, depth }` and
   returns a removal that filters by handler identity. The default keeps every
   existing caller (popover, menus, combobox, preview card, navigation menu,
   notification centre) at depth `0` with today's ordering.

3. `dismissTopLayer` offers the event to the **deepest** layer, and to the
   latest one among equal depths (the current `Arr.last` behaviour):

   ```ts
   const topmost = Arr.reduce(
     layers,
     Option.none<Layer>(),
     (best, layer) =>
       Option.match(best, {
         onNone: () => Option.some(layer),
         onSome: (current) =>
           Option.some(layer.depth >= current.depth ? layer : current),
       }),
   );
   ```

   `Option.match(topmost, { onNone: () => false, onSome: (layer) => { claimEvent(event); layer.onDismiss(event); return true; } })`
   — the same body as today, over `layer.onDismiss`.

4. New export, for focus entry only:

   ```ts
   /** Whether a layer deeper than `depth` is open. Focus entry asks this. */
   export const hasDeeperLayer = (depth: number): boolean =>
     Arr.some(layers, (layer) => layer.depth > depth);
   ```

5. Update the module JSDoc: "Nesting therefore dismisses outside-in" becomes
   the depth rule — a modal's depth is its nesting, so a confirmation mounted
   with its dialog is topmost even though its layer was pushed first; open order
   breaks ties between siblings.

### 3.3 `packages/components/src/internal/modal.ts`

1. `ModalState` gains `readonly depth: number` (the modal's own layer depth).
2. `useModalState` reads `useModalHost()` and computes `depth = host.depth + 1`;
   the push effect becomes
   `pushDismissLayer(() => dismiss.current(), depth)` with `[open, depth]` deps.
   The `dismiss` ref and the no-re-push comment stay untouched.
3. `useModalFocus` reads `useModalHost()` and keeps the host in a ref updated
   every render (like `initialFocusRef`), so the cleanup sees the latest
   enclosing id:

   ```ts
   const host = useModalHost();
   const hostRef = useRef(host);
   useLayoutEffect(() => {
     hostRef.current = host;
   });
   ```

   In the focus effect, after the `contentId === undefined` guard:

   ```ts
   if (hasDeeperLayer(hostRef.current.depth)) return;
   ```

   before `focusElement(contentId)` — the deepest open surface owns entry, so an
   enclosing dialog whose effect runs last never steals it. The cleanup restore
   becomes:

   ```ts
   const enclosing = hostRef.current.contentId;
   const target =
     previousFocus !== null &&
     previousFocus !== contentId &&
     renderer?.getElementBounds?.(previousFocus) !== null
       ? previousFocus
       : enclosing;
   if (target === null || target === undefined || target === contentId) return;
   renderer?.focusElement?.(target);
   ```

   Keep the comment about a destroyed opener, and add: a confirmation mounted
   with its dialog has no opener, so focus returns to the enclosing surface
   rather than to nothing (plan 730).
4. `handleModalKeyDown` is unchanged. Do not add depth there: Escape already
   routes through the stack, and Tab is claimed by the deepest trap that sees
   the key.

### 3.4 `packages/components/src/dialog.tsx`

1. Import `ModalHostProvider, useModalHost` from `./internal/modal-host.js`.
2. `Dialog` root: `const { open, setOpen, depth } = useModalState(...)`, read
   `const host = useModalHost()`, and wrap the children:

   ```tsx
   <DialogContext.Provider value={context}>
     <ModalHostProvider depth={depth} contentId={host.contentId}>
       {children}
     </ModalHostProvider>
   </DialogContext.Provider>
   ```

3. `DialogSurface`: read `const host = useModalHost()` (this is the root's
   provider — `depth` is this dialog's own depth, `contentId` is the enclosing
   modal's surface) and wrap only the content div's children:

   ```tsx
   <ModalHostProvider depth={host.depth} contentId={contentId}>
     {children}
   </ModalHostProvider>
   ```

   The close control and the surface chrome stay outside the provider.
   `useModalFocus` keeps its current arguments.

### 3.5 `packages/components/src/drawer.tsx`

The same two edits as §3.4 at `Drawer` (line 106) and `DrawerSurface`
(line 236): the root wraps its children with
`<ModalHostProvider depth={depth} contentId={host.contentId}>`, and the surface
wraps its content div's children with `depth={host.depth} contentId={contentId}`.
Nothing else changes.

### 3.6 Tests

#### 3.6.1 `packages/components/src/internal/dismiss-layer.test.ts` (8 → 11)

Update the header: the layer order now follows nesting, and the bug guarded is
"a modal mounted with its parent was pushed first, so Escape closed the parent
and took the child with it".

Add three cases:

1. **`it("puts a deeper layer above a shallower one, whatever the push order", ...)`**
   — `pushDismissLayer(deep, 1)` then `pushDismissLayer(shallow, 0)`; one
   `dismissTopLayer(escape())` runs `deep` only. This fails on the old
   `Arr.last`.
2. **`it("keeps open order between layers at the same depth", ...)`** — two
   `pushDismissLayer(handler)` (default `0`); the later one is topmost. Pins the
   existing behaviour for siblings and for every non-modal overlay.
3. **`it("reports whether a deeper layer is open", ...)`** — with depths `0`
   and `1`: `hasDeeperLayer(0)` is `true`, `hasDeeperLayer(1)` is `false`, and
   after removing the depth-`1` layer `hasDeeperLayer(0)` is `false`.

Each removes what it pushed, like its neighbours.

#### 3.6.2 `packages/components/src/behaviour/confirm-dialog.test.tsx` (10 → 13)

Header: add the same-commit bugs it guards (focus on the dialog behind, one
Escape closing both, focus lost). Add a fixture beside `DialogWithConfirm`:

```tsx
/** A dialog and its confirmation mounted together, as a restored route does. */
const BothOpenAtMount = () => {
  const [outer, setOuter] = useState(true);
  const [confirm, setConfirm] = useState(true);
  return (
    <Dialog open={outer} onOpenChange={setOuter}>
      <DialogContent label="Settings" testId="outer-content">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Button testId="outer-first">First</Button>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Delete?"
          description="This cannot be undone."
          onConfirm={() => undefined}
        />
      </DialogContent>
    </Dialog>
  );
};
```

Three cases:

1. **`it("keeps focus on Cancel when the confirmation opens with its dialog", ...)`**
   — render, immediately expect `focusedTestId` to be `confirm-cancel`.
   Fails at `HEAD` with `outer-content`.
2. **`it("closes only the confirmation and returns focus to the dialog", async () => {`**
   — render; `await nextTask(); simulateKeystrokes("escape"); finishMotion`; expect
   `confirm-accept` gone, `outer-first` shown, `focusedTestId` = `outer-content`.
   Fails at `HEAD` (both gone, focus `none`).
3. **`it("leaves the dialog's trap in charge after the confirmation closes", async () => {`**
   — same close, then `await nextTask(); simulateKeystrokes("tab")`; expect
   `dialog-close` (the outer trap resumed on a new gesture). Fails at `HEAD`
   because the dialog closed too.

The three later-opened cases stay untouched and pin plan 728.

#### 3.6.3 `packages/components/src/behaviour/drawer.test.tsx` (17 → 18)

One case proving the rule lives in the shared layer, not in `Dialog`:

```tsx
/** A drawer and its confirmation mounted together. */
const DrawerWithConfirmAtMount = () => {
  const [outer, setOuter] = useState(true);
  const [confirm, setConfirm] = useState(true);
  return (
    <Drawer open={outer} onOpenChange={setOuter}>
      <DrawerContent label="Details" testId="drawer-content">
        <DrawerHeader>
          <DrawerTitle>Details</DrawerTitle>
        </DrawerHeader>
        <Button testId="drawer-first">First</Button>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Discard?"
          description="The draft is lost."
          onConfirm={() => undefined}
        />
      </DrawerContent>
    </Drawer>
  );
};
```

`it("keeps a confirmation mounted with a drawer on top", async () => {` — expect
`confirm-cancel` focused; `await nextTask(); escape; finishMotion`; expect
`confirm-accept` gone, `drawer-first` shown, focus `drawer-content`. Fails at
`HEAD`.

If the drawer fixture needs different imports (`DrawerHeader`, `DrawerTitle`),
use the ones the drawer suite already imports; do not invent parts.

### 3.7 Docs and inventory

- `packages/components/docs/confirm-dialog.mdx` — `## Keyboard`: add "A
  confirmation mounted together with the dialog it belongs to still owns focus
  and the top layer: Cancel holds focus, and one Escape closes only the
  confirmation and returns focus to the dialog (plan 730)." `## Verification`:
  `(10 tests)` → `(13 tests)` and name the three cases.
- `packages/components/docs/dialog.mdx` — `## Keyboard`: after the plan-728
  paragraph, add "Nesting, not open order, decides which layer a key reaches: a
  modal opened in the same commit as the dialog around it is still the top
  layer, and closing it returns focus to the enclosing surface (plan 730)."
  `## Verification`: keep `21 tests` (no new dialog cases).
- `packages/components/docs/drawer.mdx` — the same one-sentence note in
  `## Keyboard`, and `(17 tests)` → `(18 tests)` with the new case named in
  `## Verification`.
- `/docs/component-api.md` §4 — after the Tab-ownership sentence, one paragraph:
  "Layer order is nesting order: a modal's dismiss layer and initial focus rank by
  how deeply it is nested in modal surfaces, with open order only breaking ties
  between siblings (`Dialog`, `Drawer`, plan `730`)."
- `COMPONENTS.md` — **Dialogs** row: add "layer and focus order follow nesting,
  so a modal mounted with its dialog is still topmost (plan 730)" after the
  dismiss-stack sentence; keep `21 native behaviour tests`. **Confirmation
  dialogs** row: `10 native behaviour tests` → `13`, and add the same-commit
  sentence. **Drawers** row: `17` → `18` and the nesting sentence.
- `TODO.md` — tick **both** unticked rows under "Tier 2 hardening after the
  inventory closed" with one bullet naming plan 730 and the measured numbers;
  replace the two rows rather than appending a third.
- `PLAN.md` D30 — append "the modal nesting-order plan takes `730`" to the
  running numbering sentence.
- `.agents/slop/plans/README.md` — add the row in numeric order after `728`.

## 4. Test plan

Run from `packages/components`.

1. **Scoped behaviour, before the fix** (proves the regression exists):

   ```sh
   nub exec vitest run --config vitest.behaviour.config.ts \
     src/behaviour/confirm-dialog.test.tsx src/behaviour/drawer.test.tsx
   ```

   Expected at `HEAD`: confirmation 10/13 (the two new same-commit focus/escape
   cases and the trap case fail: `outer-content` / both closed / closed), drawer
   17/18 (the new case fails). Record the exact assertion messages.

2. **Pure stack, before the fix:**

   ```sh
   nub exec vitest run src/internal/dismiss-layer.test.ts
   ```

   Expected at `HEAD`: 8 passed / 3 failed (the deeper-layer case and
   `hasDeeperLayer` do not compile until §3.2; add the test bodies after the
   stack change and instead capture the owner-order failure by temporarily
   removing the depth comparison — record which case that flips).

3. **After the fix** — the same two commands. Expected: confirmation 13/13,
   drawer 18/18, dismiss stack 11/11.

4. **Mutation proofs** (each restored afterwards):

   - drop the depth comparison in `dismissTopLayer` (back to `Arr.last`) → case
     1 of §3.6.1 and both same-commit Escape cases fail;
   - remove `if (hasDeeperLayer(...)) return;` from `useModalFocus` → both
     same-commit entry cases fail with `outer-content` / `drawer-content`;
   - remove the `enclosing` fallback in the cleanup → the two close cases fail
     with `focusedTestId` `none`.

5. **Neighbour suites** (shared rules):

   ```sh
   nub exec vitest run --config vitest.behaviour.config.ts \
     src/behaviour/dialog.test.tsx src/behaviour/popover.test.tsx \
     src/behaviour/dropdown-menu.test.tsx src/behaviour/command-menu.test.tsx
   ```

   Expected: the same counts as at `HEAD` (Dialog 21, Popover 26, Dropdown 56,
   Command menu 24 — the recorded plan-540 placement/focus failures only).

6. **Native smoke, scoped:**

   ```sh
   nub apps/playground/dist/smoke/run.js --only modal-focus-trap
   nub apps/playground/dist/smoke/run.js --only overlay-dialog
   ```

   Expected: both `ok` (the suite's three pre-existing capability failures —
   layout, focus, floating — are unrelated and unchanged). Record the ids.

7. **End-of-task gates** (cross-cutting change — the shared modal rule):

   ```sh
   nub run check
   nub run lint
   nub run test
   nub run --filter @gpuixui/components test:behaviour
   ```

   All three gates exit `0`; the full behaviour suite's only failures are the
   recorded plan-540 binding classes (908/28 of 936 before this change). Record
   the new totals in the plan index. Do not run the live suite or `--all`.

## 5. STOP conditions

- Stop and report if the same-commit focus case does **not** fail at `HEAD` with
  `outer-content`: the fixture is not nested, or the binding order changed.
- Stop if a bare `Dialog` inside `DialogContent` throws from `assertParts` — use
  the `ConfirmDialog` fixture; do not loosen the parts contract.
- Stop if `hasDeeperLayer` changes Dialog, Drawer, Popover, menu or command-menu
  counts beyond the recorded plan-540 failures: it must only suppress the focus
  of an **enclosing** modal.
- Stop if `getFocusedElementId()` reports an id whose `getElement` has no
  `testId` in the close case — measure before weakening an assertion; the
  surface carries its own `testId` by contract.
- Do not touch the claim, the Tab trap, motion, the parts tree, or non-modal
  overlays' push depth.

## 6. Acceptance

- `internal/modal-host.tsx` exists; `dismiss-layer.ts` orders by depth with open
  order as the tie-break; `modal.ts` gates focus entry and falls back to the
  enclosing surface; `Dialog` and `Drawer` publish the host at root and surface.
- The three pure cases and four native cases fail before the fix and pass after;
  the later-opened confirmation cases (plan 728) still pass.
- Docs, `docs/component-api.md`, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and
  the plan index are synced; `COMPONENTS.md` counts match the suites.
- `nub run check`, `nub run lint`, `nub run test` exit `0`; the full behaviour
  suite shows no new failure class.
- Committed on `agent/components` in small commits (plan, implementation, docs)
  and pushed.
