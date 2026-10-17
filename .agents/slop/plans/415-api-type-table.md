# 415 — the API type table: verified, landed, guarded

- **Workstream:** docs-site
- **Phase:** B (mechanism) → C (one table per component page)
- **Owns:** `apps/docs/src/lib/type-table*.ts(x)`, `apps/docs/source.config.ts`,
  `apps/docs/src/content-references.test.ts`, `apps/docs/content/docs/api-reference.mdx`,
  `apps/docs/README.md` (the API-table section)
- **Depends on:** 410, 411 (the page template and the registry)
- **Depended on by:** every component page's "API reference" section (plan 411 §4)

Companion plans: [`410-docs-site.md`](./410-docs-site.md),
[`411-component-page-template.md`](./411-component-page-template.md).

---

## 1. Goal

Plan 411 §4 makes prop tables load-bearing: every component page's API reference
is generated from the component's real props type by
`fumadocs-typescript`'s `remarkAutoTypeTable`. Plan 411 §7 T4 ("prop tables … a
rendered check") was **never done**, and plan 411 §10 carries a STOP condition
for the case where the plugin cannot work in this Vite/TanStack Start app.

This plan resolves that risk before the first component page exists: it proves
the mechanism, lands a real table on a page, pins the tsdoc annotation contract
the component packages must satisfy, and makes a broken table fail a test rather
than render as nothing.

## 2. What was verified (probe, 2026-10-17)

A throwaway page with
`<auto-type-table path="../../src/components/preview/captures.ts" name="CaptureProvenance" />`
built (`nub run --filter docs build`, exit 0) and served
(`curl http://localhost:3000/docs/_probe2`, HTTP 200) as a real Fumadocs
`TypeTable`: `id="type-table-captures.ts-CaptureProvenance"`, one row per prop
(`platform`, `command`, `capturedAt`, `commit`, `gpuixVersion`) with the type
from the real source and the description from its tsdoc.

The generator was then probed directly (`createGenerator().generateDocumentation`,
`generateTypeTable`) against a real `.tsx` fixture. Exact behaviours:

| Input | Result |
| ----- | ------ |
| `generateDocumentation({ path }, "CaptureProvenance")` | 1 doc, 5 entries, tsdoc descriptions, `type: "string"` |
| `.tsx` file with `/** … */ label: string`, `tone?: "calm" \| "loud"`, `/** @internal */ internal: string` | `label` (`required: true`), `tone` (`required: false`, `type: "\"calm\" | \"loud\" | undefined"`); **`internal` hidden** |
| the same with `{ allowInternal: true }` | `internal` present, `tags: [{ name: "internal" }]` |
| an export name that does not exist (`"NoSuchType"`) | `[]` — silently empty |
| a single-line inline `type` string with `/** @internal */` | the tag is **ignored** (both props returned) |

The last two rows are why this plan exists: an unknown type name and an inline
type both fail *quietly*, so nothing on a page would show the mistake.

## 3. The contract this plan pins

Component props types (in `packages/*/src`) must be **exported** and live in a
real file; each public prop carries tsdoc text, and a prop that must not appear
on the site carries `@internal`. Optional props use `?` so the table marks them
optional. This is the contract plan 411 §9 records as a handoff to the component
workstream; `type-table.test.ts` now executes it.

