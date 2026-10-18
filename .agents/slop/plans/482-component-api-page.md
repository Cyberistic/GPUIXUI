# 482 — Publish the component API contract on the docs site

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 411, 427, 461, 479, 480; `docs/component-api.md` (D30/D31)

## 1. Why this plan exists

`PLAN.md` D30 makes `docs/component-api.md` the **public API spec**: compound
parts, typed-by-position children, the one controlled/uncontrolled rule,
state-aware styles, the shared keyboard contract and the supported accessibility
subset. Every delivered component page already speaks that vocabulary (`Parts`,
`State and ownership`, `pattern: "stateful"`), and 29 records declare real
exported parts (plan 479). The site, however, never explains it: a reader meets
`defaultValue`, `onValueChange`, `StateStyle` and "state ownership" for the
first time in a component page with no cross-cutting page to learn the rules
from. The maintainer spec is only reachable as a repository file.

This plan adds one consumer-facing page, `/docs/component-api`, that:

- names the rules in the order a consumer meets them;
- shows the **real source** of the two shared mechanisms (the controlled hook and
  the keyboard module) through `<include>`, never a pasted copy;
- generates the parts index from the component registry, so the published shape
  cannot drift from the records the pages use;
- links the full maintainer spec and the measured accessibility limits rather
  than restating either in a way that can rot.

It does not change components, packages or the maintainer spec. If a fact in
`docs/component-api.md` is wrong, that is a separate task for its owner.

## 2. Files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/482-component-api-page.md` | this plan |
| `.agents/slop/plans/README.md` | add the 482 row |
| `apps/docs/src/components/part-index.tsx` | **create** — generated parts index |
| `apps/docs/src/components/part-index.test.tsx` | **create** — render guard |
| `apps/docs/content/docs/component-api.mdx` | **create** — the page |
| `apps/docs/src/component-api-page.test.ts` | **create** — page contract guard |
| `apps/docs/content/docs/meta.json` | add `component-api` after `architecture` |
| `apps/docs/content/docs/components/index.mdx` | link the conventions page |
| `apps/docs/README.md` | one line in the IA/authoring notes |
| `TODO.md` | tick the new row and bump the workstream count |

No file outside `apps/docs`, `docs/preview-strategy.md` or the plan index is
touched.

## 3. The page

`apps/docs/content/docs/component-api.mdx`:

```
---
title: Component API
description: The conventions every component follows: parts, controlled state, state-aware styles, keyboard and accessibility.
---
```

Sections, in this order (the page test pins them):

| Section | Content source | Notes |
| ------- | -------------- | ----- |
| `## Parts` | `docs/component-api.md` §1 + `<PartIndex />` | position-typed children, one props type per part, root owns controlled props, render check because React 19 JSX is not nominal |
| `## Controlled and uncontrolled` | §2 + `<include>` of `packages/components/src/internal/controllable.ts` | `value` / `defaultValue` / `onValueChange`; `value` is authoritative and `defaultValue` is ignored while it is set. **Do not claim the warning §2 promises** — the shipped hook does not log one (see §6) |
| `## State-aware styles` | §3 | `style` takes `StateStyle<PartState>`; the exported `<Part>State` type is public API; no CSS, no data attributes |
| `## Keyboard` | §4 + `<include>` of `packages/primitives/src/core/keyboard.ts` | Enter on key down, Space on key up, a held key never activates, one roving tab stop, arrows wrap and skip disabled; **do not claim `defaultPrevented`** — §4 promises it and the shipped runtime has none (see §6) |
| `## Accessibility` | §5 + link `/docs/capabilities` | list the supported props and the **missing** ones as gaps, never as invented API |
| `## State ownership` | §7 | `state.ts` pure runtime, context owns controlled state, parts stay thin; consumer owns persistence, the renderer stores nothing |
| `## Where the rules live` | links | the maintainer spec, ADR 0004/0005, the capabilities page and the component index |

Two real examples are allowed to be short fences (`tsx`) because they are
consumer snippets, not component sources: one uncontrolled `<Tabs>` and one
controlled `<Tabs style>` — both import `@gpuixui/components/tabs`.

### `<PartIndex />`

`apps/docs/src/components/part-index.tsx`:

- reads `components` and `groups`/`tierGroupTitle` from `@/component-meta/registry`;
- renders one row per record with `parts.length > 0`, grouped by tier, with
  `data-part-slug={component.slug}`;
