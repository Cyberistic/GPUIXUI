# open-gpui `crates/motion` — ported physics

- Repository: <https://github.com/Latias94/open-gpui>
- Crate read: `crates/motion` @ `689db5b` (workspace `0.2.0`, read 2026-10-20)
- Licence: Apache-2.0 (`crates/motion/LICENSE-APACHE`), with the fork notice in
  `crates/motion/NOTICE`
- Spec: `.agents/slop/plans/439-motion-and-ely-components.md`

## What we use

The closed-form spring/timeline/sequence/policy math, ported to TypeScript:
under/critical/over-damped spring sampling, easing and spec progress, retarget,
reduced-motion-as-immediate, and sequence orchestration. `Duration` becomes
`number` (ms); the caller owns the clock.

## What we do not use

No Rust source is vendored and no crate is imported as a dependency. No
`open-gpui` / "Open GPUI" / "Zed" trademark is used. A TS port must carry both
NOTICE copyright lines:

- "Copyright 2022 - 2025 Zed Industries, Inc."
- "Copyright 2026 Mingzhen Zhuang and Open GPUI contributors"
