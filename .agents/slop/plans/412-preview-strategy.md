# 412 — the docs preview strategy

- **Workstream:** docs-site
- **Phase:** A (decision + evidence) → B (mechanism) → C–F (per-page use)
- **Owns:** `docs/preview-strategy.md`, `apps/docs/src/components/preview/**`,
  `apps/docs/public/screenshots/**`
- **Depends on:** 001 (Phase A audit — the GPUix capability map, including whether the
  browser/Wasm build is usable), the playground workstream (`apps/playground`,
  `packages/testing`) for the native run path and screenshot capture
- **Depended on by:** every component page (plan 411)

The single hardest honesty problem in this repo: the library renders through **GPUix
(Metal/DirectX/Vulkan)**, the docs site is a browser app, and `MISSION.md` forbids
presenting a fake web version as native. This plan decides how the site shows a
component, and writes that decision down in `docs/preview-strategy.md`.

---

## 1. What we know (evidence, not assumption)

From the GPUix reference (`references/gpuix`, read-only):

- GPUix renders through GPUI in a native window (`README.md`: "GPUIX paints it with
  Metal, DirectX, or Vulkan. No Electron. No web view.").
- GPUix **does** have a browser target: `bun run web` renders the same React tree in
  a browser canvas via WebGPU/WebGL2 (wasm-bindgen). It requires **nightly Rust**,
  the matching `wasm-bindgen-cli` (0.2.127), a ~19 MB Wasm module, and the page must
  be cross-origin isolated:
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` on the top-level document.
- GPUix ships an **automation** API (`@gpuix/react/automation`): `launch({ env: {
  GPUIX_BACKGROUND: "1" } })`, then `getByTestId(...).click()/fill()/press()/waitFor()`
  and **`screenshot({ path })`, which reads the GPU surface**, all without stealing
  focus. This is how real native screenshots are produced.

From `MISSION.md` §"Native previews — be honest": choose the strongest honest
strategy among (1) embed a real native surface if supported; (2) a companion native
playground with run instructions; (3) browser previews **labelled as illustrative
approximations**; (4) source + real screenshots + a limitation notice.

## 2. Decision

**Primary (always): a companion native playground, with real screenshots.**
**Illustrative browser approximations only when labelled.** **Live embedding is
conditional on Phase A evidence and is not claimed until it is proven.**

Concretely, the ordered tiers below. Every preview on the site is one of them and
carries the label that names which tier it is.

| Tier | What it is | Label shown to the reader | When used |
| ---- | ---------- | ------------------------- | --------- |
| **N** | Real native run in `apps/playground` | "Run it natively: `nub run dev:playground` → <screen>" + a `<PlaygroundScreen>` block | Always, for every implemented component |
| **S** | Real native screenshot captured from GPUix | caption: "Captured from GPUix on <platform>, <commit>" | Whenever the playground can capture one |
| **A** | Browser approximation rendered from the component's *documented* contract | a visible banner: "Illustrative approximation — not GPUix; run it in the playground for real behaviour" | Only for layout/typography/spacing that can be honestly approximated, never for interactions claimed as native |
| **X** | Source + limitation notice | "Not verified in the runtime" + evidence link | Anything the runtime does not support, or not yet verified |

**Non-negotiables:**

- An approximation is **never** rendered without the banner. The banner is part of
  the component, not page prose a page can forget.
- An approximation shows **no interaction** that is presented as native. Buttons in
  an approximation are inert or open the playground; they do not pretend to be GPUix
  event handling.
- A screenshot is **a real capture**. A fake or drawn "screenshot" is forbidden.
- Every component page shows its GPUix-support status (plan 411's `<ComponentState>`),
  so an approximation can never be mistaken for proof.

### Why not embed always (option 1)?

The browser Wasm build is real but heavy and conditional:

- building it needs nightly Rust + `wasm-bindgen-cli`, which is not guaranteed on the
  build box or in CI;
- it needs COOP/COEP on the docs document, which constrains every cross-origin
  subresource and interacts with the Cloudflare Worker's asset headers;
- it renders one canvas with its own input focus, which fights the docs site's own
  focus and scroll model.

So embedding is an **upgrade path**: if the playground workstream's Phase A probe
proves the browser build works on this machine *and* the deploy can serve the Wasm +
COOP/COEP headers, add tier **N'** — a real embedded surface for the components where
it demonstrably works — on the pages where a live surface beats a screenshot. Until
that probe passes, no page claims it. This keeps the honest default (playground +
screenshots) and does not block on a capability that may not be available.

## 3. `docs/preview-strategy.md`

This document is a deliverable in its own right (`docs/README.md` lists it as a Phase
B document). It must contain:

1. The four tiers and the table above, verbatim in intent.
2. The evidence from `references/gpuix` (the quotes and file paths in §1), and the
   Phase A probe result for the Wasm build with its exact command + outcome.
3. The label text each tier renders, so a reader can audit one string against the doc.
4. The screenshot provenance convention: path, capture command, platform, GPUix
   version, commit.
5. What is explicitly **not** claimed: that the browser approximation runs GPUix; that
   an unverified component works; that a screenshot proves interactivity.

It links to `docs/gpuix-capabilities.md` (the capability map) and to the playground
README for run instructions. It is referenced from every component page's preview
section.

## 4. Files to create

```
docs/preview-strategy.md                       # the decision + evidence + label contract
apps/docs/src/components/preview/
├── native-preview.tsx        # <NativePreview slug> — selects tier N/S/A/X from the registry
├── screenshot.tsx            # <NativeScreenshot slug> — real capture + provenance caption
├── playground-screen.tsx     # <PlaygroundScreen screen> — run instructions block
├── approximation-banner.tsx  # the mandatory "illustrative, not GPUix" banner
├── preview-unavailable.tsx   # <PreviewUnavailable reason> — tier X, with evidence link
├── component-source.tsx      # <ComponentSource path> — copyable real source
└── preview.test.tsx          # proves the label rules hold
apps/docs/public/screenshots/<slug>/*.png      # written by the playground capture script
```

`<NativePreview slug>` reads the component's registry record and the presence of
screenshots to pick the highest honest tier, then renders it; a record with
`screenshots: []` and no playground screen falls to tier **X**, not to an
approximation. (Add `screenshots: string[]` and `approximation?: "static"` to the
plan 411 schema if needed; keep the schema the single decision point.)

## 5. Screenshot capture contract (handoff to the playground workstream)

The playground provides `apps/playground/scripts/capture-screenshots.ts` (or a
`packages/testing` helper) that, for each screen:

1. `launch({ command, args, env: { GPUIX_BACKGROUND: "1" } })`;
2. drives any required setup with the automation API;
3. `await app.screenshot({ path: "apps/docs/public/screenshots/<slug>/<state>.png" })`;
4. writes a sidecar `apps/docs/public/screenshots/<slug>/provenance.json` with
   platform, GPUix version, commit, command and timestamp;
5. `await app.close()`.

The docs site reads the PNG and the sidecar; it renders the sidecar's values in the
caption. It never invents provenance. This is recorded as a `TODO.md` task for the
playground workstream.

## 6. Work breakdown

| # | Task | Deliverable | Depends on |
| - | ---- | ----------- | ---------- |
| T1 | Write the strategy doc | `docs/preview-strategy.md` with §3's content | 001 evidence |
| T2 | Build the preview components | `native-preview.tsx`, `screenshot.tsx`, `playground-screen.tsx`, `approximation-banner.tsx`, `preview-unavailable.tsx`, `component-source.tsx` | 410 T2, 411 |
| T3 | Wire the tier selection | `<NativePreview>` reads the registry + screenshot presence | T2 |
| T4 | Tests | `preview.test.tsx` (below) | T2, T3 |
| T5 | Screenshot handoff | `TODO.md` task + the sidecar/provenance contract | T1 |
| T6 | Conditional embed probe | record the Phase A Wasm/build/deploy evidence; add tier N' only if it passes | 001 |
| T7 | Gates | `nub run check`, `lint`, `test`; commit | T1–T6 |

## 7. Commands and expected results

```sh
nub run --filter docs test      # preview.test.tsx
nub run --filter docs build     # a broken <NativePreview> import fails the build
nub run lint
nub run check
```

| Command | Expected |
| ------- | -------- |
| `docs test` | label-rule assertions pass; report the count |
| `docs build` | exit 0 |
| `lint`, `check` | exit 0 |

## 8. Test plan — `preview.test.tsx`

These test **label and tier rules**, not GPUix (that is the playground's job). They
must be able to fail:

1. `<ApproximationBanner>` renders the exact mandated text and is present whenever an
   approximation renders — render an approximation without the banner and the test
   fails (assert the banner text appears together with the approximation).
2. `<NativePreview slug>` for a record with `status: "planned"` and no screenshots
   renders tier **X** (the "not verified" text), never the approximation.
3. `<NativePreview slug>` for a record with a real screenshot path renders a
   `<NativeScreenshot>` whose caption contains the sidecar's platform and commit —
   stub the sidecar and assert the caption echoes it, and assert it does **not** echo
   a value the test did not provide (no invented provenance).
4. `<PlaygroundScreen>` renders the exact run command for the record's
   `playgroundScreen`, and renders nothing when it is `Option.none()`.

Use `@testing-library/react`-free, framework-native rendering (React's `renderToStaticMarkup`
from `react-dom/server`) so the test has no new runtime dependency; assert on the
emitted string. (Pick the smallest tool the app already has; do not add a big
dependency for this.)

Two-direction proof (AGENTS §3): remove the banner from the approximation path and
show test 1 fails; restore and show it passes.

## 9. STOP conditions

- The Phase A audit has not established whether GPUix renders in the browser on this
  box. Then: ship tiers N/S/A/X only, record the probe as a `TODO.md` task, and do
  **not** add tier N'.
- No native screenshots exist yet (playground not ready). Then every implemented
  component shows tier N + tier X ("not yet verified — screenshot pending"); do not
  substitute a drawn image.
- Someone asks for an approximation to look interactive/native. Refuse and point at
  this plan; the banner requirement is not negotiable.
- The approximation would require reimplementing component behaviour in the browser.
  That is the line `MISSION.md` draws: do not. Use tier S or X.

## 10. Acceptance criteria

- [ ] `docs/preview-strategy.md` states the four tiers, the evidence, the exact label
      text, the screenshot-provenance convention and the explicit non-claims.
- [ ] Every preview component enforces its tier's label; the approximation banner
      cannot be omitted.
- [ ] Tier selection is driven by the plan 411 record + screenshot presence, not by
      page prose.
- [ ] `preview.test.tsx` proves the label rules and the no-invented-provenance rule,
      in both directions for the banner check.
- [ ] No page presents a browser approximation as native; no fake screenshot exists.
- [ ] The screenshot handoff is recorded for the playground workstream.
- [ ] The conditional live-embed upgrade is either proven and implemented, or
      explicitly not claimed with the probe evidence recorded.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
