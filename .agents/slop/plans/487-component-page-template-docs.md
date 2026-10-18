# 487 — The component-page template reaches the site

**Phase:** F (contribution docs) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410 (site), 411 (template + record contract), 414/415 (source
and API tables), 427 (compound sections), 441 (API index), 479/480 (parts and
state ownership), 482 (the public component API page)

## 1. Why

`MISSION.md` requires "clear install, usage, **contribution and extension**
instructions", and this workstream owns the component-page template. Today the
template exists only as:

- the `## ` headings in `apps/docs/README.md`, and
- the record contract in `apps/docs/src/component-meta/{schema,contract}.ts`.

A contributor (or a weaker agent) who adds a component page must reverse
engineer the registry fields, the conditional sections, the MDX blocks and the
guards from three files. The sites' Contributing page names the checks but not
the template.

The fix is one published page, `/docs/component-pages`, whose section list is
**generated** from `sectionsFor(pattern)` so the documentation cannot drift from
the contract, plus guards for the parts that are prose (record fields, MDX
blocks, the guard table).

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/src/components/page-template.tsx` | New. `patternTemplates()` + `<PageTemplateSections />`, both derived from `sectionsFor`. |
| `apps/docs/src/components/mdx.tsx` | Register `PageTemplateSections`. |
| `apps/docs/content/docs/component-pages.mdx` | New page: two files, the record, the sections, the blocks, the preview tier, the guards, a checklist. |
| `apps/docs/content/docs/meta.json` | Add `"component-pages"` after `"contributing"`. |
| `apps/docs/content/docs/contributing.mdx` | Link the template from `## Components`. |
| `apps/docs/src/component-page-docs.test.ts` | New guard (see §4). |
| `apps/docs/README.md` | One sentence under `## Authoring` naming the published page. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | Add and tick the row in the docs workstream. |

No path outside the workstream changes. `LICENSES/`, `packages/*` and
`docs/` are untouched.

## 3. The page

Slug `/docs/component-pages`, title `Component pages`, description
`The record, sections and guards behind every component page.`

Sections, in order:

1. **Two files** — the page path and `src/component-meta/entries.ts`.
2. **The record** — table of the fields `DeliveredOptions` declares
   (`sourcePath`, `api`, `runtime`, `status`, `limitations`, `dependencies`) and
   the guard that reads each; `status` mirrors `COMPONENTS.md`.
3. **The sections** — `<PageTemplateSections />`, then the rule that a missing
   section fails `component-pages.test.ts` by name.
4. **The blocks** — `ComponentState`, `NativePreview`, `ComponentPreview`
   (optional), `auto-type-table`, `include`, `ComponentDependencies`,
   `RelatedComponents`; the self-closing-`<include>` trap and the one-include-per
   -part rule.
5. **The preview** — `<NativePreview>` picks the strongest honest tier; an
   approximation only through `<IllustrativeApproximation>`; a live scene only
   when the record declares one; `docs/preview-strategy.md` is the repo source.
6. **The guards** — table of test file → what it proves (component-pages,
   component-truth, content-references, registry, dependencies, native-coverage,
   api-reference-page, page-meta).
7. **Checklist** — six ordered steps that end at `nub run --filter docs test`.

The page names real files; it does not paste a fake component page.

## 4. Test plan — `apps/docs/src/component-page-docs.test.ts`

| Test | Failure it must catch | Derivation |
| ---- | --------------------- | ---------- |
| generates every pattern's sections | the page loses `<PageTemplateSections />`, so a reader sees no section list | `renderToStaticMarkup(<PageTemplateSections />)`; assert the page includes the tag and every `sectionsFor(pattern)` name, and that `patternTemplates()` returns exactly `sectionsFor` |
| names every field a delivered record requires | a field is renamed/added in `DeliveredOptions` and the prose keeps the old list | regex the interface body in `entries.ts` for `readonly <name>`; assert each name is on the page |
| names the guards that read a component page | a new guard reads `content/docs/components` and the template omits it | scan `src/**/*.test.ts(x)` for the literal `content/docs/components`; assert the page names each path |
| names only guard files that exist | a renamed or invented test path ships | extract backticked `*.test.ts(x)` paths; assert each resolves under `apps/docs/` |
| stays in the sidebar | the page exists but nothing links it | `content.test.ts` already fails on an unlisted page; no duplicate assertion here |

Two-direction proofs (run and record in §7):

1. Delete `<PageTemplateSections />` from the page → test 1 fails.
2. Rename `limitations` to `limitation` in the page's record table → test 2
   fails.
3. Delete the `src/component-truth.test.ts` row → test 3 fails.

## 5. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter docs test` | pass; the three proofs above fail when applied |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0`; `/docs/component-pages` in the output |
| `nub run --filter docs smoke:build` | exit `0`; the new route renders, is in the sitemap and is searchable |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 6. STOP conditions

- `sectionsFor` is not exported from `src/component-meta/contract.ts`: stop; do
  not duplicate the section list by hand.
- A field in `DeliveredOptions` has no guard that reads it: document it as a
  field, not as a promise a test enforces.
- The page would need a component page that does not exist: stop; use the
  contract names, never a fictional slug.

## 7. Progress (2026-10-18)

- Landed `src/components/page-template.tsx`, the page, the meta/contributing
  wiring and `src/component-page-docs.test.tsx`.
- `nub run --filter docs test`: 47 files / 304 tests pass.
- Two-direction proofs:
  - removing `<PageTemplateSections />` failed
    `generates every pattern's section list on the template` with
    `expected '…' to contain '<PageTemplateSections />'`;
  - renaming `limitations` to `limitation` in the record table failed
    `names every field a delivered record requires` with `[ 'limitations' ]`;
  - removing the `src/component-truth.test.ts` row failed
    `names the guards that read a component page` with that path.
  Restoring each passed; no test was weakened.
- The first field guard read the whole page and passed on a rename, because
  `limitations` also appears in the guard table; it now reads only the
  `## The record` section, which is the claim being documented.
- `nub run --filter docs smoke:build`: 87 pages / 106 links, exit `0`.
- `nub run check` and `nub run lint`: exit `0`.

## 8. Acceptance

- `/docs/component-pages` publishes the template, generated from the contract.
- The four guards are proven in both directions and the page is in the sidebar,
  sitemap and search index.
- `TODO.md` and the plan index are current; the commit is pushed on
  `agent/docs-site`.
