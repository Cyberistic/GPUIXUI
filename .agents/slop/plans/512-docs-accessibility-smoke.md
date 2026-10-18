# 512 — The docs site is accessibility-checked in a real browser

**Owner:** docs-site workstream · **Phase:** F/G · **Depends on:** 410, 416,
439, 446, 495, 498, 502, 509, 511 · **Status:** planned

## 1. Why

`MISSION.md` requires accessibility considerations on every component page and
a docs site that is usable in both themes. The existing gates cover the pieces
we remembered: heading order (plan 499), contrast of **code** leaves (plan 498),
the focus ring and skip link (plan 496), responsive layout at 390 px (plan 502),
and the theme/platform switches (plans 509, 511). None of them runs a
conformance rule set over the whole page.

A one-off sweep with **axe-core 4.10.2** (WCAG 2.1 A/AA tags) over the built
site, 90 sitemap pages, found 11 violation nodes on 7 page loads:

| Rule | Pages | What it is |
| ---- | ----- | ---------- |
| `list` | `/` | two `<ul aria-label="… colour roles">` whose `<li>` children carry `role="img"`, so axe sees non-list children |
| `scrollable-region-focusable` | `/docs/capabilities`, `/docs/data-display` | the `.overflow-x-auto` table wrapper scrolls with no keyboard path |
| `color-contrast` | `/docs/components/button`, `/docs/components/label`, `/docs/components/rating`, `/docs/theming` | 6 nodes, all preview fragments dimmed with `opacity: 0.5`: the disabled Button (3.05:1), the Label page's invented "disabled" caption and the Rating page's "No rating yet" caption (2.86:1) |

All six contrast nodes are **docs-owned preview defects**, not token defects:
the real `Label` has no disabled state and the real `Rating` does not dim its
caption, so the preview invented both. The disabled Button keeps the library's
`opacity: 0.5`; a disabled control is exempt from WCAG 1.4.3, and axe skips an
element carrying `aria-disabled="true"` (measured: an `aria-disabled` span with
the same colours is not flagged, a plain one is), so the honest fix is the
semantics it already depicts.

The fix is not one patch: it is a gate that keeps the next page honest.

## 2. Files

Create:

| Path | Purpose |
| ---- | ------- |
| `apps/docs/src/accessibility/report.ts` | Pure report model: page/scheme/violation types, the human-readable lines, the exit code |
| `apps/docs/src/accessibility/report.test.ts` | Unit suite for the above |
| `apps/docs/scripts/smoke-a11y.ts` | The browser gate: sitemap → both schemes → axe → exit `0`/`1`/`2` |

Change:

| Path | Change |
| ---- | ------ |
| `apps/docs/package.json` | `axe-core@4.10.2` devDependency; `smoke:a11y` script |
| `apps/docs/src/components/landing.tsx` | keep `role="img"` on an inner `<span>`, leave `<li>` a list item |
| `apps/docs/src/components/capability-matrix.tsx` | the scroll wrapper becomes a labelled, focusable region |
| `apps/docs/src/components/preview/approximations.tsx` | the disabled Button preview carries `aria-disabled="true"` |
| `apps/docs/src/components/preview/control-previews.tsx` | Rating: dim the empty stars, not the caption |
| `apps/docs/src/components/preview/layout-previews.tsx` | Label: drop the invented opacity (the real `Label` has no disabled state) |
| `apps/docs/content/docs/contributing.mdx` | a `smoke:a11y` row with what it proves and its codes |
| `apps/docs/README.md` | the check list and a short section |
| `docs/preview-strategy.md` | the a11y sweep covers previews; disabled controls are marked |
| `.agents/slop/plans/README.md` | index row |
| `TODO.md` | the task row, ticked |

## 3. Steps

1. **Dependency.** Add `"axe-core": "4.10.2"` to `apps/docs` devDependencies.
   Run `nub install` at the repo root. Expected: the lockfile gains axe-core,
   no other version moves. Justification: Deque's rule engine is the one
   Lighthouse uses; it is a dev-only, browser-injected script, not a runtime
   dependency.
