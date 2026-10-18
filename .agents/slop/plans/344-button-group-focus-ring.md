# 344 — An attached `ButtonGroup` paints its focus ring where you can see it

**Status:** done · **Phase:** F · **Owner:** primitives
**Depends on:** 030, 041, 078, 084, 089, 096, 332

## 1. The defect (measured 2026-10-18)

`ButtonGroup` in `attached` mode rounds and clips the **group**
(`packages/primitives/src/components/ButtonGroup.tsx` sets `overflow: "hidden"`),
because the runtime has no `:first-child`/`:last-child` and the group may not
clone its children. That is correct for the shape (plan `078`). It is wrong for
focus:

- the focus ring is `focusRing(theme)`: a zero-offset, zero-blur `boxShadow`
  with `spreadRadius: 2`. It paints **outside** the control's border box;
- an attached group's box is exactly its buttons' union — no padding — so every
  focused button's ring lies outside the clip.

Probe (`TestRenderer`, 1280×800, `Surface` frame, two attached buttons):

```
group  bounds { x: 12, y: 12, width: 1256, height: 32 }
"one"  bounds { x: 12, y: 12, width:  45, height: 32 }   ← flush top/left/bottom
"two"  bounds { x: 57, y: 12, width:  45, height: 32 }   ← starts at one's right edge
"one"  style.boxShadow { offsetX: 0, offsetY: 0, blurRadius: 0,
                         spreadRadius: 2, color: "#000018", inset: false }
```

So a focused first button's ring is clipped on three sides, and its right band
is painted under the next sibling (later tree order). A focused middle button
shows at most a 2 px line on one edge. Keyboard users cannot see which button
in an attached group they are on — a regression of the focus law in
`COMPONENTS.md` ("paint exactly one ring, inside the control").

## 2. The fix — one inset ring overlay, from the same helper

Keep the group's clip. When a button is inside a clipped group, paint the ring
on an **absolutely positioned child** that covers the button; the child draws
the ring as an **inside border** whose width and colour are read from
`focusRing(theme)` — so the ring geometry still has one owner (plan `099`).

```
button (position: relative, clipped by the group)
└── div  position: absolute, inset 0,
     borderWidth = focusRing.boxShadow.spreadRadius,
     borderColor = focusRing.boxShadow.color,
     pointerEvents: none
```

An inside border paints entirely within the overlay's box, which is the button's
box, so the group's clip cannot reach the visible band. **Why not reuse the
shadow itself on the overlay:** an element with no background lets its own
box-shadow's interior show through, which would paint a filled block over the
button; the button's opaque surface is what normally leaves only the spread
band visible. The border is the honest way to draw the same ring inside.

No layout changes: the overlay is absolute, so the button's box, label position
and neighbours stay put.

Rules:

- clipped group + focused + not disabled → the button paints **no** `boxShadow`;
  the overlay paints the ring. A disabled control paints neither (plan `332`).
- clipped group, not focused → no overlay.
- separated group (or no group) → unchanged: the button itself paints
  `controlFocusStyle`'s shadow.
- the ring width/colour still come from `focusRing`; nothing builds a shadow or
  a ring colour by hand (the `token-helpers` guard).

## 3. Files and exact edits

### 3.1 `packages/primitives/src/core/style.ts`

Next to `controlFocusStyle` add:

```ts
/**
 * The same focus ring, drawn **inside** a clipped surface.
 *
 * An attached `ButtonGroup` clips at its buttons' outer edge, so a ring painted
 * outside a button is cut away by the group (plan `344`). This overlay covers
 * the button and draws the ring as an inside border — the shadow helper cannot
 * be reused directly, because a transparent element lets its shadow's interior
 * show through as a filled block. The width and colour still come from
 * `focusRing`, so the ring has one definition. Absolute, so it takes no layout
 * space.
 */
export const clippedFocusRingStyle = (theme: PrimitiveTheme): StyleDesc => {
  const ring = focusRing(theme).boxShadow;
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: ring.spreadRadius,
    borderColor: ring.color,
    pointerEvents: "none",
  };
};
```

