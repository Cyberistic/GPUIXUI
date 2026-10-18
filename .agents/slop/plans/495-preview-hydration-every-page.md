# 495 — The hydrated-preview smoke checks every preview page in both modes

**Workstream:** docs-site. **Phase:** F/G (quality gate).
**Depends on:** 412, 434, 444, 445, 446, 449–453, 461 (the tier-A previews and the
hydrated-preview smoke). **Blocks:** nothing.

## 1. Goal

`nub run --filter docs smoke:browser` is the only gate that reads the **hydrated**
DOM, and it is the guard for plans 444/445: a dark page painting light previews,
and a shared `?platform=` link keeping the default platform. Today it visits five
URLs. **49 component pages render a tier-A preview** (`<ComponentPreview>`), and
42 of them are never read by the gate. A page whose preview subtree is outside
the providers, or whose surface ignores the published state, passes every test
and every server-HTML crawl.

After this plan the smoke visits **every page that carries a labelled preview**,
in dark and light, in **one Chrome process**, and fails naming the page and the
surface that disagreed. The five platform checks stay.

## 2. The gap, measured

- `apps/docs/scripts/smoke-browser.ts` declares five `Check`s: Button dark,
  Button light, Button/Badge `?platform=win32`, Theming `?platform=linux`.
- `grep -l '<ComponentPreview' apps/docs/content/docs/components/*.mdx | wc -l`
  → **49** (measured 2026-10-18 on this branch). All 49 render
  `[data-preview-surface]` with `--preview-*` values.
- The checks read `--preview-color-background` from the dumped DOM, so they
  already prove the whole hydration path; the missing part is **coverage**.
- Cost matters: one `chrome --headless=new --dump-dom` per URL measured
  **~3.9 s** here (5 runs in 19.4 s). 49 pages × 2 modes at that price is about
  six minutes of process spawning. One CDP session navigating the same pages is
  the correct shape, and `smoke-live-preview.ts` already contains that session.

## 3. Scope and boundaries

Owned files only:

- `apps/docs/scripts/chrome-session.ts` (new)
- `apps/docs/scripts/preview-pages.ts` (new)
- `apps/docs/scripts/smoke-browser.ts`
- `apps/docs/scripts/smoke-live-preview.ts` (import the extracted session; no
  behaviour change)