2. **Pure report module.** `report.ts` exports:
   - `type Scheme = "light" | "dark"`;
   - `interface Violation { readonly rule: string; readonly impact: string; readonly targets: ReadonlyArray<string>; readonly summary: string }`
     and `interface PageReport { readonly path: string; readonly scheme: Scheme; readonly violations: ReadonlyArray<Violation> }`;
   - `reportLines(report): ReadonlyArray<string>` — one line per violation,
     `path [scheme] rule — target` plus the first line of the failure summary;
   - `exitCode(reports): 0 | 1` — `1` when any report has a violation.
   Keep it free of DOM and axe imports so it is unit-testable.
3. **The smoke.** `scripts/smoke-a11y.ts` follows the guards of plans
   502/509/511:
   - options `--base-url`, `--chrome`, `--no-build`, `--only <path>`, `--help`;
   - build + serve through `startDocsPreview`, or use `--base-url`;
   - pages from `/sitemap.xml` (the same rule as `smoke:responsive`), so a new
     page joins by existing; `--only` narrows for a local loop;
   - one Chrome session, `setViewport(1280, 900)`, and for each page in each
     scheme: `setColorScheme`, navigate, wait for the document's `dark` class
     to match the scheme and for `document.readyState === "complete"`, then
     inject `axe.source` and run
     `axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })`;
   - print one line per violation with the page, scheme, rule, target and the
     failure summary; on success print
     `a11y: <n> pages × 2 schemes, 0 violations`;
   - exit `0` pass, `1` a violation, `2` setup failure (`SetupError`), matching
     every other smoke.
4. **Markup fixes.**
   - Landing: `<li>` stays the list item; the swatch becomes
     `<span role="img" aria-label=… title=…>`. Nothing else changes.
   - Capability matrix: the wrapper gets `role="region"`,
     `aria-label="Measured GPUix capabilities"` and `tabIndex={0}`. The
     existing `:where(…, [tabindex]):focus-visible` rule paints the ring
     (plan 496), so no new CSS.
   - Disabled Button preview: add `aria-disabled="true"`.
   - Rating: move `opacity: 0.5` from the row to the stars alone; the caption
     keeps `var(--preview-color-mutedForeground)` at full opacity.
   - Label: remove the `opacity: 0.5` wrapper; the caption and name are the
     real roles.
5. **Docs.** Add the `smoke:a11y` row to the Contributing table and the README
   check list; note in `docs/preview-strategy.md` that the whole site — preview
   surfaces included — is swept in both schemes, that a disabled control is
   marked `aria-disabled` rather than excluded, and that the sweep is not a
   substitute for the keyboard smoke. Tick the TODO row and index this plan.

## 4. Two-direction proofs

Record each in §8 after it is measured; do not claim one that was not run.

1. **A removed `tabIndex` is caught by name.** Delete `tabIndex` from the
   capability-matrix wrapper, run
   `nub scripts/smoke-a11y.ts --no-build --only /docs/capabilities`; expect exit
   `1` and a line naming `scrollable-region-focusable`. Restore → exit `0`.
2. **A restored dimmed caption is caught.** Put `opacity: 0.5` back on the
   Rating caption, run
   `nub scripts/smoke-a11y.ts --no-build --only /docs/components/rating`;
   expect exit `1` with `color-contrast` and the 2.86:1 summary. Restore →
   exit `0`.
3. **The scheme half really runs.** Force both iterations to `light` in a
   scratch edit and run a page whose failure is dark-only after reintroducing
   defect 2; expect the light run to pass while the real build fails in dark.
   Restore. (If no defect is dark-only, report that the scheme loop is proved by
   the printed `n pages × 2 schemes` count and the dark-mode measurement
   instead.)
4. **The report rules fail both ways.** `report.test.ts` asserts an empty set is
   `0` with no lines, and a violation is `1` with the path, scheme, rule and
   target in the line. Removing any field from `reportLines` fails it.

## 5. Test plan

- `src/accessibility/report.test.ts`: empty → `0`; one violation → `1`;
  the line names the path, scheme, rule, target and summary; targets print
  once each. These test the gate's output, which is what a failing run has to
  be readable enough to act on.
