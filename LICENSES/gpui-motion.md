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