## 4. Files to create or change

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/415-api-type-table.md` | this plan |
| `.agents/slop/plans/README.md` | index row `415` |
| `.agents/slop/plans/411-component-page-template.md` | record T4 done and the verification; the §10 STOP condition is answered (the plugin works) |
| `apps/docs/source.config.ts` | export the configured `generator` so the app and the test cannot drift into two configurations |
| `apps/docs/src/lib/type-table.fixture.tsx` | **new** — the executable annotation contract (a `.tsx` props type exercising `@`-tags and optionality); no page renders it |
| `apps/docs/src/lib/type-table.test.ts` | **new** — the contract test (§6) |
| `apps/docs/src/content-references.test.ts` | type-table references are collected once; add an **async** check that every page reference generates a non-empty table |
| `apps/docs/content/docs/api-reference.mdx` | a real, rendered table (the capture-provenance record) under "Where the tables come from" |
| `apps/docs/README.md` | state that the mechanism is verified and name the annotation contract |
| `TODO.md` | tick the docs-site API-metadata task; point the components/primitives handoff at the contract test |

## 5. Implementation detail

`source.config.ts` exports the generator it already builds:

```ts
export const generator = createGenerator({
  cache: createFileSystemGeneratorCache(".cache/fumadocs-typescript"),
});
```

`type-table.test.ts` imports it via `../../source.config` and calls
`generateDocumentation`/`generateTypeTable` — the same configured instance the
pages use.

`content-references.test.ts` already knows every `<auto-type-table path name>`;
it gains an `async` test that resolves each `path` against the page's directory
and asserts `generateDocumentation({ path: absolute }, name)` returns a doc with
at least one entry. A typo in either attribute now fails instead of rendering an
empty table.

## 6. Test plan — `src/lib/type-table.test.ts`

Vitest, node environment, no new dependency. Assertions:

1. **A real file produces the real props.** `generateDocumentation` on
   `type-table.fixture.tsx` for `FixtureProps` yields exactly `["label", "tone"]`
   — the non-`@internal` props — with `label.description === "The visible label."`,
   `label.type === "string"`, `label.required === true`, and
   `tone.required === false` with `"calm" | "loud"` in its type. *Catches a
   regression that stops reading tsdoc, or that starts leaking `@internal`.*
2. **`@internal` is hidden by default and included on request.** The default
   result omits `internal`; `{ allowInternal: true }` includes it. *Catches the
   hiding rule silently breaking — the failure the component workstream would
   otherwise ship.*
3. **An unknown export name yields no docs.** `generateDocumentation({ path },
   "NoSuchProps")` → `[]`. *Pins the quiet failure mode the page check (5) exists
   to catch.*
4. The **page-level** check lives in `content-references.test.ts` (§5).

Two-direction proof (AGENTS §3):
- remove `/** @internal */` from the fixture → check 2 fails (the prop appears
  by default); restore → passes.
- type a wrong `name` in `api-reference.mdx` → the async page check fails naming
  the page and the type; restore → passes.

## 7. Commands and expected results

```sh
nub run --filter docs test          # was 46 tests; the two new/extended files add 5
nub run --filter docs check-types
nub run --filter docs build
nub run check
nub run lint
nub run test
```

Live check of the page table (then stop the server):

```sh
nub run --filter docs dev &
curl -s http://localhost:3000/docs/api-reference | tr -d '\000' | grep -o 'type-table-captures.ts-CaptureProvenance-[a-z]*' | sort -u
```

Expected: one id per prop (`…-platform`, `…-command`, `…-capturedAt`,
`…-commit`, `…-gpuixVersion`).

## 8. STOP conditions

- `generateDocumentation`/`generateTypeTable` are not in the public API of the
  installed `fumadocs-typescript@5.5.2`. The probe shows they are; if a later
  version removes them, use plan 411 §10's documented fallback (a hand-verified
  `PropsTable` data file marked with the commit it was checked against) and record
  it.
- The generator cannot run inside vitest (native TypeScript process). The probe
  shows it can; if it cannot, keep the page-level verification as a build/dev
  check documented in the plan and in `apps/docs/README.md` rather than dropping
  the guard.
- A gate fails for a reason outside this workstream: report the workspace, do not
  edit it.

## 9. Results (implemented 2026-10-17)

Two constraints surfaced during implementation; both are recorded in
`apps/docs/README.md` as well.

1. **`source.config.ts` may only export collections.** Exporting the generator
   from it fails the whole build with
   `Unknown export "generator", you can only export collections from source
   configuration file.` The generator therefore lives in
   `apps/docs/src/lib/type-table-generator.ts` and `source.config.ts` imports it —
   the plan's §5 sketch was wrong on this point.
2. **The generator's file cache ignores options.** Its key is
   `${file.path}:${name}:${content}:${version}`, so a second call for the same
   file and type returns the first result whatever options it asks for. The
   app's shared generator cannot demonstrate `allowInternal`; the contract test
   uses an uncached `createGenerator({ cache: false })` for that one assertion
   and says why. No page may generate the same type twice with different options.

Evidence:

- `nub run --filter docs test` → **11 files, 50 tests passed** (was 10 files, 46).
- Two-direction proof (1): with `/** @internal */` removed from the fixture,
  `reads every public prop…` and `hides an @internal prop…` both fail; restored →
  passes.
- Two-direction proof (2): with `name="CaptureProvenence"` in `api-reference.mdx`,
  `generates a table with props from every auto-type-table on a page` fails with
  `api-reference.mdx: CaptureProvenence generated no props`; restored → passes.
- `nub run --filter docs build` exit 0; `curl
  http://localhost:3000/docs/api-reference` returns
  `type-table-captures.ts-CaptureProvenance-{platform,command,capturedAt,commit,gpuixVersion}`.

## 10. Acceptance criteria

- [ ] The generator is exported once from `source.config.ts` and used by the page
      pipeline and the test.
- [ ] `type-table.test.ts` pins the tsdoc contract (`@internal` hidden by
      default, optional props optional, descriptions, unknown name → `[]`), with
      both directions shown.
- [ ] `content-references.test.ts` fails when a page's type-table `name` does not
      resolve, in addition to the existing path check.
- [ ] `api-reference.mdx` renders a real table, verified against the dev server.
- [ ] Plan 411 records T4 done and the STOP condition answered; `apps/docs/README.md`
      documents the contract.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass; committed on
      `agent/docs-site` and pushed.
