# @gpuixui/calc

The Effect-first calculator engine behind the [`examples/calculator`](../../examples/calculator)
app: a Casio **fx-991ES Plus** with every mode the manual documents, and a model
seam so a TI-84 is a second adapter rather than a second app.

The package renders nothing. It owns parsing, evaluation, the session state
machine, display formatting, the keypad definition, the command catalogue and the
React store seam (`@gpuixui/calc/react`). `/react` is the only file that imports
React.

```sh
nub run --filter @gpuixui/calc test
nub run --filter @gpuixui/calc check-types
```

## What is implemented

The source of truth is the Casio manual linked by the calculator workstream
(`fx-570ES_991ES_9910NG_PLUS_EN.pdf`, © 2019). The eight modes in it are:

| Mode | Feature |
| ---- | ------- |
| **COMP** | arithmetic, fractions, percent (all three forms), sexagesimal, multi-statements, engineering notation, history/replay, CALC, SOLVE, 40 constants, 40 conversions |
| **CMPLX** | rectangular and polar input/result, `i`, `∠`, `Conjg`, `arg`, `Re`, `Im`, format overrides |
| **STAT** | 1-var and 7 paired regressions, frequency, sums, means, σ/s, min/max, estimates, P/Q/R/t |
| **BASE-N** | DEC/HEX/BIN/OCT, 16/32-bit two's complement, and/or/xor/xnor/Not/Neg, per-value base tags |
| **EQN** | 2×2 and 3×3 systems, quadratic and cubic (complex roots) |
| **MATRIX** | MatA/B/C and MatAns, 1×1…3×3, + − × scalar, det, inverse, transpose, Abs, squares/cubes |
| **TABLE** | `f(x)` over Start/End/Step, 30-row ceiling |
| **VECTOR** | VctA/B/C and VctAns, 2D/3D, + − scalar, dot, cross, Abs |

Functions include trig/inverse/hyperbolic, logs, powers and roots, `∫` (15-point
Gauss–Kronrod), `d/dx` (central difference), `Σ`, `Pol`/`Rec`, factorial,
`nPr`/`nCr`, `Rnd`, `Ran#`, `RanInt#`, `Abs`.

**VERIFY is not in this model's manual.** The capability row marks it absent
with the reason instead of imitating it. A later model that has it adds
`verify: true` and its own mode.

## Architecture

```
src/
  model.ts              CalculatorModel seam: modes, keypad, capabilities, catalogue
  models/fx991es.ts     the fx-991ES Plus data: 10 keypad rows, ~220 commands
  input/token.ts        atomic input tokens (functions delete as one key)
  input-layout.ts       structural input view: fraction/radical/superscript slots + caret
  input/keyboard.ts     computer key → calculator key (pure)
  parser.ts             Casio precedence → Expr AST
  evaluate.ts           Expr → CalcValue (Effect, Random, typed failures)
  value.ts              real/rational, complex, matrix, vector, list, base
  format.ts             Norm/Fix/Sci, fraction/π/√, sexagesimal, complex, BASE-N widths
  modes/stat.ts         every STAT menu reading
  modes/eqn.ts          linear/quadratic/cubic solvers, Newton's method
  modes/table.ts        the 30-row table engine
  session.ts            CalculatorState + press/runAction
  store.ts              SubscriptionRef store for React (run* at the boundary)
  react.ts              useCalculator
```

`calculatorKeyOf` and the session are pure functions over data; the app never
re-implements a rule. The keypad is `fx991es.keypad`, so a model replacement
paints its own keys without an app change.

### Why mathjs is the number type, not the syntax

`mathjs` supplies `Fraction` and exact arithmetic. Its **parser is not used**:
Casio input has its own precedence (`-2² = -4`, implicit multiplication above
`×`/`÷`, `nPr` between them), its own percent forms (`660 ÷ 880% = 75`) and
tokens (`Ran#`, `∫`, `°′″`, base tags). Translating that into another grammar
would be a second parser pretending not to be one. The parser here mirrors the
manual's priority table and every rule has a test.

`Temml` is not used. It produces MathML, which GPUix cannot lay out (no DOM). The
native LCD is token-styled text with a caret. This is a stated fidelity
limitation, not an implied feature.

## Tests

`nub run --filter @gpuixui/calc test` covers the manual's worked examples:
parser precedence, percent forms, sexagesimal, CALC/SOLVE, integration,
differentiation, Σ, statistics/regression, BASE-N, EQN, matrices/vectors, TABLE,
formatting and the session's key transitions. `check:tests` is part of
`nub run check`.

## Limitations, recorded rather than hidden

- **Natural Display input** has structural slots: the `a/b` key inserts a
  stacked fraction and the caret moves straight between numerator and
  denominator; `√( … )` paints as a radical with a vinculum and `^`/`x²` paint as
  superscript slots. LineIO and MthIO-LineO stay linear by definition.
- **Complex `Ans`** now keeps the full complex value (`Ans × 2` after `1+i`).
- **SETUP** (SHIFT + MODE) is a real dialog: display, angle, Fix/Sci/Norm,
  fractions, complex format, STAT frequency, decimal point and LCD contrast.
  SHIFT + AC powers the LCD off; any key wakes it.
- **CALC/SOLVE prompt for an initial value** in a compact prompt rather than a
  full screen; the Newton iteration limit is 100.
- **`∫`, `d/dx`, `Σ`** reject the nested functions the manual excludes and cap
  their work to keep the UI responsive.
- **No VERIFY** on this model (not in its manual).
- **Display contrast** is a device control implemented as an LCD-ink fade in
  SETUP; it is not a calculation.
