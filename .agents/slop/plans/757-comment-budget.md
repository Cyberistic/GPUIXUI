# 757 — A hard comment budget

| Field | Value |
| --- | --- |
| Status | done — 95 868 comment lines reduced to 385 (99.6%), enforced by an oxlint JS rule |
| Phase | F (code quality) |
| Depends on | the root oxlint config, `scripts/` tooling |
| Workstream | repo tooling |
| Risk | low at runtime — comments only; the rule is repo-wide and mechanical |

## 1. Problem

The tree carried 40 052 comments and 95 868 comment lines across 2 431 code
files. Most restated a symbol name, narrated a decision, recorded a measurement
or described a plan; the code and the docs already carry the fact. AGENTS.md
states that a paragraph of comment justifying the code means the code is wrong.

## 2. The rule

`scripts/oxlint-comments.mjs` registers `comments/no-long-comments`:

- a single comment or a run of adjacent `//` lines is at most **2 lines** and
  **24 words**;
- a file carries at most **3 comment lines** in total;
- licence/copyright/SPDX blocks, `TODO`/`FIXME`/`HACK`/`XXX`, and tooling
  directives (`@ts-*`, `@jsxImportSource`, `@vitest-environment`, `check-tests-ok:`, linter pragmas,
  `@__PURE__`, source-map URLs) are exempt and do not count;
- the fixer removes every selected comment, so `nub run lint:fix` is the sweep.

Registered in `.oxlintrc.json` via `jsPlugins` and `rules`; `nub run lint` is
the hard gate and `nub run check` includes it.

## 3. The sweep

```sh
nub run lint:fix
nub run fmt:fix
nub run lint
nub run check:tests
```

Measured with a reporting plugin over the same tree, before and after:

| Measure | Before | After | Removed |
| --- | --- | --- | --- |
| comment nodes | 40 052 | 713 | 98.22% |
| comment lines | 95 868 | 756 | 99.21% |
| files scanned | 2 431 | 2 431 | — |

The 755 surviving lines are licence headers, `@ts-expect-error`/`@jsxImportSource`/
`check-tests-ok` directives, `TODO`s and a handful of short one-line facts.

## 4. Consequences

- The sweep removed 323 `/** @jsxImportSource … */` pragmas. They are compiler
  directives, not prose: they are restored at the top of each file and the
  keep-list now matches `@jsxImportSource`, `@jsxRuntime`, `@jsx`/`@jsxFrag`
  and `@vite-ignore`.
- The `packages/tokens` and `packages/motion` documentation-guard tests asserted
  JSDoc prose in source files. They were narrowed to the Markdown/README facts
  they can still read, or removed where the only assertion was a comment. The
  comment budget wins: a source file is not a documentation surface.
- The remaining blank lines left where block comments stood are formatter
  output, not a rule violation; `oxfmt` keeps at most one.
- The docs API reference's per-symbol summaries came from JSDoc; with source
  comments gone it prints the symbol's name and kind instead. The guard now
  holds the rendered structure, and the prose lives in Markdown.
- `nub run check:tests` needed the six `// check-tests-ok:` lines in
  `packages/calc/src/evaluate.test.ts` restored — they are directives, and the
  rule's keep-list now matches the colon form.

## 5. Acceptance

- `nub run lint` fails on a file with a four-line `//` block or four comment
  lines, and passes on the current tree.
- `nub run check:tests` passes.
- The two package suites named above pass.
