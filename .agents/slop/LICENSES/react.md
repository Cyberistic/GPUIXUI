# React — the runtime surface

- Repository: <https://github.com/facebook/react>
- Commit read: `9ffcb46` (`main`, read 2026-10-22)
- Licence: MIT — `Copyright (c) Meta Platforms, Inc. and affiliates.`

## What we use

The runtime surface — JSX and hooks — on GPUix. React is a peer dependency of
every package, so the library runs on React but ships none of its source.

## What we do not use

Dependency, no code copied. No React source is copied, adapted or vendored;
React is installed from npm under its own MIT licence.
