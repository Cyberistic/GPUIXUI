# 318 — Color picker: discrete swatches and HEX

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §2 (A15), `310` (keycaps in the docs examples) |
| Status | planned |
| Source | `COMPONENTS.md` → Tier 2 → Color picker; plan `205` A15 |

This plan is self-contained. It adds `ColorPicker` at the Tier 2 bar — **as a
discrete picker**, because the saturation/value square is not expressible.

---

## 1. Why and the honest limitation

A colour picker's centrepiece is normally a saturation/value square, built from
two gradients (white→hue horizontally, transparent→black vertically). GPUix
0.10.0 supports **two-stop linear gradients only** and no radial gradients, so
the square cannot be drawn truthfully. A fake square would be a decorative
placeholder, which the rules forbid.

The strongest honest picker is:

- a **swatch grid** of discrete colours (keyboard reachable, `role="button"`);
- a **HEX field** for any colour the grid does not hold;
- a **preview** swatch showing the current value.

No alpha, no HSL/RGB numeric fields in v1, no eyedropper. Record all three as
limitations with the gradient evidence.

## 2. The target API

```tsx
<ColorPicker
  label="Accent colour"
  value={accent}
  onValueChange={setAccent}
  swatches={["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"]}
/>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `ColorPicker` | value, validation of typed HEX, swatch grid, preview | `label` (required), `value?`, `defaultValue?` (default `"#000000"`), `onValueChange?`, `swatches?` (default: the theme's `primary`, `secondary`, `accent`, `muted`, `destructive`, `foreground`), `disabled?`, `style?: StateStyle<ColorPickerState>` |

`ColorPickerState` is `{ readonly disabled: boolean; readonly valid: boolean }`.

- **Value is a hex string**, normalised to lowercase `#rrggbb` on commit.
  `#rgb` and bare `abc` are accepted as shorthand and expanded. A value that is
  not valid hex is kept in the field while typing but is **not** committed; the
  field shows a `destructive` border and `aria-description="Invalid hex colour"`
  (0.10.0 supports `aria-description`, verified). `onValueChange` fires only on
  a valid commit (Enter/blur) or a swatch press.
- **Swatches** render as `role="button"` squares with an `aria-label` of the hex
  value and `aria-selected` when equal to the current value. Each is a tab stop
  in declaration order (the grid is small; roving focus is unnecessary).
  Selected swatches show a `focusRing`-style edge; unselected ones a `border`.
- The default swatches come from the theme, so a custom theme changes them.

### Logic (`src/color/hex.ts`)

- `normalizeHex(input): Option<string>` — accepts `#rgb`, `rgb`, `#rrggbb`,
  `rrggbb` (case-insensitive), returns the lowercase 6-digit form; `None` for
  anything else (including 8-digit alpha — unsupported in v1).
- `isHex(value): boolean` — `Option.isSome(normalizeHex(value))`.
- Unit-tested; no `Date`, no `Math.random`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/color/hex.ts` | **create** |
| `packages/components/src/color/hex.test.ts` | **create** — 8 unit tests |
| `packages/components/src/color-picker.tsx` | **create** — one part, `colorPickerMeta` |
| `packages/components/src/index.ts` | add `export * from "./color-picker.js";` |
| `packages/components/src/inventory.ts` | import and list `colorPickerMeta` |
| `packages/components/src/behaviour/color-picker.test.tsx` | **create** — 8 native tests |
| `packages/components/examples/color-picker.example.tsx` | **create** — pick an accent, preview it on a Badge |
| `packages/components/docs/color-picker.mdx` | **create** — the gradient limitation with evidence |
| `docs/component-api.md` | add Color picker to the built table (one part) |
| `COMPONENTS.md` | row → `done` / `partial`, 8 native + 8 unit tests, the limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test             # expected: hex logic 8
nub run --filter @gpuixui/components test:behaviour   # expected: ColorPicker 8
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- a swatch grid cannot paint a background per swatch (it can: `backgroundColor`
  is a supported style value) — if not, stop, do not substitute an image;
- `aria-selected` on a `role="button"` is dropped from the dump — keep the
  visual ring and record that selection is not announced; never invent
  `aria-checked`;
- an alpha channel is requested — v1 refuses it (8-digit hex is `None`), by
  design; a future plan may add a second control but consumes a token interlock.

## 6. Test plan

`src/color/hex.test.ts`:

1. `#ABC` → `#aabbcc`;
2. `abc` → `#aabbcc`;
3. `#aabbcc` unchanged;
4. `#AABBCC` → lowercase;
5. `#abcd` (4-digit) → `None`;
6. `red`, `#gggggg`, empty → `None`;
7. whitespace around a valid value is trimmed;
8. `isHex` agrees with `normalizeHex`.

`src/behaviour/color-picker.test.tsx`:

1. renders the label, the current swatch selection and the HEX field;
2. the default swatches come from the theme (six);
3. pressing a swatch calls `onValueChange` with its hex and marks it selected;
4. typing a valid hex and pressing Enter commits and normalises it;
5. typing an invalid hex marks the field destructive and does not commit;
6. blur commits a valid draft and restores the committed value for an invalid
   one;
7. disabled: no tab stops, no commits;
8. a consumer `style` wins, and both themes paint the surface roles.

**Both directions.** Commit on every keystroke: unit test 6 and native test 5
fail. Never mark the selected swatch: native test 3 fails. Restore after each.

## 7. Acceptance criteria

- One part with JSDoc, an exported `ColorPickerState`, and the pure hex module.
- Eight native + eight unit tests, both themes, no literal colours.
- The docs state the saturation-square limitation with the two-stop-gradient
  evidence and name the strongest alternative that was shipped.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.
