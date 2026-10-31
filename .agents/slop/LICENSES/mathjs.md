# mathjs — licence and use

| Field | Value |
| ----- | ----- |
| Package | [`mathjs`](https://mathjs.org) |
| Version | `15.2.0` (declared `^15.2.0` in `packages/calc/package.json`) |
| Licence | Apache-2.0 |
| Used by | `@gpuixui/calc` (`Fraction`, exact fraction arithmetic) |

## What is used

Only the number type and exact arithmetic: `fraction`, `add`, `multiply`,
`divide` and the `Fraction` class. The expression parser, units system, matrix
engine and evaluation scope are **not** used — the calculator has its own Casio
grammar, precedence and failure ranges (see `packages/calc/README.md`).

`Temml` is not a dependency and was evaluated and rejected: it emits MathML,
which the GPUix native renderer cannot lay out.

## Notice

mathjs is Copyright (c) 2013-2025 Jos de Jong and contributors, licensed under
the Apache License, Version 2.0. The full licence text is distributed with the
package at `node_modules/mathjs/LICENSE` and at
<https://www.apache.org/licenses/LICENSE-2.0>. No source file from mathjs is
copied into this repository; it is consumed as a dependency.

# Casio fx-991ES Plus manual — reference only

The calculator's modes, key layout, menu order, worked examples and physical
constants are taken from the Casio manual linked in the request
(`fx-570ES_991ES_9910NG_PLUS_EN.pdf`, © 2019 CASIO COMPUTER CO., LTD.). The
manual is used as a **specification**, not copied:

- no page images, screenshots, logos, keycap artwork or emulator source are
  included;
- the 40 scientific constants and 40 conversion factors are physical/numeric
  facts, re-typed with their CODATA (2014) / NIST SP 811 provenance;
- `CASIO`, `fx-991ES PLUS` and the model's visual identity are trademarks of
  Casio Computer Co., Ltd.; this is an independent, unaffiliated example and
  does not claim endorsement.

The GitHub emulator linked in the request was not cloned or copied; the app is
built from the manual and the library.
