# 740 — `@gpuixui/calc`: the calculator engine and the model seam

| Field | Value |
| ----- | ----- |
| Owner | `calculator` workstream |
| Depends on | nothing in the library; `effect`, `mathjs` |
| Blocks | 741 (fx-991ES Plus model), 742 (native example app) |
| Status | in progress |

## Why

The owner wants a real example: a Casio fx-991ES Plus calculator that looks and
feels like a macOS app, runs in a terminal, and later gains a TI-84 mode. The
engine must be model-agnostic at the seam and model-faithful at the leaves, or
the TI-84 will become a rewrite instead of a second model.

## Decision: mathjs is the number type, not the syntax

`mathjs` is used for `Fraction`, `Complex`, matrix `det`/`inv`/`transpose`, and
formatting. Its **parser is not used**: fx-991ES input has Casio precedence
(omitted multiplication before functions, `x²` above unary minus, `nPr` between
implicit multiplication and `∠`), Casio percent semantics, sexagesimal tokens,
base-n commands and menu keys. Translating all of that into mathjs syntax would
be a second parser that pretends not to be one. The tokenizer/parser/evaluator
in this package is explicit, typed and testable; mathjs supplies the arithmetic
primitives underneath it.

`Temml` is **not** used. It produces MathML, which GPUix cannot render (no DOM,
no MathML layout). The native display is a token-styled text surface. This is
recorded as a fidelity limitation, not hidden.

## Package shape

```
packages/calc/
  package.json                 @gpuixui/calc, exports "." and "./react"
  tsconfig.json
  vitest.config.ts
  README.md
  src/
    index.ts                   public exports
    model.ts                   CalculatorModel seam (id, label, keypad, modes, catalog)
    models/fx991es.ts          the fx-991ES Plus model (mode list, keypad, capabilities)
    input/token.ts             InputToken union, insert/delete/cursor, wire syntax
    input/keyboard.ts          KeyId union + physical/computer key mapping
    value.ts                   CalcValue union (real, complex, matrix, vector, list, text)
    numbers.ts                 mathjs wrappers + typed NumericError
    parser.ts                  tokens -> Expr AST (Casio precedence)
    evaluate.ts                Expr -> CalcValue (Effect, Random for Ran#)
    format.ts                  display rules (Norm/Fix/Sci, fraction, pi, sqrt, sexagesimal)
    catalog.ts                 command catalogue entries for the palette
    constants.ts               40 scientific constants (CODATA 2014) + 40 conversions
    modes/comp.ts              COMP / CMPLX
    modes/stat.ts              1-var/2-var, 8 regressions, sum/var/reg/minmax/distr
    modes/base.ts              32-bit base-n arithmetic, logic, per-value base tags
    modes/eqn.ts               2x2, 3x3, quadratic, cubic (complex roots)
    modes/matrix.ts            MatA/B/C, MatAns, det/inv/trn/abs/pow
    modes/vector.ts            VctA/B/C, VctAns, dot/cross/abs/angle
    modes/table.ts             f(x) table, 30-row limit
    session.ts                 CalculatorState + press/reduce Effect + editors
    store.ts                   SubscriptionRef-backed store (Effect service)
    react.ts                   useCalculator React seam (useSyncExternalStore)
    *.test.ts                  co-located tests
```

## Seam (the TI-84 contract)

`src/model.ts`:

```ts
export interface CalculatorModel {
  readonly id: "fx991es" | "ti84";
  readonly label: string;
  readonly modes: ReadonlyArray<ModelMode>;
  readonly keypad: ReadonlyArray<KeypadGroup>;
  readonly capabilities: ModelCapabilities;
}
```

`CalculatorState` carries `model: "fx991es"`. `session.press` dispatches through
a model reducer table; the app never imports `models/fx991es` directly, only
`models.get("fx991es")`. Adding TI-84 means a new `models/ti84.ts` and a second
capability row; no app or UI change. `ModelCapabilities` names
`naturalDisplay`, `complex`, `baseN`, `statistics`, `equations`, `matrix`,
`vector`, `table`, `integral`, `solve`, `distribution`, so a model can refuse a
feature the seam does not carry.

## State model

- `tokens: InputToken[]`, `cursor: number` — the entry line. Every key inserts or
  deletes atomic tokens (`sin(`, `x²`, `RanInt(`, `⌐`), so DEL is not a string
  slice and replay is exact.
- `result: Option<CalcResult>`; `error: Option<CalcFailure>`.
- `setup`: `display` (`MthIO-MathO`, `MthIO-LineO`, `LineIO`), `angle`
  (`Deg|Rad|Gra`), `numberFormat` (`Norm1|Norm2|Fix(n)|Sci(n)`), `fraction`
  (`d/c|mixed`), `complexFormat` (`a+bi|r∠θ`), `statFrequency`, `decimalPoint`.
- `variables: Record<"A".."F"|"X"|"Y", number>`; `memory: number`; `ans`.
- `history`, `historyIndex`.
- Per-mode substate: `stat`, `base`, `eqn`, `matrix`, `vector`, `table`.
- `shift`, `alpha`, `stoPending`, `rclPending`.

