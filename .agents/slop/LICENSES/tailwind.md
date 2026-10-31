# Tailwind — utility syntax and recipe model

- Repository: <https://github.com/tailwindlabs/tailwindcss>
- Commit read: `8cc0551` (`main`, read 2026-10-22)
- Licence: MIT — `Copyright (c) Tailwind Labs, Inc.`

## What we use

The utility syntax and recipe model — `bg-popover`, `flex-col`, `h-9` and the
variant grammar — mapped to GPUix `StyleDesc` in `@gpuixui/tw`.

## What we do not use

Reference-only, no code copied. The CSS engine is not used: Tailwind's syntax
is compiled to native style descriptors, not CSS, and no Tailwind source file
is copied or vendored.