- the title links to `/docs/components/<slug>` (every such record is delivered;
  `registry.test.ts` already forbids a page-less delivered record);
- each part renders as `<code>{part.name}</code>`, and a `pattern` badge
  (`stateful` / `workspace`) makes the extra page sections legible;
- a record with no parts is absent — the page already lists single-part
  components in the prose and the index.

`part-index.test.tsx` renders it with `renderToStaticMarkup`:

1. one row per registry record with parts, exactly once;
2. each row links to that component's page;
3. every declared part name appears;
4. a record with no parts has no `data-part-slug` row.

## 4. Contract guard

`apps/docs/src/component-api-page.test.ts` reads the MDX and asserts:

- every section named in §3 is present, in order;
- `<PartIndex />` is rendered once;
- the page includes the three real files (the `<include>` bodies, not a pasted
  copy), and each path exists on disk;
- the page names `value`, `defaultValue`, `onValueChange`, `StateStyle` and
  `PartChildren`;
- it states the shipped limitation — the runtime offers no `defaultPrevented` —
  instead of repeating the contract's claim;
- it links `/docs/capabilities` and `/docs/components`;
- it carries no placeholder prose (`coming soon`, `TBD`, `TODO`, `FIXME`);
- `meta.json` lists `component-api` after `architecture`.

Each rule is written so deleting the block from the real page fails by name.

## 5. Commands and expected results

Run from the repository root:

```sh
nub run --filter docs test
# expected: every test file passes, including the two new ones

nub run --filter docs check-types
# expected: exit 0 (fumadocs-mdx generate + app + preview tsc)

nub run --filter docs build
# expected: exit 0; the page appears in the build output

nub run --filter docs smoke:build
# expected: exit 0; the sitemap grows by one page and every link resolves

nub run check
# expected: exit 0 (test quality, lint, format, types)

nub run lint
nub run test
# expected: both exit 0
```

Prove both directions before claiming done (both were run for this plan):

1. Remove one `<include>` body → `component-api-page.test.ts` fails with that
   file named.
2. Make the renderer drop one part (`parts.slice(1)`) → `part-index.test.tsx`
   fails on the missing name. A record losing its `parts` is already caught by
   `registry.test.ts` against the real exports, so the two guards cover the two
   halves: the data and the rendering.
3. Restore both; rerun `nub run --filter docs test` green.

## 6. STOP conditions

- Stop if `docs/component-api.md` and the shipped code disagree on a rule the
  page states. Record the disagreement in `TODO.md` for the owning workstream;
  do not silently document the code as if it matched the contract.
- Stop if `internal/controllable.ts` or `core/keyboard.ts` stops being the
  shared mechanism (grep shows a second implementation). The page must include
  the real one; do not paste.
- Stop if a part declared in a record does not exist in the package's exports —
  `registry.test.ts` should already fail; report rather than editing packages.
- Stop if the page would need a component, token or package change to be true.

## 7. Acceptance

- `/docs/component-api` renders, sits in the sidebar and the sitemap, and links
  to the full spec, the capabilities matrix and the component index.
- The parts index is generated from the registry; no part is hand-listed.
- The controlled hook and keyboard module appear through `<include>`.
- Both new test files fail when their subject is removed, and pass when restored.
- All commands in §5 pass; `TODO.md` and the plan index record the work.

## 8. Measured results (2026-10-18)

- `/docs/component-api` renders; `smoke:build` crawls **86 pages / 105 links**
  (was 85), search and 404 checks green.
- Docs suite: **46 files / 293 tests** (was 44 / 279); full `nub run test`,
  `nub run check` and `nub run lint` green.
- Both-direction proofs run: deleting the keyboard `<include>` failed
  `component-api-page.test.ts` by name; `parts.slice(1)` in the renderer failed
  `part-index.test.tsx` on the missing part.
- The first build shipped the page with no `<h1>`/`<main>` because
  `<PartIndex />` was missing from the MDX map — only the production crawl saw
  it. `part-index.test.tsx` now asserts the registration and is the regression
  guard for that failure.
- Two contract/code disagreements were found and recorded in `TODO.md` for the
  owning workstream instead of being copied onto the page:
  `docs/component-api.md` §2 promises a warning for `value` + `defaultValue`
  that `internal/controllable.ts` does not log, and §4 promises
  `defaultPrevented` where the shipped runtime has none.
