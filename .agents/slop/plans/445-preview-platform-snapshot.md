# 445 — Previews read the document state the providers publish

**Phase:** F (truth) · **Owner:** docs-site · **Status:** planned
**Depends on:** 420 (platform toggle), 434 (token-driven previews), 444 (mode
after hydration)

## 1. The defect

Plan 444 made the preview surface follow the docs' **dark mode**. While
verifying it, the same class of bug showed up for the **platform**:

```
GET /docs/components/button?platform=win32      (dark OS preference)
<html class="dark" data-platform="win32" style="--platform-mono: Consolas">
<div data-preview-surface style="--preview-font-mono: Menlo">
```

The page chrome, the toggle label and the `<html>` attribute all say Windows,
and the preview still paints macOS's `Menlo`. `MISSION.md`'s platform acceptance
("a reader toggles macOS → Windows and every preview changes") therefore fails
for a shared link, the most common way to share a platform style.

**Measured cause.** The MDX body renders behind `use(page.load())` +
`<Suspense>` (`src/routes/docs/$.tsx`). Its first client render reads the
provider values from *before* the providers' mount effects ran — platform
`default`, `next-themes` `resolvedTheme` `undefined` — and a later context
update does not reach that subtree. Instrumenting the surface proved it:

- the surface saw `platform: "default"`, `resolvedTheme: undefined`;
- a forced `setPlatform("win32")` from an effect in the same subtree updated it
  immediately (`platform: "win32"`, `Consolas`), so the tree is subscribed and
  the value is available; only the mount-time update is lost.

Plan 444's `useSyncExternalStore` mount gate repairs the mode because a mount
snapshot change forces one render; the platform has no such gate, so it stays
stale. Patching a second gate would leave two mechanisms racing the same
providers.

## 2. Decision

The providers already **publish their resolved state on `<html>`** — `class`
`dark`/`light` (next-themes) and `data-platform` (`PlatformProvider`). That
published state is what the page chrome paints, so a preview that reads it can
never disagree with the chrome.

`usePreviewTheme` reads **one** snapshot with `useSyncExternalStore`:

```ts
// "dark" -> class, "win32" -> data-platform; SSR is the shipped default.
const parsePreviewState = (snapshot: string): { platform: PlatformName; mode: ThemeMode }
const documentSnapshot = () => `${document.documentElement.dataset.platform ?? "default"}|${isDark ? "dark" : "light"}`
const serverSnapshot = () => "default|light"
```

The store subscribes with a `MutationObserver` on
`document.documentElement` for `class` and `data-platform`, so both toggles
re-render every preview — including the first load from `?platform=` and
`localStorage`, whatever order the providers settle in.

Rules:

- the server and hydration render use `"default|light"` — exactly the HTML the
  server sent, so no hydration mismatch;
- an unknown platform or mode falls back to `default`/`light`, never a guess;
- the palette is still `themes[mode]` through `platformTheme(theme, platform)`
  from `@gpuixui/tokens`; no docs colour and no second palette;
- `PlatformPreviews` (Theming) uses the same snapshot for its label, so the
  sentence cannot say "Default" over Windows previews;
- plan 444's `previewMode`/mount gate is replaced by the snapshot: one
  mechanism, one test surface.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/src/components/preview/theme-surface.tsx` | `parsePreviewState`, the document snapshot + `MutationObserver` subscription, `usePreviewTheme` and a `usePreviewState` for the label; delete `previewMode`/the mount gate |
| `apps/docs/src/components/preview/theme-surface.test.tsx` | parse cases replace the `previewMode` cases; keep the `previewVars` suite |
| `apps/docs/src/components/preview/platform-previews.tsx` | the label reads the snapshot's platform |
| `.agents/slop/plans/README.md`, `.agents/slop/plans/444-preview-dark-mode.md`, `TODO.md` | index this plan, note that it supersedes 444 §2's mechanism |

## 4. Tests

`theme-surface.test.tsx` replaces the mode suite with `parsePreviewState`:

- `"win32|dark"` → `{ platform: "win32", mode: "dark" }` (the shared link);
- `"default|light"` → `{ platform: "default", mode: "light" }` (the SSR HTML);
- `"|"`, `"nonsense|nonsense"` → `default`/`light` (a corrupt attribute is not
  a style);
- `"linux|dark"` → `linux`/`dark` (every platform survives the round trip).

The existing `previewVars` suite still proves the palette and platform values
reach every CSS variable, and the "no colour literal" guard still holds.

### Two-direction proof (AGENTS §3)

1. Unit: point `parsePreviewState` at a snapshot that ignores the platform
   (`"default|dark"`) — the `win32` case fails; restore.
2. Browser (headless Chrome, dev server, OS dark preference), both directions:
   - `?platform=win32`: the surface's `--preview-font-mono` is `Consolas`, the
     `<html>` `data-platform` is `win32`, background `#11141A`;
   - no parameter: `Menlo` and `default`;
   - light preference with `?platform=win32`: `Consolas` on `#F6F8FA`.
3. Revert to the plan 444 hook (context only) → the `?platform=win32` preview
   is `Menlo` again.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; the parse suite included |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| headless Chrome on the three URLs in §4 | the measured values above |
| `nub run check` / `nub run lint` / `nub run test` | green |

## 6. STOP conditions

- `MutationObserver` is unavailable or the attributes are not written before
  first paint: stop and record it; do not poll with a timer.
- The snapshot approach would need a colour or platform literal in `apps/docs`:
  stop — the mapping stays in `@gpuixui/tokens`.
- A preview renders differently from the page chrome for any of the four
  platform values: stop; that is the defect, not a rounding difference.
- Reading `document` on the server: the hook must keep a server snapshot; if a
  test environment has no DOM, the pure parser must still be testable.

## 7. Acceptance

- A shared `?platform=<name>` link paints every preview with that platform's
  values and the matching docs mode, and the Theming label agrees.
- The server render and the hydration render stay `default`/light, so no
  hydration mismatch is introduced.
- One mechanism, one tested parser; no timer, no duplicated platform state.
- All docs suites, type-check, build, the built-site crawl and the repository
  gate pass; the plan index and `TODO.md` are current; pushed on
  `agent/docs-site`.

## 8. Progress (2026-10-17)

- **Measured first.** `?platform=win32` in dark mode: `<html data-platform="win32">`
  and `--platform-mono: Consolas`, while `data-preview-surface` carried
  `--preview-font-mono: Menlo`. A forced `setPlatform` from an effect inside the
  subtree updated it, proving the tree is subscribed and only the mount-time
  update is lost.
- **Implemented.** `parsePreviewState` decodes `"<platform>|<mode>"`; a
  `MutationObserver` on `<html>`'s `class`/`data-platform` is the
  `useSyncExternalStore` subscription; the server snapshot is `"default|light"`.
  `PlatformPreviews` labels the snapshot's platform; plan 444's mount gate and
  `previewMode` are deleted.
- **Both directions proven.**
  - Unit: forcing `parsePreviewState` to return `platform: "default"` failed
    "reads a shared platform link in dark mode" and the "keeps every platform"
    case; restored, 212 docs tests pass.
  - Browser, headless Chrome, OS dark: default → `#11141A` + `Menlo`;
    `?platform=win32` → `#11141A` + `Consolas`; light + `?platform=win32` →
    `#F6F8FA` + `Consolas`; `/docs/theming?platform=win32` labels
    "Showing the **Windows** platform style" with all five surfaces `Consolas`.
- **Verified:** docs suite, `check-types`, build, `smoke:build` (66 pages) and
  the repository gate green.