- `smoke:a11y` itself is the acceptance: 90 pages × 2 schemes, zero
  violations.
- The Contributing guard (`src/contributing.test.ts` or the script-table guard
  from plan 470) fails if `smoke:a11y` is in `package.json` and not on the page;
  confirm it picks the new row up without a change to the guard.
- `nub run --filter docs test` — all suites green.
- `nub run --filter docs check-types`, `nub run lint`, `nub run fmt`.

## 6. Commands and expected results

```sh
nub install                                   # axe-core linked
nub run --filter docs test                    # 65 files, all green
nub run --filter docs check-types             # exit 0
nub run --filter docs smoke:a11y              # 90 pages × 2 schemes, 0 violations
nub run --filter docs smoke:build             # unchanged, exit 0
nub run --filter docs smoke:keyboard          # unchanged, exit 0
nub run check                                 # test-quality, lint, fmt, types
```

`smoke:a11y` builds unless `--no-build` is passed; a run takes a few minutes
because it loads 180 documents.

## 7. STOP conditions

- **Stop** if a violation remains that is caused by a library token value or a
  component implementation rather than by docs markup. Record the page, rule,
  measured pair and the owner in `TODO.md`; do not edit `packages/*`, and do not
  add a blanket exclusion that would hide the next defect.
- **Stop** if axe needs network access to run. It ships with the devDependency
  and must be injected from `axe.source`; a CDN fetch is not a gate.
- **Stop** if a fix would change what a preview depicts (for example lightening
  the disabled Button instead of marking it disabled). The preview mirrors the
  library; the label is the honest place to say it is approximate.
- **Stop** if `nub run check` fails for a reason outside `apps/docs`; report it
  rather than editing another workstream's files.

## 8. Results

### The sweep

Measured 2026-10-18 on the production build, one Chrome session, 1280×900,
`wcag2a wcag2aa wcag21a wcag21aa`:

| Run | Result |
| --- | ------ |
| Before the fixes (90 pages, default scheme) | 7 page loads with 11 violating elements: 2 `list`, 2 `scrollable-region-focusable`, 6 `color-contrast` |
| After the fixes | `a11y: 90 pages × 2 schemes, 0 violations`, exit `0` |

The 250 ms settle the first version used was itself a defect: the document's
`dark` class lands **before** the preview surfaces repaint, so the dark pass
audited light-mode previews (measured: Checkbox's surface was
`rgb(246, 248, 250)` immediately after `dark` was set and
`rgb(17, 20, 26)` two seconds later). `open` now waits for every
`[data-preview-surface]` to paint the scheme's `background` token, imported from
`@gpuixui/tokens`. That is why the Rating proof below reports both real
schemes' ratios instead of the same light pair twice.

### Two-direction proofs

1. **The scroll region is guarded by name.** Deleting `tabIndex={0}` from
   `capability-matrix.tsx`, rebuilding and running
   `smoke-a11y.ts --no-build --only /docs/capabilities` exited `1` in both
   schemes:
   `scrollable-region-focusable (serious) — .overflow-x-auto: Element should
   have focusable content`. Restoring the attribute and rebuilding exited `0`.
2. **A dimmed caption is guarded.** Restoring `opacity: 0.5` on the Rating empty
   row, rebuilding and running `--only /docs/components/rating` exited `1`:
   `2.17` light (`#a5abb3` on `#f6f8fa`) and `2.86` dark (`#595f69` on
   `#11141a`). Removing it again exited `0`.
3. **The report cannot lose a field.** Replacing `${violation.target}` with a
   second `${violation.rule}` in `reportLines` failed
   `names the page, scheme, rule, impact and target` (1 failed, 447 passed);
   restoring the template passed 448.
4. **The Contributing guard sees a new script.** Adding `smoke:a11y` to
   `apps/docs/package.json` before adding its row failed
   `names every docs-site smoke check` with `missing: ["smoke:a11y"]`; adding
   the row passed. That is the guard plan 470 promised working on the next
   script, with no change to the guard.

### Cost

A full run loads 180 documents and takes a few minutes; `smoke:a11y` is a
release-gate check, not a per-edit one. `--only <path>` keeps the local loop to
two loads.