`focusRing` is already imported in this module.

### 3.2 `packages/primitives/src/core/index.ts`

Export `clippedFocusRingStyle` beside `controlFocusStyle` (same export block).

### 3.3 `packages/primitives/src/components/Button.tsx`

1. Import `clippedFocusRingStyle`.
2. `renderButton(props, theme, focus, clipped = false)` — document the fourth
   argument: *"the surrounding group clips its surface, so the ring moves inside
   the button (plan 344)."*
3. Base style: when `clipped`, merge `{ position: "relative" }` into
   `controlStyle(spec, theme)` **before** the caller's `style`.
4. Ring decision:
   ```ts
   const showRing = focus.focused && props.disabled !== true;
   ```
   - `clipped && showRing` → button style gets **no** shadow; render the overlay
     as the last child.
   - `!clipped && focus.focused` → the existing `controlFocusStyle` merge.
   - `clipped` → no `controlFocusStyle` merge at all (the overlay owns it).
5. The `Button` component passes `Option.isSome(shape)` as `clipped`. Do not
   change `GroupShapeContext` — `Some` already means "attached".

Overlay child (last child, after `trailing`):

```tsx
{clipped && showRing ? <div style={clippedFocusRingStyle(theme)} /> : null}
```

The overlay has no role and no label, so it creates no accessibility node.

### 3.4 `packages/primitives/src/components/Button.test.tsx`

Two element-tree tests (use `elementChildren`, `hostStyleRecord`):

1. **clipped + focused** — the button's own style has no `boxShadow`, and one
   child carries `borderWidth === focusRing(testTheme).boxShadow.spreadRadius`,
   `borderColor === focusRing(testTheme).boxShadow.color`,
   `position: "absolute"` and zero insets.
2. **clipped + resting / not clipped + focused** — no overlay child when
   resting; a *non*-clipped focused button keeps the shadow on the button and
   has no overlay. (This is the old-behaviour guard.)

### 3.5 `packages/primitives/src/core/style.test.ts`

One test for `clippedFocusRingStyle`:

- `borderWidth` equals `focusRing(testTheme).boxShadow.spreadRadius`;
- `borderColor` equals `focusRing(testTheme).boxShadow.color` (one owner);
- all four insets are `0`, `position: "absolute"`, `pointerEvents: "none"`;
- no `boxShadow`, `width` or `height` of its own.

### 3.6 `packages/primitives/runtime/controls.runtime.test.tsx`

Add after the existing `ButtonGroup` gap test:

1. **"paints an attached group's focus ring inside the clip"** — mount
   `<ButtonGroup mode="attached">` with two buttons, `focusNext()` to the first,
   then assert:
   - the group's and the first button's boxes are flush on top/left/bottom
     (`top`, `x`, `height` equal), the measured reason an outer ring is clipped;
   - the button's `style.boxShadow` is `undefined`;
   - exactly one element inside the button is `position: "absolute"`; its
     `borderWidth`/`borderColor` are `focusRing`'s spread and colour, and its
     bounds are the button's box (the band is inside the clip).
2. **"keeps the outer ring for a separated group"** — same tree with
   `mode="separated"`: the focused button itself paints the `boxShadow` and no
   inset overlay exists.

### 3.7 `packages/primitives/runtime/focus-ring.runtime.test.tsx`

Add one standalone case after the `it.each` matrix:

- "paints the ring inside a button that an attached group clips" — the clipped
  button has no shadow, exactly one `position: "absolute"` element with
  `borderColor === RING.color` sits inside it, with `borderWidth ===
  testTheme.borderWidth.strong`, and `isWithin` holds.

The matrix's per-control rows stay unchanged (a standalone control still paints
the one shadow ring).

