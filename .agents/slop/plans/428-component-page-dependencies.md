# 428 — Component page dependencies: every page names what the component needs

- **Workstream:** docs-site
- **Phase:** F (docs completeness) — satisfies a `MISSION.md` component-page
  requirement that no page currently meets
- **Owns:** `apps/docs/**`, `docs/preview-strategy.md` is untouched
- **Depends on:** `410`, `411`, `422`–`426` (the registry, the template and the
  42 delivered pages)
- **Status:** implemented — see §9

## 1. The gap

`MISSION.md` requires every component page to carry, in this order:
description; preview; variants; sizes/states; usage; API; composition; keyboard;
theming; accessibility **and limitations; dependencies; related components;
implementation status**.

The shipped template (`src/component-meta/contract.ts` → `BASE_SECTIONS`) has
eleven sections and **no `Dependencies`**: 42/42 pages omit it. The registry
already has a `dependencies: []` field, populated for two records (`select`,
`tooltip`) and rendered only inside the `<ComponentState>` badge block, so the
information exists for 2 components and is invisible for 40.

Nothing else notices: the page builds, sits in the sidebar, passes
`registry.test.ts` and `content-references.test.ts`. The omission is exactly the
invisible-drift class that plans 411/424 exist to stop.

## 2. What "dependencies" means here

Three true answers exist and only one is maintainable:

1. **Authored prose.** Drifts the moment an import changes; a test can only
   check that the section exists.
2. **The package manifest alone.** Says `@gpuixui/components` requires
   `@gpuix/react`, `@gpuixui/tokens` and `effect`, which is identical for 22
   pages and never names the wrapper subpath or the composed component.
3. **Derived from the component's real entry file, stored in the record, and
   re-derived by a test.** The page cannot claim a dependency the source does not
   import, and a changed import fails the suite until the record is updated.

This plan takes (3), with one documented scope: **the entry file's direct
imports** — the same file the page's API table and `<include>` already read. It
states that scope in the section so nobody reads it as a transitive audit.

The rule, in `src/lib/source-imports.ts`:

- read the record's `sourcePath`;
- collect every `import … from "…"` / `export … from "…"` specifier
  (single-line and multi-line);
- **modules** = every specifier that is not relative, except `react`, `react/*`
  and bare `@gpuix/react` — React is the package's peer and `@gpuix/react` is the
  renderer every component uses, so both are stated once in the block instead of
  repeated 42 times;
- **composed** = a relative specifier that resolves (`.tsx`, `.ts`, `index.*`)
  to another delivered record's `sourcePath`; that record's slug is the
  dependency. A relative import into `internal/`, `core/`, `menu/`, `toast/` or
  `combobox/` is a private helper and is **not** a dependency;
- sort and dedupe; that array is `dependencies` in `entries.ts`.

Stored values (42 delivered records; `@gpuix/react` removed everywhere by the
rule above):

| Record | `dependencies` |
| ------ | -------------- |
| text, icon, stack, box, scroll-area, button-group, text-input, switch, progress, skeleton | `[]` |
| separator, spacer | `["text"]` |
| button | `["spinner"]` |
| label | `["stack", "text"]` |
| text-area | `["text-input"]` |
| checkbox | `["@gpuixui/icons"]` |
| radio-group | `["effect/Array", "effect/Option", "text"]` |
| select | `["@gpuix/react/floating", "@gpuix/react/select", "effect/Array"]` |
| tooltip | `["@gpuix/react/floating", "@gpuix/react/tooltip"]` |
| spinner | `["effect/Array"]` |
| empty-state, alert, dropdown-menu, context-menu, collapsible, search-input | `["@gpuix/react/floating"]` |
| card, badge, avatar, dialog, popover | `["@gpuix/react/floating", "effect"]` |
| list, tabs | `["@gpuix/react/floating", "effect", "effect/Array", "effect/Option"]` |
| inline-validation | `["@gpuix/react/floating", "effect/Option"]` |
| toast | `["effect", "effect/Fiber", "effect/ManagedRuntime", "effect/Stream"]` |
| confirm-dialog | `["dialog", "effect"]` |
| command-menu | `["dialog", "effect/Array", "effect/Option", "effect/String"]` |
| accordion | `["@gpuix/react/floating", "effect/Array", "effect/Option"]` |
| breadcrumb, pagination | `["@gpuix/react/floating", "effect/Array"]` |
| combobox | `["effect/Array", "effect/Option"]` |
| date-picker | `["effect", "effect/Array", "effect/DateTime", "effect/Option", "popover"]` |

A slug entry means **composes**, not "installs": `command-menu` imports
`./dialog.js`. The block links it to the Dialog page.

## 3. The section

Base template gains one section, after `Accessibility and limitations` and
before `Source`:

```mdx
## Dependencies

<ComponentDependencies slug="card" />
```

`<ComponentDependencies>` renders, from the record only (no `node:fs` — the
browser bundle never reads the repository):

- a standing sentence: every component is a React 19 peer of `@gpuix/react`
  `0.10.0`, and theme values come from `@gpuixui/tokens` through the app's theme
  provider;
