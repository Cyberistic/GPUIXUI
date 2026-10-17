# 450 — Preview coverage prose: stop hand-counting previews

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 412, 424, 426, 449.

## 1. Why

Plan 449 grew the tier-A preview registry from four to twelve. Four prose pages
still say **four**: `architecture.mdx`, `capabilities.mdx`,
`getting-started.mdx` and `examples/index.mdx`. The site builds and every link
resolves, so `prose-truth.test.ts` did not notice — it guards package/example
claims, not counts.

The number is the defect, not the sentence. A hand-copied total drifts on the
next preview. This plan removes the total from prose and makes the registry the
only count, with a guard that fails when a page states a different number.

## 2. Files

**Change**

- `apps/docs/content/docs/architecture.mdx` — replace "four carry a labelled
  approximation" with the rule, not a total.
- `apps/docs/content/docs/capabilities.mdx` — same for "four labelled browser
  approximations".
- `apps/docs/content/docs/getting-started.mdx` — same for "four pages carry a
  labelled browser approximation".
- `apps/docs/content/docs/examples/index.mdx` — same for "four carry a labelled
  browser approximation".
- `apps/docs/README.md` — "Twelve component pages carry a tier-A preview" loses
  the number for the same reason.
- `apps/docs/src/prose-truth.test.ts` — add the count guard (§3).

**Create:** none.

## 3. The guard

In `apps/docs/src/prose-truth.test.ts`:

1. Import `previewsBySlug` from `./components/preview/approximations`.
2. Define `previewCountClaims(body)` — find a number word or digit followed
   within 64 characters by `approximation`/`approximations` (case-insensitive)
   and return the parsed numbers. It must catch both shipped wordings:
   "four carry a labelled approximation" and "four labelled browser
   approximations".
3. Test A (parser): `previewCountClaims` returns `[2]` for
   `"two labelled browser approximations"` and `[4]` for
   `"four carry a labelled approximation"`. This keeps the rule from passing
   vacuously once the pages stop stating a total.
4. Test B (truth): every claim found in `content/docs/**/*.mdx` equals
   `previewsBySlug.size`; report `<path>: claims <n>, registry has <m>`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass, including the two new tests |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | the §7 gate in `AGENTS.md` |

## 5. Two-direction proof

1. Before the prose edit, add the guard and run the docs suite: it must fail on
   the four pages with `claims 4, registry has 12`.
2. Fix the prose: the suite must pass.
3. Temporarily change one fixed sentence back to "four labelled browser
   approximations": the suite must fail again; restore it.

Record the actual failures in §6.

## 6. STOP conditions

- A page needs the total to make sense: stop and report. Do **not** generate
  the number in MDX; there is no live registry in prose, and a hand-copied total
  is the bug this plan removes.
- The parser matches a legitimate non-preview number (for example "four tones"
  near an unrelated "approximation"): narrow the lookahead window, do not drop
  the check.
- The test imports a module that pulls GPUix or a component runtime into the
  docs bundle: stop — the docs site reads source only (`architecture.test.ts`).

## 7. Acceptance

- No content page states a preview total; the four stale "four" claims are gone.
- A page that states a total different from `previewsBySlug.size` fails the
  suite; the parser itself is covered by an assertion that can fail.
- All gates green; `apps/docs/README.md`, the plan index and `TODO.md` updated;
  committed and pushed on `agent/docs-site`.

## 8. Progress (2026-10-17)

- The four pages and `apps/docs/README.md` now describe the rule ("the static
  pages carry a labelled approximation") instead of counting.
- `previewCountClaims` and the two tests live in
  `apps/docs/src/prose-truth.test.ts`.
- Two-direction proof: with the guard added and the prose untouched the suite
  failed with `architecture.mdx: claims 4, registry has 12` (and the same for
  `capabilities.mdx`, `getting-started.mdx`, `examples/index.mdx`). The first
  version of the rule missed two of them because MDX wraps the sentence across
  a line; allowing one wrapped line in the lookahead caught all four. After the
  prose edit it passed. Reverting `architecture.mdx` to "four labelled browser
  approximations" failed again; restoring it passed.
- `nub run --filter docs test` — 39 files / 231 tests; type-check, build, check,
  lint and the repository test suite green.