### 3.8 Docs, inventory, TODO

- `packages/primitives/docs/button-group.mdx`: a **Focus** paragraph (the clip
  would swallow an outer ring; the ring is an inset overlay with the same
  tokens) and the verification list gains the two tests; the Limitations section
  states the ring is drawn just inside the button rather than around it.
- `packages/primitives/docs/button.mdx`: one sentence in **Accessibility** —
  inside an attached `ButtonGroup` the ring is painted inside the button, for
  the reason above.
- `packages/primitives/README.md`: add the rule to the focus row/capability
  table, refresh the stale measured counts (offline **41 files / 557 tests**,
  runtime count after the new tests), and mention the inset ring in the
  verification narrative.
- `COMPONENTS.md`: the **Button groups** row records the defect, the measured
  geometry and the fix; the runtime count sentence is refreshed.
- `TODO.md`: add and tick one primitives task for plan `344`; keep the progress
  bar at the true count.
- `.agents/slop/plans/README.md`: add the row for plan `344` in the primitives
  block.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# expected: 41 files / 559+ tests pass (2 element-tree + 1 core test added)

nub run --filter @gpuixui/primitives test:runtime
# expected: every runtime file passes; controls.runtime +2, focus-ring.runtime +1

nub run check
nub run lint
nub run test
# expected: all green
```

## 5. Both-direction proof (required before "done")

- **Without the fix:** make `renderButton` ignore `clipped` for the ring (merge
  `controlFocusStyle` as before and drop the overlay). The runtime test in §3.6
  fails on "the button's own `boxShadow` is undefined"; the matrix case fails
  for the same reason; the element test fails on the missing overlay.
- **With the fix:** all of the above pass.
- Record both outcomes in §7 of this plan before committing.

## 6. STOP conditions

- If the runtime reports the overlay's bounds **outside** the button's box, stop:
  absolute insets do not resolve the way the plan assumes. Report the measured
  boxes and do not ship a border-based substitute without a new plan.
- If adding the overlay changes the button's bounds, its label position or a
  neighbour's position, stop: the overlay is taking layout space.
- If GPUix paints no border on an absolutely positioned child (no ring visible),
  stop and report — the quoted workaround is the only one this plan authorises.
- Do not change `ButtonGroup`'s clip, per-button radius or the group's geometry
  to make room for an outer ring: that re-opens plan `078`'s notch.

## 7. Result (2026-10-18)

Implemented as §2–§3, with one correction found while checking the design: the
overlay draws the ring as an **inside border**, not a shadow. A transparent
element lets its own box-shadow's interior show through, so the "shadow on the
overlay" idea would have painted a filled ring-coloured block over the button;
the button's opaque surface is what normally hides the shadow's interior. The
border's width and colour are read from `focusRing`, so the ring still has one
definition (`src/core/token-helpers.test.ts` stays green).

Measured (real `TestRenderer`, 2026-10-18):

- the overlay's bounds equal the button's box and its border is inside it, so
  the group's `overflow: hidden` cannot clip the band — the runtime assertion
  `ringBounds ≈ one bounds` passes;
- the button's bounds are **identical before and after focus**, so the overlay
  takes no layout space;
- the button's own `boxShadow` is `undefined`; the overlay carries
  `borderWidth: 2` and `borderColor: "#000018"` (the fixture's `ring` role);
- a separated group's focused button keeps the outer
  `{ spreadRadius: 2, color, inset: false }` shadow and paints no overlay;
- the label, the button's bounds and the neighbour's position are unchanged
  (the overlay is absolute).

Both directions: with `renderButton` reverted to ignore `clipped` for the ring,
**3 tests fail** — the element test on the button's `boxShadow`, the attached
runtime case on the same, and the new matrix case; restored, all pass.

Suites: `nub run --filter @gpuixui/primitives test` → **41 files / 560 tests**;
`test:runtime` → **23 files / 386 tests**.