- **Package** — `record.packageName`;
- **Modules** — the non-slug entries as `<code>`, or "Nothing beyond the peer
  packages" when empty;
- **Composes** — slug entries as links to `/docs/components/<slug>`, omitted
  when empty.

`<ComponentState>` loses its `Dependencies` row: the dedicated section owns it,
and a status badge list is not where a reader looks for install information.

## 4. Files

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/source-imports.ts` | new: `importSpecifiers`, `runtimeModules`, `derivedDependencies` (the last uses `node:fs`, the established vitest boundary of `source-exports.ts`) |
| `apps/docs/src/component-meta/contract.ts` | add `"Dependencies"` to `BASE_SECTIONS` after `"Accessibility and limitations"` |
| `apps/docs/src/component-meta/entries.ts` | `dependencies` per §2 on all 42 `delivered(...)` records |
| `apps/docs/src/components/component-dependencies.tsx` | new renderer |
| `apps/docs/src/components/component-state.tsx` | remove the duplicate `Dependencies` row |
| `apps/docs/src/components/mdx.tsx` | register `ComponentDependencies` |
| `apps/docs/src/component-meta/dependencies.test.ts` | new: source↔record equality, resolver fixtures, dependency shape |
| `apps/docs/src/component-pages.test.ts` | require `<ComponentDependencies slug="…"` on every finished page |
| `apps/docs/README.md` | document the section, the block and the derivation/update procedure |
| `apps/docs/content/docs/components/*.mdx` | 42 × the section + block |
| `TODO.md` | tick this task; add the `primitives` manifest gap §7 |

## 5. Tests

1. **Source↔record equality** (`dependencies.test.ts`): for every delivered
   record, `derivedDependencies(...)` equals `record.dependencies`; the failure
   message prints the expected array so the fix is a copy. Catches: a new import
   with no doc update, a removed import, a hand-typed typo, a sibling component
   that stopped being composed.
2. **Resolver fixtures**: `importSpecifiers` reads multi-line imports and
   ignores a specifier in a comment; a relative import to a private helper
   (`internal/key.js`) yields no slug; a relative import to another record yields
   that slug. Catches: a regex that only sees single-line imports, a resolver
   that treats every relative file as a component.
3. **Shape**: every dependency is either a module (non-slug) or a slug whose
   record exists and is not `planned`. Catches a slug that would render a dead
   link.
4. **Page contract** (`component-pages.test.ts`): every finished page carries
   the block; the README template lists the section. Catches a page that adds
   the heading but renders nothing.

**Two-direction proof:** remove `spinner` from `button`'s record → test 1 fails
with the expected array; delete `## Dependencies` from `card.mdx` → test 4 fails;
delete the `internal/key` fixture's expected `[]` case → test 2 fails. Restore
all three and re-run.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass, `dependencies.test.ts` included |
| `nub run --filter docs check-types` | 0 |
| `nub run --filter docs build` | 0; the 42 pages still build |
| `nub run check` / `nub run lint` / `nub run test` | repo gate green |
| dev server `curl -s localhost:3000/docs/components/command-menu` | 200; the page contains the Dialog link and the effect modules |

## 7. Recorded, not fixed (other workstreams)

The derivation exposed a real manifest bug: `packages/primitives/package.json`
declares `effect` only in `devDependencies`, while `RadioGroup.tsx`,
`Select.tsx` and `Spinner.tsx` import `effect/Array` and `effect/Option` at
runtime. That package is not this workstream's path — it becomes a cross-team
row in `TODO.md` for the primitives owner. The docs guard does not depend on the
manifest, so it stays green.

## 8. STOP conditions

- A record's `sourcePath` does not exist → stop; that is a `registry.test.ts`
  failure to fix first, not a dependency list to invent.
- The derivation needs a transitive walk to be honest for a page → stop and
  record why in this plan; do not silently deepen the walk.
- A dependency cannot be classified as a module or a delivered slug → stop and
  report the record and the specifier; do not add an allow-list.
- Editing a page would require changing a component package → record the need in
  `TODO.md` instead.

## 9. Progress (2026-10-17)

- Added `src/lib/source-imports.ts` (`importSpecifiers`, `runtimeModules`,
  `resolveLocalModule`, `derivedDependencies`), the `Dependencies` section in
  `BASE_SECTIONS`, `<ComponentDependencies>` and the derived list on all 42
  delivered records. `component-state.tsx` no longer duplicates the field.
- `dependencies.test.ts` re-derives every record from its entry file and guards
  composition links; `component-dependencies.test.tsx` renders the block;
  `component-pages.test.ts` requires the section and the block on every finished
  page; the README documents the derivation and the update procedure.
- Two directions measured:
  - removing `spinner` from `button` failed with
    `button: expected spinner, found (none)`;
  - deleting `## Dependencies` from `card.mdx` failed with
    `card: missing section "Dependencies"` and the missing block;
  - both restored and the suite re-ran green.
- Suites: `apps/docs` 25 files / 142 tests (baseline 23/134); type-check and
  build green; the dev server serves `/docs/components/command-menu` with the
  Dialog link and `effect/String`, and every component route still returns 200.
- Cross-team finding recorded in `TODO.md` (§7).
