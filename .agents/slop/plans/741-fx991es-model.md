# 741 — The fx-991ES Plus model: every mode, key and command

| Field | Value |
| ----- | ----- |
| Owner | `calculator` workstream |
| Depends on | 740 |
| Blocks | 742 |
| Status | in progress |

## Source of truth

`fx-570ES_991ES_9910NG_PLUS_EN.pdf` (Casio, 2024 printing, © 2019), downloaded
from the URL in the request. The 8 calculation modes in the manual are COMP,
CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR. **VERIFY is not in this model's
manual**; it belongs to later models and is therefore not faked. It is listed in
the app's capability panel as absent, with the page citation.

## Feature inventory to implement

1. **Display**: two-line input/result, indicators SHIFT, ALPHA, M, STO, RCL,
   STAT, CMPLX, MAT, VCT, Deg/Rad/Gra, FIX, SCI, Math, history, Disp.
2. **Setup**: MthIO-MathO / MthIO-LineO / LineIO; Deg/Rad/Gra; Fix 0–9; Sci
   0–9; Norm 1/2; d/c vs mixed; a+bi vs r∠θ; STAT FREQ on/off; decimal dot vs
   comma; contrast (maps to display opacity in the app, documented); reset
   Setup / Memory / All with confirmation.
3. **Keypad**: SHIFT, ALPHA, replay pad, MODE/SETUP, ON; CALC, ∫, x⁻¹, log_ab,
   ln, (−), °′″, hyp, sin, cos, tan; RCL, ENG, (, ), comma, M+, x², x³, x^, √;
   7 8 9 DEL AC; 4 5 6 × ÷; 1 2 3 + −; 0 . ×10ˣ Ans =. Every key carries its
   primary, SHIFT and ALPHA legend.
4. **Memory**: Ans, M, A, B, C, D, E, F, X, Y; STO/RCL; M+/M−; clear memories.
5. **COMP**: arithmetic, fractions, mixed/improper, percent (all three manual
   forms), sexagesimal, multi-statements, engineering notation (`ENG`/`←`),
   history (200 bytes) and replay, CALC, SOLVE (Newton), 40 scientific constants,
   40 metric conversions.
6. **Function set**: π/e, trig/inverse/hyperbolic/inverse-hyperbolic, angle
   conversion, e^x/10^x, log/ln/log_ab, powers and roots, integration,
   differentiation, Σ, Pol/Rec, factorial, Abs, Ran#, RanInt#, nPr/nCr, Rnd,
   GCD/LCM (manual? not listed — omit), integer part/rounding (omit if not in
   manual), `Not`/`Neg` only in BASE-N.
7. **CMPLX**: a+bi and r∠θ input/result, i, ∠, Conjg, arg, Abs, real/imag
   commands, format override commands (`a+bi`, `r∠θ`), 15-digit precision.
8. **STAT**: 1-VAR and 7 paired regressions (A+BX, _+CX², ln X, e^X, A•B^X,
   A•X^B, 1/X); X/Y/FREQ editor with row limits; Sum, Var, Reg, MinMax, Distr
   menus; P(), Q(), R(), t; estimated x̂/x̂₁/x̂₂/ŷ.
9. **BASE-N**: DEC/HEX/BIN/OCT, 16-bit binary and 32-bit others, two's
   complement, and/or/xor/xnor/Not/Neg, per-value `d/h/b/o` tags, result base
   conversion.
10. **EQN**: 2×2 and 3×3 linear, quadratic, cubic; coefficient editor; multiple
    solutions; complex roots; deterministic ordering as the manual's examples.
11. **MATRIX**: MatA/B/C and MatAns, 1×1..3×3, Matrix Editor, Dim/Data, +, −,
    ×, scalar, det, Trn, inverse, Abs, square/cube, dimension errors.
12. **VECTOR**: VctA/B/C and VctAns, 2D/3D, editor, +, −, scalar, dot, cross,
    Abs, angle between vectors via the manual's formula.
13. **TABLE**: f(x) with X, Start/End/Step prompts (defaults 1/5/1), max 30
    rows, Insufficient MEM, view-only table.
14. **Errors**: Math, Stack, Syntax, Argument, Dimension, Variable, Can't Solve,
    Insufficient MEM, Time Out — each with the manual's cause copied into the
    app's error detail.

## Model shape

`src/models/fx991es.ts` exports `fx991es: CalculatorModel`:

- `modes`: the 8 mode ids with labels and menu index (1–8).
- `keypad`: grouped rows, each key `{ id, primary, shift?, alpha?, spans?,
  tone? }`. The app paints exactly this table; it does not hard-code a second
  layout.
- `capabilities`: every feature above `true`; `verify: false` with reason.
- `catalog`: the complete searchable command list (mode switches, every
  function, every setup item, every editor action, constants 01–40, conversions
  01–40). Each entry has `id`, `label`, `group`, `keywords[]`, `insert?`,
  `command?`, `mode?`.

## Keyboard map

Physical computer keys map to model keys in `input/keyboard.ts`:

- digits/`.`/`+`/`-`/`*`/`/`/`^`/`(`/`)`/`,`; `enter` = `=`, `escape` = AC,
  `backspace` = DEL, arrows = replay; `s`→sin, `c`→cos, `t`→tan, `l`→ln,
  `g`→log, `r`→√, `p`→π, `e`→e, `x`→X, `a`–`f`→variables, `m`→M, `!`→x!,
  `%`→%, `_`→(−). With ALPHA active, letters insert their ALPHA legend.
- Chords: ⌘K palette, ⌘1..⌘8 mode, ⌘⇧L theme, ⌘⌫ clear all (AC long-press
  equivalent), ⌘Z undo (history), ⌘[ / ⌘] history back/forward.

The map is a pure function with tests, not an event handler.

## App binding

The example (742) renders:
- `Display` with indicators from `state` and the current input/result.
- `Keypad` from `model.keypad`, with pressed state and SHIFT/ALPHA latches.
- `Workspace` inspectors driven by `session` substate.
- `CommandPalette` from `catalog` + app commands.

No feature is presented as a working key unless `press` handles it and a test
exists.

## Test plan

The model suite in 740 covers calculations. This plan adds:

- `models/fx991es.test.ts`: the model exposes all 8 manual modes; every key has
  a unique id; every catalog entry resolves to a handler or an insert token;
  the capability panel marks VERIFY absent with a reason; keypad rows render
  within the app's six-column budget.
- `input/keyboard.test.ts`: every mapped computer key produces its key id;
  shifted/alpha variants; chords do not produce a calculator key.
- Manual example tables: one `it.each` per mode, with the manual's page number
  in the case name, so a reader can check it.

Commands and expected results are the same as 740.

## STOP conditions

- A manual example that cannot be reproduced exactly is moved to the
  limitations list with the input, expected and measured values. It is not
  silently dropped.
- If the manual contradicts itself (e.g. the sexagesimal marker spacing), the
  worked example wins and the note is recorded.
