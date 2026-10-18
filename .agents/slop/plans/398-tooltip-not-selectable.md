# Plan 398 — An open tooltip's text is selectable

**Owner:** primitives workstream (`packages/primitives`).
**Phase:** F (chrome truth), paint-only change.
**Depends on:** 060, 071, 347, 391, 393 (Tooltip), 386 (chrome selection),
395 (InfoTip wrap).

## 1. The defect, measured

Plan `386` established the rule **chrome is not selectable** and fixed the five
surfaces that painted a raw string: `Button`, `Toggle`, `ToggleGroup`, the
`Select` trigger and its options. It missed the tooltip, whose content is also
chrome — a transient hint, not content the user can use.

`tooltipStyle` declares no `userSelect`, and the runtime root starts selectable
(`references/gpuix/.../renderer.rs`, `Inherited::root`). Measured on this host,
2026-10-19 (temporary probe, 1280 × 800 window, then deleted):

```
tooltip bounds   = { x: 19, y: 53, width: 163, height: 24 }
drag across tip  = Some("A hint that can be dragged")
```

A real drag takes the whole hint. `InfoTip` inherits the same surface, so the
info icon's explanation is selectable too.

## 2. What ships

- `tooltipStyle` declares `userSelect: "none"`: the tip is chrome, like a
  button's label. A caller who wants otherwise can still override it through
  `Tooltip.style` (merged last on the root) — the rule is a default, not a cage.
- `runtime/chrome-selection.runtime.test.tsx` gains one case: hover the
  trigger, hover the tip (to keep it open), drag across its painted line, and
  assert no selection; also assert the tip's authored `userSelect` is `"none"`.

No layout, placement or accessibility behaviour changes.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/398-tooltip-not-selectable.md` | this plan |
| `.agents/slop/plans/README.md` | index row |
| `packages/primitives/src/components/Tooltip.tsx` | `userSelect: "none"` in `tooltipStyle` |
| `packages/primitives/runtime/chrome-selection.runtime.test.tsx` | the open-tip case |
| `packages/primitives/docs/tooltip.mdx` | the chrome paragraph |
| `COMPONENTS.md` | the Tooltips row |
| `TODO.md` | one ticked row under the primitives section |

## 4. Steps

1. Confirm the probe reproduces: a `Tooltip` around a `Button`, hover the
   trigger, `runtime.hover("tip")`, then `dragSelection` across the tip's box
   returns `Some("A hint that can be dragged")`. If it returns `None`, STOP —
   someone else fixed it.
2. Add `userSelect: "none"` to `tooltipStyle`, beside the padding and type
   values it already resolves. Keep the max-width branch untouched.
3. Add the runtime case to `chrome-selection.runtime.test.tsx` (the class guard
   plan `386` created), importing `Tooltip` and reusing `dragAcross`/`styleOf`:

   ```tsx
   it("takes no text from an open tooltip", async () => {
     const runtime = await openWindow();
     runtime.render(
       <Surface>
         <Tooltip content="A hint that can be dragged" testId="tip">
           <Button testId="target" label="Explain">Hover</Button>
         </Tooltip>
       </Surface>,
     );
     runtime.hover("target");
     runtime.flush();
     runtime.hover("tip");
     runtime.flush();
     expect(dragAcross(runtime, "tip")).toStrictEqual(Option.none());
     expect(styleOf(runtime, "tip")["userSelect"]).toBe("none");
   });
   ```

4. Run the commands in §5; both directions in §5's last paragraph.
5. Docs: `tooltip.mdx` gains one line in its accessibility/theming note — the
   tip is chrome and takes no text selection; a caller can opt back in with
   `style={{ userSelect: "text" }}`. `COMPONENTS.md` Tooltips row records the
   measurement and plan `398`.
6. `TODO.md`: add and tick one row under the primitives section.

## 5. Test plan and commands

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime runtime/chrome-selection.runtime.test.tsx
nub run check
```

Expected: offline stays green (705); the scoped live file is green with one more
case; `check` green.

**Both directions:** remove `userSelect` from `tooltipStyle` and the new case
fails with `Some("A hint that can be dragged")`; restore it and the case passes.
Record both in the index row.

## 6. STOP conditions

- The drag returns `None` before the fix: stop, the plan is stale.
- Adding `userSelect` breaks a placement or wrap case: stop and report; it
  should be paint-only.

## 7. Acceptance

- An open tooltip takes no text from a real drag, and its authored style says
  `userSelect: "none"`.
- The case lives in the chrome-selection class file, so a future chrome surface
  has one place to join.
- Docs and inventory record the rule; the plan is indexed and `TODO.md` ticked.
