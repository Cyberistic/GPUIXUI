# gpui-motion (`gpui-ce-motion`) — borrowed API surface

- Repository: <https://github.com/1bye/gpui-motion>
- Crate read: `gpui-ce-motion` `0.4.0` @ `fd9baf9` (read 2026-10-20)
- Licence: MIT OR Apache-2.0 (`Cargo.toml`); we record MIT —
  `LICENSE-MIT` "Copyright (c) 2026 1keep contributors"
- Spec: `.agents/slop/plans/439-motion-and-ely-components.md`

## What we use

The broader motion API surface — easing variants (Circ/Back/Anticipate/Bezier),
`Spring`/`Transition`, and `Inertia` momentum — borrowed as a spec for the
TypeScript hook API, not transcribed.

## What we do not use

No Rust source is copied. The core is pure (`default = []`, `gpui` optional), but
we take only API shapes and behaviour as a spec. No `gpui`-feature adapters,
text/SVG/vector motion, or native modules are ported.

## MIT License

Copyright (c) 2026 1keep contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