- `apps/docs/src/preview-pages.test.ts` (new)
- `apps/docs/README.md`, `docs/preview-strategy.md` (the smoke's coverage)
- `.agents/slop/plans/README.md`, `TODO.md`

Do **not** touch `apps/docs/src/components/preview/*`, the page content, the
component packages, or `smoke:build`/`smoke:preview` behaviour.

## 4. Files and exact changes

### 4.1 `apps/docs/scripts/chrome-session.ts` (new)

Move, without changing behaviour, from `smoke-live-preview.ts`:

- `freePort()`
- `interface Session` and `startSession(chrome)`
- the `CHROME_CANDIDATES` list and `findChrome(requested)`

Exported API:

```ts
export interface Session {
  readonly evaluate: (expression: string) => Promise<unknown>;
  readonly navigate: (url: string) => Promise<void>;
  readonly setColorScheme: (mode: "light" | "dark") => Promise<void>;
  readonly waitFor: (expression: string, timeoutMs?: number) => Promise<boolean>;
  readonly captureScreenshot: () => Promise<string>;
  readonly stop: () => Promise<void>;
}

export const findChrome: (requested: string | null) => string;
export const startSession: (chrome: string) => Promise<Session>;
```

`waitFor` polls `evaluate` every 100 ms until it returns `true` or the timeout
elapses (default 15 s), and returns whether it became true. It exists so both
smokes stop hand-rolling their own poll loops for the simple case.

Launch flags stay exactly as they are today (`--headless=new`,
`--enable-unsafe-swiftshader`, `--enable-unsafe-webgpu`, `--no-first-run`,
`--user-data-dir`, `--window-size=640,720`, `--remote-debugging-port`,
`about:blank`). The profile prefix becomes an option defaulting to
`"gpuixui-chrome-"`; the live smoke passes `"gpuixui-live-"` so its temp
directory stays named as it is.

### 4.2 `apps/docs/scripts/preview-pages.ts` (new, pure)

```ts
/** The slug of every component page that renders a tier-A preview. */
export const previewPageSlugs: (
  pageDirectory: string,
) => readonly string[];
```

Implementation: read `*.mdx`, match `/<ComponentPreview slug="([^"]+)"/g`, map
to the captured slug, dedupe with a `Set`, sort. No React import — the Node
script cannot load TSX (Node 24 strips types, it does not transform JSX). The
registry ⇄ page invariant this relies on is already proven by
`src/components/preview/component-preview.test.tsx`.

### 4.3 `apps/docs/scripts/smoke-browser.ts`

- Delete `dumpDom`, `CHROME_CANDIDATES` and the process-spawning code; import
  `findChrome`/`startSession`.
- Derive the page list once:

  ```ts
  const pageDirectory = fileURLToPath(
    new URL("../content/docs/components/", import.meta.url),
  );
  const previewPages = previewPageSlugs(pageDirectory);
  ```

- Build the checks: for every slug, a dark check and a light check on
  `/docs/components/<slug>`; then the three platform checks that exist today.
- One navigation per check, in one session:

  ```ts
  await session.setColorScheme(check.dark ? "dark" : "light");
  await session.navigate(baseUrl + check.path);
  await session.waitFor(
    `location.pathname + location.search === ${JSON.stringify(new URL(check.path, baseUrl).pathname + new URL(check.path, baseUrl).search)}`,
  );
  await session.waitFor(`document.documentElement.dataset.platform !== undefined && document.documentElement.classList.contains(${JSON.stringify(check.dark ? "dark" : "light")})`);
  const dom = String(await session.evaluate("document.documentElement.outerHTML"));
  ```

  `outerHTML` is used deliberately: the existing `previewVars`/`everySurface`
  parsers already read the surface's inline `style` attribute from it and their
  behaviour is proven. The emulated scheme survives navigation (the live smoke
  relies on this).
- `everySurface` keeps its meaning but reports the surface index:
  `--preview-color-background is X, expected Y (surface 2 of 3)`, so a page with
  several previews names the one that broke.
- The mode problem keeps the existing wording: `<html class="…"> is not dark`.
- Nothing else changes: `--base-url`, `--chrome`, `--no-build`, exit `0/1/2`,
  and the `smoke: not verified — …` path.

### 4.4 `apps/docs/scripts/smoke-live-preview.ts`

Delete the local session code and import it. Keep every scene, gesture, wait and
message byte-identical; this is a move, not a rewrite.

### 4.5 `apps/docs/src/preview-pages.test.ts` (new)

Three tests over a temporary fixture directory (the real tree is read by other
guards, so the fixture keeps this test honest and fast):

1. a page with `<ComponentPreview slug="button"` is returned; a page without the
   block is not;
2. a page with two blocks yields one entry (dedupe), and the result is sorted;
3. the real tree yields **at least 40** slugs and includes `button` — a guard
   that the regex still matches the real pages rather than an empty set.

## 5. Test plan

**The test must be able to fail.** Proofs to run and record in §8:

1. `preview-pages.test.ts` with the block removed from the fixture page → test 1
   fails. Restore.
2. `smoke-browser.ts`, force the dark check to expect
   `lightTheme.colors.background` → the run exits `1` and names the first
   preview page's surface. Restore.
3. `theme-surface.tsx`, temporarily hard-code
   `"--preview-color-background": "#F6F8FA"` in `previewVars` → the dark checks
   fail by page name; restore and confirm `theme-surface.test.ts` is green again.
4. The platform checks still fail when `--platform=win32` is dropped from the
   URL → exit `1`, as today. Restore.

## 6. Commands and expected results

```sh
nub run --filter docs test                  # unit suites incl. the new fixture test
nub run --filter docs smoke:browser         # builds, then one Chrome, all pages
nub run --filter docs smoke:preview --no-build   # the extracted session still drives every scene
nub run check                               # test quality, lint, format, types
nub run lint
nub run test
```

Expected: the smoke prints one `checked` line per page+mode (98 preview checks +
3 platform checks on this branch), exits `0`, and takes about a minute after the
build; `smoke:preview` stays green.

## 7. STOP conditions

- The extracted session changes any `smoke:preview` result or timing: revert the
  extraction and keep the old process-spawning smoke, adding only the derived
  page list. Do not weaken either check to make the move work.
- A page's hydrated `outerHTML` does not carry the preview `style` attribute
  under CDP (React may not have written it): read the surfaces with
  `getComputedStyle(surface).getPropertyValue("--preview-color-background")`
  instead, and record the measurement in §8.
- A real page legitimately paints no preview surface despite carrying the block
  (for example a future conditional preview): stop and report; do not exempt the
  page silently.

## 8. Measured results

Run on this host, 2026-10-18.

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | **53 files / 349 tests** pass (three new fixture tests; `component-page-docs.test.tsx` also names the new guard, so `/docs/component-pages` gained one row) |
| `nub run --filter docs smoke:browser --no-build` | exit `0`, **101 checks** (49 preview pages × 2 schemes + 3 platform URLs) in **75 s** |
| `nub run --filter docs smoke:browser` | exit `0`, 101 checks in **3 m 28 s** including the production build |
| `nub run --filter docs smoke:preview --no-build` | exit `0` — every scene, every live-scene page, the light-mode Button check and the Windows platform check |
| `nub run check` | pass (tests quality, lint, format, every workspace type-check) |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` — tokens 197, testing 19, icons 19, playground 11, components 308, primitives 282, docs 349 |

Two measured facts changed the implementation:

1. One `chrome --headless=new --dump-dom` costs **~3.9 s** here (five runs in
   19.4 s), so 98 URLs by process spawning is about six minutes. One CDP session
   navigates the same pages in **75 s**.
2. The hydrated `style` attribute serializes **without** a space after the colon
   (`--preview-color-background:#F6F8FA`), and the providers publish the mode a
   frame before the preview subtree re-renders. The settle wait therefore parses
   the value (`/--preview-color-background\s*:\s*([^;]+)/`) instead of matching a
   string — a first version with `includes(": #11141A")` timed out on every light
   page and read the pre-hydration snapshot on dark ones.

Two-direction proofs:

1. `scripts/preview-pages.ts`, the block regex changed to `<PreviewBlock` →
   `src/preview-pages.test.ts` failed **3/3** (the fixture tests and the real-tree
   count). Restored → 3/3 pass.
2. `scripts/smoke-browser.ts`, the dark check forced to `lightTheme` → exit `1`
   with `FAIL /docs/components/accordion (dark): --preview-color-background is
   #11141A, expected #F6F8FA (surface 1 of 1)`; 49 dark failures. Restored → exit
   `0`, 101 checked.
3. `scripts/smoke-browser.ts`, the Button/Badge platform expectation changed to
   the default family → exit `1` with `FAIL /docs/components/button?platform=win32
   (dark): --preview-font-mono is Consolas, expected Menlo (surface 1 of 1)` and
   the same for Badge. Restored → exit `0`.

## 9. Acceptance checklist

- [ ] every page with a `<ComponentPreview>` block is checked in dark and light
- [ ] the page list is derived, not hand-maintained, and a real-tree count guard
      exists
- [ ] one Chrome process serves the whole smoke; `smoke:preview` is unchanged
- [ ] the unit test fails on a fixture page that loses its block
- [ ] `smoke:browser` exits `1` on a forced wrong-mode palette and names the page
- [ ] `apps/docs/README.md` and `docs/preview-strategy.md` describe the coverage
- [ ] plan index and `TODO.md` updated; committed on `agent/docs-site`
