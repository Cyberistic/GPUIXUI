# 489 — The License page names what is recorded, and what is still owed

**Phase:** F/G (release truth) · **Owner:** docs-site (the page only)
**Depends on:** 410 (site), the licensing workstream's first record
(`LICENSES/base-gpui.md`)

## 1. Why

`apps/docs/content/docs/license.mdx` says:

> Three files must exist before release; **none is written yet** (the inventory
> starts in Phase A …)

That is no longer true. `LICENSES/README.md` defines the evidence rule and
`LICENSES/base-gpui.md` records a verified reference (MIT, commit `64b2233`,
read from the clone). The page denies both, so a reader is told the project has
no licence record when it has one — the same class of truth failure plans
459/463/465 fixed on other pages.

The page also cannot drift safely: nothing compares its claims to the
`LICENSES/` directory, so the next recorded licence, or the release inventory
finally landing, would leave the page describing the wrong state.

The inventory/provenance/NOTICE files themselves are the **licensing
workstream's**; this plan edits only the docs page and adds a guard. It does not
write `LICENSES/`.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/license.mdx` | Rewrite into: the evidence rule; **Recorded today** (`LICENSES/README.md`, `LICENSES/base-gpui.md` with its verified licence and commit); **Still owed before release** (`inventory.md`, `provenance.md`, `NOTICE`, each with what it must answer); the identity rule. |
| `apps/docs/src/license-page.test.ts` | New guard (see §4). |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | Add and tick the row in the docs workstream. |

Nothing under `LICENSES/`, `packages/` or `docs/` changes.

## 3. The page

Sections:

1. **How a licence is verified** — read the licence file in the clone at a
   recorded commit; a README badge is not evidence. (Restated from
   `LICENSES/README.md`, which remains the source of truth.)
2. **Recorded today** — a table of the two real files and what each answers;
   `base-gpui.md` names MIT, the commit read, and the one thing we take from it
   (the compound-part contract, no source copied).
3. **Still owed before release** — `inventory.md`, `provenance.md`, `NOTICE`,
   each with its question; the page says these are pending, not written.
4. **Identity** — the package name, logo and wordmark are original; no
   third-party trademarks are copied.

The page names real paths only. It never states a licence for a project whose
file is not in `LICENSES/`.

## 4. Test plan — `apps/docs/src/license-page.test.ts`

| Test | Failure it must catch | Derivation |
| ---- | --------------------- | ---------- |
| names every recorded licence file | a new `LICENSES/*.md` lands and the page keeps denying it | `readdirSync(LICENSES)` compared with the backticked paths in the **Recorded today** section |
| names only files that exist there | a renamed or invented record | each recorded path is `existsSync` |
| keeps the owed list honestly owed | `inventory.md` lands and the page still calls it future work | each path in **Still owed before release** must **not** exist |
| states the licence its record states | `base-gpui.md` changes licence or commit and the page keeps the old one | read `Licence: <word>` from the record; assert the word and the commit appear on the page |
| no longer denies the record | the old "none is written yet" sentence returns | `none is written` / `nothing is recorded` wording guard |
| ships no placeholder prose | a "coming soon" replaces a real row | the standard word list |

Two-direction proofs (run, record in §7):

1. Delete the `base-gpui.md` row → test 1 fails naming the file.
2. Add `LICENSES/ghost.md` to the recorded table → test 2 fails.
3. Add `LICENSES/README.md` to the owed table → test 3 fails (it exists).
4. Change `MIT` to `Apache-2.0` on the page → test 4 fails.
5. Restore the old "none is written yet" sentence → test 5 fails.

## 5. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter docs test` | pass; each proof above fails when applied |
| `nub run --filter docs build` | exit `0` |
| `nub run --filter docs smoke:build` | exit `0`; `/docs/license` still renders and is in the sitemap |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 6. STOP conditions

- A licence file under `LICENSES/` states something the page would have to
  paraphrase into a claim it cannot prove (e.g. a dual licence): stop and show
  the record's own wording instead of summarising.
- The licensing workstream lands `inventory.md` while this runs: update the
  **Still owed** list in the same commit; do not name a file that exists as
  owed.
- `base-gpui.md` has no `Licence:` line: stop; the record is malformed and the
  licensing owner must fix it.

## 7. Progress (2026-10-18)

- Landed the rewritten page and `src/license-page.test.ts` (6 tests).
- Two-direction proofs, measured:
  1. deleting the `base-gpui.md` row failed `names every recorded licence file`
     (`- "LICENSES/base-gpui.md"`) and, because MIT lived in that row,
     `states the licence and commit its record states`;
  2. adding `LICENSES/ghost.md` failed the inventory test with
     `+ "LICENSES/ghost.md"` and `names only files that exist`;
  3. moving `LICENSES/README.md` into the owed list failed
     `keeps the owed list honestly owed` with `+ "LICENSES/README.md"`;
  4. changing `MIT` to `Apache-2.0` failed the licence test;
  5. restoring "none is written yet" failed `no longer denies the record`.
  Restoring each passed; no test was weakened.
- `nub run --filter docs test`, the docs build, `smoke:build`, `nub run check`,
  `nub run lint` and `nub run test` — see §8.

## 8. Acceptance

- `/docs/license` names every file under `LICENSES/`, states the recorded
  licence and commit, and names the three release files as owed.
- The guard is proven in both directions for every rule; the page remains in
  the sidebar, sitemap and search index.
- `TODO.md` and the plan index are current; the commit is pushed on
  `agent/docs-site`.
