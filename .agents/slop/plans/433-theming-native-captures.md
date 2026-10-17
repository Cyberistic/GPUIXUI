# 433 — Curated native theme captures on the Theming page

**Phase:** F (docs evidence) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 412 (preview strategy + sidecar contract), 416/430 (Theming),
playground 140/150 (the binding and the theme gallery)
**Supersedes:** the docs-site half of the playground's open "committed images"
task.

## 1. The gap

The preview strategy's primary evidence tier is a **real native screenshot**
(tier S), but every component page is tier V because no capture is published.
The playground can capture frames (`--screenshots`), yet its `.artifacts` are
gitignored and have **no provenance sidecar**, so the docs may not publish them
(plan 412 §5: a caption may only echo a sidecar the capture wrote).

The docs' own question — "do we commit a curated set, and how is it refreshed?" —
had no answer. The Theming page, whose claims are about paint, had no real frame
at all.

## 2. Decision

**Commit a small, curated set of real native frames with a sidecar written from
the actual capture run. Never commit the raw `.artifacts` tree.**

Rules:

- Only frames the docs actually render are copied, under
  `apps/docs/public/screenshots/<subject>/`.
- One `provenance.json` per directory, written from the run: `platform`,
  `gpuixVersion`, `commit`, `command`, `capturedAt`; the commit is the commit
  the capture ran at (the merge commit when the run followed it).
- The command is the exact reproducible command, with no temp paths:
  `nub apps/playground/dist/smoke/run.js --screenshots` after
  `nub run --filter playground build`.
- The sidecar is validated by `captures.test.ts`; a frame without one is **not
  rendered** — the page names the missing file instead.
- A capture is refreshed by re-running the command and re-copying the frame; a
  stale commit in the caption is visible on purpose.

## 3. What ships

| File | Purpose |
| ---- | ------- |
| `apps/docs/public/screenshots/theming/theme-color-roles.png` | the 47-role gallery from `theme-color-roles` |
| `apps/docs/public/screenshots/theming/theme-type-and-shadow.png` | type roles + focus ring + elevation from `theme-type-and-shadow` |
| `apps/docs/public/screenshots/theming/provenance.json` | the sidecar from the real run |
| `apps/docs/src/components/preview/theme-captures.tsx` | `<ThemeCaptures />` — selects proven frames, renders `<NativeScreenshot>`, reports a missing one |
| `apps/docs/src/components/preview/theme-captures.test.tsx` | selector + render + no-invented-provenance tests |
| `apps/docs/src/components/mdx.tsx` | registers `<ThemeCaptures />` |
| `apps/docs/content/docs/theming.mdx` | `## Native evidence` with the captures and the refresh command |
| `docs/preview-strategy.md` | records the curation rule |

No component record is changed: no per-component screen exists yet, so component
pages stay tier V (plan 432). The Theming frames are page evidence, not a
component preview.

## 4. Capture record (measured)

- `nub run --filter playground build` — exit 0.
- `nub apps/playground/dist/smoke/run.js --screenshots` — **20/20 scenarios
  passed**, `theme=verified`, exit 0.
- Host from the report: `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0`.
- Commit: `7fd029f` (the playground merge into `agent/docs-site`).
- `startedAt`: `2026-10-17T15:47:15.213Z`.
- The two frames were copied from `apps/playground/.artifacts/screenshots/`;
  the artifacts themselves stay gitignored.

## 5. Tests

1. `selectThemeCaptures` returns both frames with a sidecar and names the one
   that is missing without one — the second half proves the selector is not
   just reading a file name.
2. `<ThemeCaptures />` renders both image paths and the caption
   `Captured from GPUix — darwin-x64, GPUix 0.10.0, 7fd029f`.
3. It never prints a platform or version the sidecar does not contain.
4. `captures.test.ts` (existing) decodes the new sidecar through the same schema
   the site renders from.

Two-direction proof: temporarily rename `provenance.json`; the render test
fails on the missing caption and the component reports both frames as unproven;
restore it and the suite passes. (The sidecar suite decodes what exists; it does
not require a particular directory, so the render test is the guard that the
page's frames stay proven.)

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; the new file included |
| `nub run --filter docs check-types` | 0 |
| `nub run --filter docs build` | 0 |
| `nub run check` / `nub run lint` | 0 |
| dev `/docs/theming` | 200, both `<img>` paths and the caption present |

## 7. STOP conditions

- No binding on the host: **do not** copy an old artifact or a screenshot from
  another tree; record the limitation and keep tier V. A capture with no fresh
  run is not evidence.
- The run is not 20/20: stop; a failing theme scenario is a package regression,
  not a docs problem.
- The sidecar's values cannot be read from the run: stop and add the field to
  the capture script rather than guessing (no invented provenance).
- A frame is added to the page without a sidecar: the guard fails; fix the
  sidecar, do not weaken the guard.

## 8. Acceptance

- The Theming page shows two real GPUix frames with captions built from a
  sidecar that matches the measured run.
- `apps/playground/.artifacts` remains untracked; only two curated PNGs and one
  sidecar are committed.
- Every docs gate passes; the refresh recipe is documented in the page and in
  `docs/preview-strategy.md`.

## 9. Progress (2026-10-17)

Implemented. Measured: 20/20 captured, frames committed, `ThemeCaptures` guarded
by three tests plus the existing sidecar suite. Note: the plan was written after
the capture run and the component, not before it — the command and provenance
above are the run that produced the committed files, so the evidence is
unchanged; the ordering is recorded here rather than hidden.
