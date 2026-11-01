# 743 — The fx-991ES Plus as the owner knows it

| Field | Value |
| ----- | ----- |
| Owner | `calculator` workstream |
| Depends on | 740, 741, 742 |
| Status | landed |

## Brief (owner, 2026-11-01)

"I don't like the UI at all. I want it to mimic the original calculator with the
red text etc, like the exact layout I'm familiar with, and should be able to
minimize history and what not." And: the calculator must work in the terminal.

## What changes

1. **The keypad is the real one.** `fx991es.keypad` becomes a `Keypad` with three
   sections, the device's own geometry:
   - `cluster`: SHIFT, ALPHA / CALC, ∫ on the left; MODE, ON / x⁻¹, log▫▫ on the
     right; the round replay pad between them.
   - `functions`: three rows of six small keys —
     `▫/▫ √▫ x² x▫ log ln`, `(−) °′″ hyp sin cos tan`,
     `RCL ENG ( ) S⇔D M+`.
   - `main`: `7 8 9 DEL AC`, `4 5 6 × ÷`, `1 2 3 + −`, `0 . ×10ˣ Ans =`.
   Every key carries the legends printed on the body: SHIFT in gold above-left,
   ALPHA in red above-right (e.g. `sin`: `sin⁻¹` / `D`; `7`: `CONST`; `×10ˣ`:
   `π` / `e`).
2. **SHIFT and ALPHA mean what the body says.** `session.press` resolves the
   latch first (`shiftOrAlpha`) and then dispatches, so SHIFT RCL is STO,
   SHIFT hyp is Abs, ALPHA (−) is A. `SHIFT_KEYS`/`ALPHA_KEYS` are rewritten to
   the printed legends. In CMPLX, ENG enters `i`, as on the device.
3. **The device is drawn as a device.** A graphite body with a silver face, the
   model line, a reflective grey-green LCD with dark ink and the manual's
   indicator row, small black function keys, light number keys, coloured
   DEL/AC. These are physical colours, named once in `theme.ts`; the window
   around the device follows the theme.
4. **MODE opens the device's menu.** The LCD lists `1:COMP … 8:VECTOR`; a digit
   picks, AC leaves. SHIFT MODE is SETUP (as before). SHIFT 7/8 (CONST/CONV)
   open the catalogue panel; SHIFT 1–5 open the mode's panel. The mode rail is
   removed.
5. **The panel can be minimised.** The inspector (History · Mode · Catalog) is a
   side panel with a toolbar toggle and ⌘H; closed, the window is the device.
6. **One size rule.** The device is laid out in a unit `u` chosen from the space
   it gets (`onLayout`), so a resized window and a 1024×576 terminal both fit
   the whole device.

## Files

- `packages/calc/src/model.ts` — `Keypad`, `DirectionPad`, `keypadKeys()`.
- `packages/calc/src/models/fx991es.ts` — the real table.
- `packages/calc/src/session.ts` — latch resolution, legend maps, `logab`,
  `S⇔D`, CMPLX `i`.
- `packages/calc/src/model.test.ts` — layout and legend tests.
- `examples/calculator/src/{App,keypad,display,theme,app-logic,main}.tsx?` —
  device, menu, panel toggle, terminal fit.
- `examples/calculator/src/App.native.test.tsx` — updated behaviour.

## Test plan

- Model: 2 + 3 + 4 key rows with the counts above; unique ids; every SHIFT and
  ALPHA legend either changes what the key does (checked through `press`) or is
  in the documented printed-only list.
- Session: SHIFT RCL starts a store; SHIFT hyp inserts Abs; ALPHA (−) inserts A;
  ENG in CMPLX inserts i.
- App logic: the MODE menu (open, digit picks, AC leaves); shift-digit panels.
- Native: `1 + 2 =` paints 3; MODE then 6 opens the matrix panel; the panel
  toggle removes and restores the inspector; the device fits 1024×576.
- Terminal: `nub run --filter @gpuixui/calculator terminal` in a pty with the
  1024×576 in-band resize paints the device; a pointer press reaches a key.

```sh
nub run --filter @gpuixui/calc test
nub run --filter @gpuixui/calculator test
nub run --filter @gpuixui/calculator test:native
nub run check && nub run lint && nub run test
```

## STOP conditions

- A printed legend whose function the engine lacks (mixed fraction, INS,
  DRG▸, `←` sexagesimal) stays printed and is listed as printed-only with a
  `// TODO:`; it is never wired to a different function.
- The CASIO wordmark is not drawn; the model line is.
