# 726 — `@gpuixui/fx`: the decorative effects leave the core

| Field | Value |
| ----- | ----- |
| Owner | `components` → new package `packages/fx` |
| Depends on | — (independent; land before `727` so the landing does not list them) |
| Status | planned |

## Why

`@gpuixui/components` mixes AppKit-grade controls with web-showcase effects
(fireworks, particles, gravity stars, liquid/shine/ripple buttons…). About
4 700 LOC of `src/*.tsx` alone is decorative. That dilutes the "native" story,
grows the core's entry budget (`surface.budget.ts`) and puts a confetti cannon
one import away from a `Button`. `MISSION.md` allows a package only with a real
responsibility: **decorative motion** is one, and it is separable.

## The split

Candidates (each is `packages/components/src/<name>.tsx` plus `<name>/` if it
exists, its `docs/<name>.mdx`, its docs demo and its tests):

`fireworks particles gravity-stars stars hexagon bubbles motion-grid
liquid-button shine-button ripple-button magnetic gradient gradient-text
splitting-text rolling-text rotating-text typing-text sliding-text`

**Stay in components** (used by real surfaces, check before moving):
`shimmer` (chat reasoning), `highlight-text` (search), `counting-number` and
`sliding-number` (dashboards), `reveal`, `page-transition`, `motion`.

Rule: move a candidate **only** if no non-docs, non-fx file imports it:

```sh
for c in <candidates>; do
  echo "$c: $(rg -l "components/$c\b|\./$c(\.js)?\"" packages apps examples -g '!node_modules' \
    | rg -v "packages/components/(src|docs)/$c|apps/docs/src/components/docs/$c-demo" | tr '\n' ' ')"
done
```

A candidate with a consumer stays and is listed in the commit message.

## Steps

1. Scaffold `packages/fx` by copying `packages/media`'s `package.json`,
   `tsconfig.json`, `vitest` config and `README.md` shape (it is the most
   recent small package). Name `@gpuixui/fx`, exports `"./*"` → `src/*.tsx`,
   deps: `@gpuixui/tokens`, `@gpuixui/motion`, `@gpuixui/primitives`,
   `@gpuix/react` — only what the moved files import.
2. `git mv` each file (keeps history). Fix relative imports: anything from
   `./internal`, `./core` or `./recipe` in components becomes an import of a
   **public** components/primitives export; if the needed helper is not public,
   **STOP** (do not export internals to make the move compile).
3. Move the docs pages to `packages/fx/docs/`, and their sidebar section in
   `apps/docs/content/docs` to a new **Effects** section (after Components).
   The page URLs change from `/components/<name>` to `/effects/<name>`; add
   redirects in the docs router's redirect table (find it with
   `rg -n "redirect" apps/docs/src`).
4. Update `packages/components/src/inventory.ts`, `index.ts`,
   `surface.budget.ts` (lower the budget to the new measured value — run
   `nub run --filter @gpuixui/components measure:surface`), `COMPONENTS.md`
   (rows move to an "Effects" table), `README.md` layout table.
5. Registry: the shadcn registry entries (`rg -n "registry" apps/docs/src/lib`)
   point at the new paths.

## Test plan

- The moved tests move with their files and must pass unchanged:
  `nub run --filter @gpuixui/fx test`.
- `packages/components/src/exports.test.ts` and `inventory.test.ts` must fail
  before step 4 and pass after — that is the guard the move is complete.
- New `packages/fx/src/exports.test.ts`: every `src/*.tsx` is reachable from the
  `"./*"` export (copy the components one).
- Docs: one test that `/components/fireworks` redirects to `/effects/fireworks`
  (invert by dropping the redirect row).

## Acceptance

- `nub run check`, `lint`, `test` green; the components surface budget lowered.
- `wc -l packages/components/src/*.tsx` total drops by the moved LOC; record
  before/after in the commit.

## STOP

- Stop if a move needs a components internal to become public.
- Stop if the registry cannot serve a second package without a new build step.
