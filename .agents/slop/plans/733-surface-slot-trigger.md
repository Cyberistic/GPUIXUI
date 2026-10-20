# 733 — A focusable `Surface` must accept the slot trigger contract

| Field | Value |
| ----- | ----- |
| Status | done — fixed and measured (see §6) |
| Phase | C/F (Tier 1 completeness) |
| Owner | primitives |
| Depends on | `030`, `041`, `071`, `341`, `345`, `399b`, `696` |
| Feeds | `packages/data-grid` chart surfaces, media frames, any raster leaf that needs a description |

`docs/tooltip.mdx` states the contract a trigger must meet: **"The child must be
a single focusable element with a role and a name"**, and **"Every single-root
focusable Tier 1 control accepts that contract"**. `Surface` (plan `696`) is a
Tier 1 part in `src/contract.test.ts`'s parts table, and with `tabIndex` set it
is exactly that: one focusable root, `role="group"`, `aria-label` from `label`.
It declares no `TriggerHandlers` at all, so GPUix's `asChild` clone stops at the
component boundary — the same class plans `341`, `345` and `399b` fixed for the
button family, the field family and `ScrollArea`.

The consequence is not cosmetic: a chart surface cannot carry a hint
(`aria-description`) and a `Tooltip` around it is dead on both paths. A surface
is the natural trigger for "what is this chart?" — a raster leaf with no interior
accessibility tree.

---

## 1. Measured facts this plan relies on

Measured on this worktree, 2026-10-20, against the store's release-tag
`@gpuix/native@0.10.0` binding, in the real `TestRenderer`.

1. **The clone stops at the boundary.** `TooltipTrigger asChild` clones the child
   with `onMouseEnter`/`onMouseLeave`/`onMouseMove`/`onKeyDown`/`onKeyUp`,
   `aria-description` and `ref` (`@gpuix/react@0.10.0`, `renderSlot`). `Surface`
   declares none of them, so the host div receives none. Nothing in this
   workstream has a `Surface`-inside-`Tooltip` case.
