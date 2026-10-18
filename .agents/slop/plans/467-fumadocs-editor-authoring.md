# 467 — Fumadocs Editor for authoring the docs (plan 435b)

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410 (the site), 414 (real source includes), 423/425/461 (the pages)
**Source queue item:** `.agents/slop/plans/435-pele-fumadocs-editor-rtl.md` §435b.

## 1. Why

Component pages are hand-written MDX: prose, tables, code fences, frontmatter,
Fumadocs' own components and this site's JSX (`<NativePreview>`, `<include>`,
`<ComponentState>`, `<TokenScales>`). A WYSIWYG authoring surface lowers the
cost of a one-sentence fix without changing the reader's site.

The Fumadocs Editor (`@fumadocs-editor/*`, MIT, by the Fumadocs author) makes
an MDX file editable and claims **untouched blocks serialize byte-for-byte**,
so a one-line edit stays a one-line diff. The reader stays the existing
Fumadocs app; this adds an authoring command only.

**Decision: use Studio, not an in-app route.** Studio (`fumadocs-studio`) opens
the editor against a directory from the terminal. It needs no route, no
server, no auth story and no production code, so the deployed Worker cannot
expose a writing surface at all — stronger than a dev-only route. The editor
stays a `devDependency` and nothing in `src/` imports it.

## 2. What changes (exact files)

| File | Change |
| ---- | ------ |
| `apps/docs/package.json` | Add exact devDependencies `@fumadocs-editor/core`, `@fumadocs-editor/ui`, `@fumadocs-editor/studio`; add script `"studio": "fumadocs-studio"`. |
| `apps/docs/fumadocs-studio.config.ts` | **New.** `defineConfig({ root: "content/docs", components: [...fumadocsUiComponents, admonitionSpec], theme: "system" })`. |
| `apps/docs/src/editor-roundtrip.test.ts` | **New guard.** Every `content/docs/**/*.mdx` file parses and serializes to the exact same bytes. |
| `apps/docs/README.md` | Document the authoring command, the byte-for-byte contract, the experimental status, and that custom docs JSX is preserved verbatim until it earns a spec. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Tick `435b` in the docs workstream and keep the count current. |
| `LICENSES/` | Record the MIT licence and the fact that this is a dev-only authoring dependency (row in the licence inventory). |

Version pins are exact (`-E`) because the ecosystem is pre-v1 and a minor bump
may change the serialization contract the guard proves. Re-verify with the
commands in §5 before bumping.

## 3. The guard

`apps/docs/src/editor-roundtrip.test.ts`:

1. Walk `content/docs` for `.mdx` files (recursive, sorted).
2. Build one syntax with `createSyntax([...fumadocsUiComponents, admonitionSpec])`.
3. For each file: `parseMdxToDoc(source, syntax)` then
   `serializeDocToMdx(doc, snapshot)`; assert byte equality and collect the
   file's relative path on failure.
4. Assert the walked set is non-empty and equals the known page set (at least
   60 files), so a deleted directory cannot pass the guard.
5. Parse failures are failures naming the file, never a skip.

The test reads fixed repository files at import/test time; `readFileSync` is
the boundary (same pattern as `content-references.test.ts`).

## 4. STOP conditions

- Any shipped page does not round-trip byte-for-byte, or throws: **stop**, keep
  the editor out of the repo, and record the exact file and the differing
  region in `TODO.md`. Do not normalise the page to fit the editor.
- Studio cannot start on Node 24 (it requires Node ≥ 24) or cannot read
  `content/docs`: stop and record the failure; do not add an in-app route as a
  workaround.
- A dependency install changes the docs build's production dependency graph:
  stop and keep the editor a separate, explicitly optional command.
- The editor requires auth or a network service to save locally: stop; the file
  must stay the source of truth.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub install` | exit 0; the three packages resolve from the pinned versions |
| `nub run --filter docs test` | exit 0; the new guard passes for every page |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0; no editor module in the output |
| `nub run --filter docs studio --no-open --port 5187` | starts; prints the local URL; `curl` of that URL returns 200 |
| `nub run check` / `nub run lint` / `nub run test` | repository gate green |

## 6. Test plan (both directions)

1. **Round-trip failure:** append a line of malformed JSX (`<Unclosed>`) to
   `content/docs/installation.mdx`, run the guard, and record the failure naming
   that file; restore the page and re-run green.
2. **Vacuous-pass guard:** temporarily point the walk at a name that matches
   nothing and confirm the non-empty assertion fails; restore.
3. **Production isolation:** after `nub run --filter docs build`, grep the
   output for `fumadocs-editor` / `MdxEditor`; nothing matches.
4. **Authoring proof:** open one component page in Studio, change one sentence,
   save, and confirm `git diff` is exactly that line (record the page and diff
   in §8). No other block changes.

## 7. Acceptance

- `nub run --filter docs studio` opens the real content tree and saves to disk.
- The guard proves every shipped page round-trips byte-for-byte; the four
  proofs above are recorded.
- No editor code or dependency reaches the built site or the Worker.
- The README, licence inventory, plan index and `TODO.md` are current; the
  commit is pushed on `agent/docs-site`.

## 8. Progress

- **Installed** `@fumadocs-editor/core@0.4.1`, `ui@0.5.1` and `studio@0.2.4`
  as exact devDependencies; `fumadocs-studio.config.ts` opens `content/docs` with
  the Fumadocs UI components and the admonition spec.
- **The guard passes for all 84 pages** (`src/editor-roundtrip.test.ts`, 3
  tests): byte-for-byte serialization, the non-empty tree assertion, and an
  edited-heading test that asserts only the edited line changes.
- **Two directions, measured and reverted:**
  - appending `<Unclosed>` to `installation.mdx` failed with
    `installation.mdx: 1:1: Expected a closing tag for <Unclosed>` — a parse
    throw is reported as that page's failure, not a bare position;
  - pointing the walk at an empty directory failed with
    `expected 0 to be greater than or equal to 60`.
- **Production isolation:** after `nub run --filter docs build`, grepping
  `apps/docs/dist` for `fumadocs-editor` returns nothing.
- **Studio:** `nub run --filter docs studio --no-open --port 5189` starts on this
  host, reads `content/docs` and serves `200`; it was stopped after the check.
- The `LICENSES/` row for the MIT dev-only dependency is recorded as a
  cross-team task in `TODO.md` (`LICENSES/` belongs to the licensing workstream).
- **Gates on 2026-10-18 after the proof edits were reverted:** `docs` 43 files /
  265 tests green (the repo-wide run later saw 44 / 271 with the concurrent
  plans); `docs check-types`, `docs build`, `nub run check`, `nub run lint` and
  `nub run test` all exit `0`. The first build attempt was killed by a duplicate
  writer; the successful build ran with no other build active, and `dist`
  contains no `fumadocs-editor`, `MdxEditor` or `tiptap` string.
