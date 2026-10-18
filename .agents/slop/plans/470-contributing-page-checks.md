# 470 — The Contributing page names every docs-site check, and a guard refuses silent additions

**Phase:** F (release workflow truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410 (the site), 439 (`smoke:build`), 446 (`smoke:browser`), 455 (`smoke:preview`), 467 (Studio authoring)

## 1. Why

`apps/docs/content/docs/contributing.mdx` is the reader-facing answer to "what
must pass before I ship a docs change". It names one docs check (`smoke:build`)
and the three workspace gates. Since then the site gained three more checks that
the release process actually relies on:

| Script | Appeared in | Proves |
| ------ | ----------- | ------ |
| `smoke:browser` | plan 446 | the production build hydrates, and every preview surface paints the right dark/light palette and platform |
| `smoke:preview` | plan 455 | every live GPUix scene reaches GPUI's tree in headless Chrome, and the page wiring and `?platform=` reach it |
| `studio` | plan 467 | the dev-only authoring surface (`nub run --filter docs studio`) |

A contributor reading the page cannot know those gates exist, cannot interpret
their exit `2` ("could not verify"), and cannot find the authoring command. The
page is also the only place a reader learns the docs are authored in MDX.

Nothing compares the page to the app's real scripts, so the next smoke check
will drift the same way. This plan fixes the copy and makes the agreement
testable.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/contributing.mdx` | Rewrite the **Docs site** section: a table of every docs check with what it proves and its exit codes; one line on Studio authoring pointing at `apps/docs/README.md`. |
| `apps/docs/src/docs-checks.test.ts` | **New guard** (§4): the page contract and every docs command in the content tree. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Tick the new row in the docs-site section and keep the count current. |

No other page changes. Do not restate the per-check details in the Theming or
Installation pages; link here.

## 3. The page edit

Keep the frontmatter and the first three sections. Replace the current
`## Docs site` body with:

```mdx
## Docs site

`apps/docs` is a Fumadocs app. Its unit suite reads the content source and the
component registry; the smoke checks drive the built site in a real browser.
Run every check your change can affect:

| Command | What it proves | Exit codes |
| ------- | -------------- | ---------- |
| `nub run --filter docs test` | pages, registry, links, search, previews | `1` on a failure |
| `nub run --filter docs check-types` | the app, the preview document and MDX types | `1` on a type error |
| `nub run --filter docs build` | the production Worker bundle builds | `1` on a build error |
| `nub run --filter docs smoke:build` | every sitemap page renders in the production output, every internal link resolves, search answers, an unknown slug is a 404 | `1` broken, `2` could not verify |
| `nub run --filter docs smoke:browser` | the built site hydrates; every preview surface paints the theme and platform the toggles publish | `1` wrong paint, `2` could not verify |
| `nub run --filter docs smoke:preview` | every live GPUix scene reaches the renderer in headless Chrome, and the page wiring passes the platform | `1` scene failure, `2` could not verify |

The smokes exit `2` when Chrome or the server is missing. An unverified site is
not a passing one: treat `2` as "run it where the check can run", never as a
pass.

### Authoring

The pages are plain MDX. Fumadocs Studio edits them in place without rewriting
untouched blocks; it is a dev-only command and is never part of the built site:

```sh
nub run --filter docs studio
```

`apps/docs/README.md` carries the editor's contract and the round-trip guard.
```

## 4. The guard — `docs-checks.test.ts`

Header comment states the bug being guarded: *the page named one docs check
while the app shipped four; nothing compared the prose to the scripts.*

1. Read `apps/docs/package.json` and take every script key matching `^smoke:`.
2. Read `apps/docs/content/docs/contributing.mdx`.
3. Assert the script set is non-empty (so a rename that empties it fails).
4. Assert every `smoke:*` script name appears in the page, with both lists
   printed on failure (`page is missing: smoke:<name>`).
5. Assert the page names `studio` and `nub run --filter docs test`.
6. Assert every documented smoke command carries the exit-`2` sentence at least
   once (the phrase `could not verify`), so the table cannot lose its meaning.
7. Walk `content/docs/**/*.mdx`, collect every
   `nub run --filter docs <script>` and assert the script is a key of the app's
   `scripts`. This is the general rule the page-local checks specialise: a
   renamed script leaves a dead command in any page, and only this test reads
   every one.

`readFileSync` at import time is the repo's test boundary (as in
`content-references.test.ts`). The test derives from files; no hard-coded script
list.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 0 failures; one new file, five new tests |
| `nub run --filter docs check-types` | exit `0` |
| `nub run check` | test-quality, lint, format and types green |
| `nub run --filter docs build` | exit `0` |
| `nub run lint` | exit `0` |

## 6. STOP conditions

- A `smoke:*` script exists but is not meant for contributors (for example a
  one-off): stop and record why in this plan; do not weaken the guard to a
  substring check.
- The page's section is generated by a component rather than written in MDX:
  stop and report; the copy would then live elsewhere.
- Documenting a check requires a claim that has not been measured: stop; the
  claim belongs in the owning plan, not this page.

## 7. Test plan (both directions)

1. Delete the `smoke:browser` row from the page → the guard fails with
   `page is missing: smoke:browser`; restore → green.
2. Add a `smoke:newcheck` script to `apps/docs/package.json` → the guard fails
   naming it; remove → green.
3. Delete the `could not verify` sentence → the guard fails; restore → green.
4. Rename a documented command to `smoke:missing` → the command guard fails with
   `contributing.mdx: no script "smoke:missing"`; restore → green.

Record the exact failure messages in §9.

## 8. Acceptance

- The page names every `smoke:*` script, `studio` and the docs unit suite, each
  with what it proves.
- The guard fails on a removed row, an added script and a lost exit-code
  sentence, each proven once and reverted.
- `nub run --filter docs test`, `check-types`, `build`, `nub run check`,
  `nub run lint` and `nub run test` are green; the commit is pushed on
  `agent/docs-site`.

## 9. Progress (2026-10-18)

- `contributing.mdx`'s **Docs site** section now lists six checks (`test`,
  `check-types`, `build`, `smoke:build`, `smoke:browser`, `smoke:preview`) with
  what each proves and its exit codes, the rule that `2` is never a pass, and
  the `studio` authoring command.
- `docs-checks.test.ts` derives the smoke list from
  `apps/docs/package.json` (`smoke:` keys) instead of hard-coding it; four
  tests cover the non-empty list, the documented names, the unit suite and the
  authoring command, and the `could not verify` sentence.
- Two-direction proofs, measured and reverted:
  - deleting the `smoke:browser` row → `expected [ 'smoke:browser' ] to deeply
    equal []`;
  - adding a `smoke:newcheck` script → `expected [ 'smoke:newcheck' ] to deeply
    equal []`;
  - replacing the `could not verify` sentence → `expected '---\ntitle:
    Contributing…' to contain 'could not verify'`.
- `docs-checks.test.ts` also walks `content/docs` and checks every
  `nub run --filter docs <script>` against `package.json`; every current page
  passes (7 commands, all real).
- `nub run --filter docs test`: 44 files / 271 tests green.