2. **A focusable Surface is a real single-root control.** `renderSurface` sets
   `role="group"`, `aria-label` and `tabIndex` on the host div when the label is
   real and `tabIndex` is present; the runtime paints and focuses that host (the
   existing case "routes native focus into the adapter when the host is a tab
   stop"). A static surface stays one named image and must **not** become a
   trigger — a hover-only tip on a node with no focus path is the D49 defect.
3. **The raster child does not block the pointer.** The `<img>` is
   `width/height: 100%` of the host, but measured, the runtime still delivers
   the slot's `onMouseEnter` to the host div — so a focusable surface can be
   both a hover and a keyboard trigger. (This corrected the plan's first
   hypothesis; the runtime case pins it.)

**STOP** if a raw `<div role="group" tabIndex={0} aria-label>` inside a
`Tooltip` does not open on `focusNext` — then the problem is the wrapper, not
this component, and this plan is void. **STOP** if forwarding the passive
handlers makes the pointer path open the tip (the image does not swallow the
hit test on this build): record that measurement instead of claiming the
keyboard-only limit. **STOP** if extending `SurfaceProps` with `TriggerHandlers`
produces a TypeScript conflict with `ref`, `style`, `testId` or `tabIndex`.

---

## 2. The fix: one host, one slot

Files: `packages/primitives/src/components/Surface.tsx`,
`packages/primitives/src/components/Surface.test.tsx`.

1. `SurfaceProps extends TriggerHandlers` (the package's standard slot type:
   `ref`, passive mouse handlers, key handlers, focus/blur). Add one documented
   prop:
   ```ts
   /** Extra description announced after the name. A slot (a `Tooltip`) writes the tip here. */
   readonly "aria-description"?: string;
   ```
2. `RenderSurfaceProps` gains the slot seam, so the pure renderer can be tested
   without a window:
   ```ts
   readonly slot?: Omit<TriggerHandlers, "ref">;
   readonly description?: string;
   ```
   In `renderSurface`, gate **both** on the same condition the tab stop uses
   (`focusTab !== undefined`, i.e. a real name **and** a `tabIndex`):
   - spread `passiveTriggerHandlers(slot ?? {})` on the host div;
   - set `aria-description={ariaName(description)}`;
   - leave a static surface untouched (no handlers, no description, no tab
     stop) — the D49 rule: a node with no focus path is not a trigger.
3. In `Surface`, compose the caller/slot `ref` with the component's focus ref:
   `elementRef = composeRef(props.ref, focus.ref)`; compose
   `props.onFocus`/`props.onBlur` with `focus.onFocus`/`focus.onBlur`; pass
   `props.onKeyDown`/`props.onKeyUp` through unchanged (the surface owns no
   interior key contract); pass `slot={props}` and
   `description={props["aria-description"]}` to `renderSurface`.
4. Keep every lifecycle rule unchanged: the session gate, bounds/mode/revision
   effects, the focus adapter call and the error reporting. This plan adds a
   contract, not a second lifecycle.

No other source file. Do **not** make `Box` a trigger (D35) and do **not** add
`onClick` to `Surface` — the raster interior is still not interactive.

---

## 3. Docs and inventory

| File | Change |
| ---- | ------ |
| `packages/primitives/docs/surface.mdx` | §API gains `aria-description`, `ref` and the event props (name the slot contract in prose, as the other trigger pages do); §Usage gains a `Tooltip`-around-a-focusable-Surface example; §Limitations records the measured hover limit (the raster child owns the pointer) and points at the Tooltip page; §Verification lists the new cases |
| `packages/primitives/docs/tooltip.mdx` | the trigger table gains `Surface` (focusable + labelled): hover **no**, keyboard focus **yes**; the prose names it beside `ScrollArea`'s hit-testing limit |
| `COMPONENTS.md` | the Surface row records "slot trigger when focusable" and the measured hover limit; the Tooltips row's trigger list mentions `Surface` |
| `.agents/slop/plans/README.md` | index this plan in the `020–049` primitives table (the 700-series rows live there) |
| `TODO.md` | add the task under the primitives workstream, then tick it with the measured counts |

`packages/primitives/src/contract.test.ts` needs no new row: `Surface` is already
in the parts table, and `TriggerHandlers` is exempt from the API-row rule (one
slot contract, documented once on the trigger pages). `aria-description` **is**
declared on the props type, so `surface.mdx`'s `## API` table must name it or
the contract suite fails — that is why §3 changes the page.

---

## 4. Test plan

### 4.1 Element tree (`src/components/Surface.test.tsx`)

Two cases against `renderSurface` (no binding needed):

1. A focusable surface (`label="Revenue"`, `tabIndex={0}`) receives
   `onMouseEnter`, `onMouseLeave`, `onKeyDown` and `aria-description` on the
   **host** div, while the inner image stays decorative (`alt` absent).
2. A static surface (`label="Revenue"`, no `tabIndex`) receives **none** of
   them, even when the same slot is passed — the D49 gate. This is the
   both-directions case: it fails if the spread is made unconditional.

### 4.2 Runtime (`runtime/surface-trigger.runtime.test.tsx`, new file)

One fresh window per case, the `openWindow` fixture, a recorder adapter from
`surface.runtime.test.tsx` (create/resize/setVisible/setTheme/destroy, no
pixels). The tree is `Tooltip` → focusable `Surface` with `tabIndex={0}` and
`label="Revenue"`.

1. **Keyboard opens.** `runtime.focusNext()`, `flush`, `awaitFrame` on the tip's
   text (`TIP` painted), assert `runtime.focused()` is `"target"` and the
   `Revenue` accessibility node's `description` is `TIP`. Without the fix the
   ref/handlers never reach the host, so the tip never paints — this is the
   failing direction.
2. **Hover is measured, not assumed.** `runtime.hover("target")` and assert the
   measured result. Expected: no tip (the full-size `<img>` owns the pointer);
   if the build paints it, assert that and change the page's claim instead of
   shipping a false limitation.
3. **Static surface is not a trigger.** The same tree without `tabIndex`: no
   focus stop (`focusNext` on the only element does not land on it) and no tip
   on hover. This pins the gate.

### 4.3 Both-directions proof

- Remove the `passiveTriggerHandlers` spread: case 4.1.1 and 4.2.1 fail.
- Remove the `focusTab` gate: case 4.1.2 fails (and case 4.2.3 if the static
  surface then accepts the slot).
- Remove the `aria-description`: case 4.2.1's description assertion fails.
- Record each failure in §8.

### 4.4 Commands

```sh
nub run --filter @gpuixui/primitives test src/components/Surface.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/surface-trigger.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/surface.runtime.test.tsx runtime/overlay-trigger.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
nub run lint
```

Expected: the first three green with the new counts; the offline suite unchanged
plus the new cases; `check-types` and `lint` exit `0`. `nub run check` may still
stop at `fmt` on `apps/docs/src/components/docs/demos.tsx`, a pre-existing file
outside this workstream (recorded in `TODO.md`).

---

## 5. Acceptance

- [x] A focusable, labelled `Surface` inside a `Tooltip` paints the tip on
      keyboard focus and the group announces the tip as its description.
- [x] A static surface stays a named image with no handlers and no tip.
- [x] The hover behaviour is **measured**, and the page states what the build
      does (expected: keyboard-only, like a `ScrollArea`).
- [x] `surface.mdx`, `tooltip.mdx`, `COMPONENTS.md`, the plan index and
      `TODO.md` state the measured rule.
- [x] Every command in §4.4 was **run**, with exact counts in §8.

---

## 6. Result

Implemented 2026-10-20.

**Files.** `src/components/Surface.tsx` (the slot type and the gated forwarding),
`src/components/Surface.test.tsx` (the element-tree case),
`runtime/surface-trigger.runtime.test.tsx` (new, 3 cases), `docs/surface.mdx`,
`docs/tooltip.mdx`, `COMPONENTS.md`, the plans index and `TODO.md`.

**One measurement changed the plan.** §1.3 expected the raster `<img>` to own
the pointer, making a surface keyboard-only. Measured in the real renderer: the
runtime **does** deliver the slot's `onMouseEnter` to the host div even though
the image fills it, so a focusable surface is both a hover and a keyboard
trigger. The page and the Tooltip table state the measured result; there is no
hover limitation to document.

**Scoped results (run, not inferred).**

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test src/components/Surface.test.tsx` | 1 file / **5 passed** |
| `nub run --filter @gpuixui/primitives test:runtime runtime/surface-trigger.runtime.test.tsx` | 1 file / **3 passed** |
| the same file + `surface` + `overlay-trigger` | 3 files / **35 passed** |
| `nub run --filter @gpuixui/primitives test` | 69 files / **941 passed** (was 940; the new element case) |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run lint` | exit `0` |
| `nub exec oxfmt --check` on every touched file | exit `0` |

The full live suite was not run: this change touches `Surface` only, and the
scoped files above are its complete runtime surface plus the trigger matrix.

**Both directions (measured).**

1. The `passiveTriggerHandlers` spread removed: the hover case fails
   (`expected false to be true`); focus and the description still pass, because
   they ride the composed `ref` and `aria-description`.
2. `elementRef: composeRef(props.ref, focus.ref)` replaced by the internal ref
   alone: the keyboard case never paints the tip and times out
   (`timed out after 2000 ms waiting for the tip paints`).
3. `description` passed as `undefined`: the tip paints but the group's
   `description` assertion fails (`expected undefined to be
   'Revenue by region'`).
4. Restored: 3/3, and the two neighbouring files stay green.

**Guard correction found by the suite.** `src/components/description.test.tsx`
requires every surface that declares `aria-description` to forward it through
the literal `ariaName(props["aria-description"])`. The first implementation
destructured `description` first, so the guard failed by file. The component now
calls `ariaName` at the prop, and `renderSurface` trims again (idempotent).
`src/docs-counts.test.ts` also caught the new runtime file: `README.md` and the
two COMPONENTS.md passages now say **63** runtime files.

**Enforcer note (intentional).** The element test's helper mirrors the optional
`tabIndex` prop (`number | undefined`); it is a component prop shape at a test
boundary, not domain data.