`press(state, key)` returns `Effect<CalculatorState, never, Random>`: expected
calculator failures (`Math ERROR`, `Syntax ERROR`, `Argument ERROR`, `Dimension
ERROR`, `Variable ERROR`, `Can't Solve`, `Insufficient MEM`, `Time Out`) are
stored as `error` in the state, not thrown. Only defects can escape.

## Parser and evaluator

- Precedence follows the manual §Calculation Priority Sequence exactly:
  parentheses > trailing-parenthesis functions > postfix (`x²`, `x³`, `x⁻¹`,
  `!`, `%`, `°′″`, `°`,`r`,`g`, implied multiply) > fraction > unary minus/base
  tags > conversions/estimated values > implicit multiplication > `nPr`/`nCr`/
  `∠` > dot product > `×`/`÷` > `+`/`−` > `and` > `or`/`xor`/`xnor`.
- Implicit multiplication is inserted before `(`, functions, `Ran#`, variables,
  constants, `π`, `e` — exactly the five allowed positions.
- Postfix `%` follows Casio's three forms: `A×B%`, `A÷B%`, `A+B%`/`A−B%`
  (percent of the left operand).
- Sexagesimal `a°b′c″` parses to a decimal degree value; results convert back
  when the operation was sexagesimal.
- `∫(f,a,b,tol)`, `d/dx(f,a,tol)`, `Σ(f,a,b)`, `Pol(x,y)`, `Rec(r,θ)`,
  `RanInt(a,b)`, `Rnd(x)`, `Abs(x)`, `nPr`, `nCr` are first-class AST nodes.
  Integration is 15-point Gauss–Kronrod (the manual's method); derivative is a
  central difference; `Σ` is an integer loop; all enforce the manual's ranges.
- Exact display: rational results are detected with `Fraction`; π and √ forms
  are snapped only when within 1e-10 of the form and inside the manual's ranges.
- `SQRT` form supports `±a√b`, `±d±a√b`, and one `±a√b±d√e` term pair.

## Failure taxonomy

`CalculatorFailure` is a `Schema.TaggedError`-shaped union with `kind` and
`message`; the UI shows the Casio message verbatim. Decode of stored state is
not needed (in-process); unknown command ids are ignored with a structured log.

## Test plan

Unit tests, all able to fail:

- `input/token.test.ts`: insert/delete/cursor with atomic function tokens; DEL at
  boundaries; insert at cursor; replay reproduces tokens.
- `parser.test.ts`: precedence table cases from the manual: `-2² = -4`,
  `(-2)² = 4`, `2^3^2 = 512`, `1÷2π`, implicit multiplication positions,
  `10÷3×3 = 10`, `%` forms, sexagesimal, multi-statements.
- `evaluate.test.ts`: every COMP function from the manual's examples (trig in
  three angle units, logs, powers/roots, factorial, nPr/nCr, Rnd, Abs, Pol/Rec,
  RanInt range, integration `∫₁ᵉ ln x = 1`, derivative `d/dx(3x²−5x+2,2)=7`,
  `Σ(x+1,1,5)=20`).
- `format.test.ts`: Norm 1/2, Fix 0–9, Sci 0–9, d/c vs mixed, π form, √ form,
  complex a+bi vs r∠θ, engineering notation, sexagesimal.
- `modes/stat.test.ts`: 1-var mean/pop/sample sd, frequency, all 8 regressions,
  estimates, normal distribution P/Q/R/t, min/max.
- `modes/base.test.ts`: all manual examples, 16/32-bit wrapping, logic ops,
  per-value base tags, DEC/HEX/BIN/OCT conversion.
- `modes/eqn.test.ts`: manual's 2x2, 3x3, quadratic with complex roots, cubic.
- `modes/matrix.test.ts`: dims, +, ×, scalar, det, inv, trn, abs, squares,
  dimension errors.
- `modes/vector.test.ts`: 2D/3D, +, scalar, dot, cross, abs, angle.
- `modes/table.test.ts`: manual example, defaults, 30-row limit error.
- `session.test.ts`: SHIFT/ALPHA latches, STO/RCL, M+/M−, Ans, history/replay,
  mode switches clear the right things, setup changes, CALC/SOLVE flows, CLR.
- `catalog.test.ts`: every model key and function is searchable by id, label and
  at least one keyword; no duplicate ids; app commands do not collide.

Commands:

```sh
nub run --filter @gpuixui/calc test
nub run --filter @gpuixui/calc check-types
nub run check:tests
```

Expected: all green, no `any`, no skipped cases.

## STOP conditions

- If `mathjs` cannot be installed or its types do not compile under TS 7, stop
  and report the exact error; do not silently replace it with hand-rolled
  arithmetic.
- If a manual example disagrees with the implementation after two attempts,
  record the failing input and the calculator's documented answer in
  `.agents/slop/TODO.md` and leave the case as a documented limitation; do not
  weaken the test to pass.
- If the GPUix runtime cannot render the display/keys, stop at 741 and report the
  runtime limitation with the failing command.

## Acceptance

`@gpuixui/calc` type-checks, has no `any`, exports the model seam, and every
manual example listed above passes in the co-located suite.
