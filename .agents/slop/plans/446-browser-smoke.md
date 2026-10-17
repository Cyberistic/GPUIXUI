# 446 — A browser smoke check for hydrated previews

**Phase:** F/G (release gate) · **Owner:** docs-site · **Status:** planned
**Depends on:** 439 (built-site smoke), 420, 434, 444, 445

## 1. Why

`smoke:build` fetches the **server-rendered HTML**, so it cannot see anything
that happens after hydration. Plans 444 and 445 fixed exactly that class of bug —
previews painting the wrong palette and the wrong platform — and both had to be
proven by hand in headless Chrome. The `TODO.md` row from plan 445 asks for the
assertions to live in a script so the release gate catches the next regression.

The behaviours to pin:

| URL | Preferred scheme | Must see |
| --- | ---------------- | -------- |
| `/docs/components/button` | dark | `<html class="dark">`; every preview surface's `--preview-color-background` is `darkTheme.colors.background` |
| `/docs/components/button` | light | `<html class="light">`; the light background role |
| `/docs/components/button?platform=win32` | dark | `data-platform="win32"`; every `--preview-font-mono` is `platformTheme(themes.dark, "win32").typography.mono` |
| `/docs/theming?platform=linux` | dark | the note names the Linux label; all five previews carry the Linux mono family |

## 2. Decision

**One more script, one shared server helper.** `smoke-build.ts` already owns
build → `vite preview` → ready-wait. Extract that plumbing into
`apps/docs/scripts/preview-server.ts` and have both scripts use it; do not
duplicate 80 lines, and do not merge the crawler and the browser check (they
have different failure modes and different exit reasons).

`apps/docs/scripts/smoke-browser.ts`:

- flags: `--base-url <url>`, `--no-build`, `--chrome <path>`;
- Chrome discovery: `CHROME_PATH`, then the macOS app path, then
  `google-chrome` / `chromium` / `chromium-browser`; **no Chrome → exit 2**
  ("not verified"), never a pass;
- each check runs Chrome once:
  `--headless=new --disable-gpu --no-sandbox --hide-scrollbars
  --virtual-time-budget=10000 --blink-settings=preferredColorScheme=<0|1>
  --dump-dom <url>` in a throwaway `--user-data-dir`, and parses the returned
  DOM;
- expected values come from `@gpuixui/tokens` (`lightTheme`, `darkTheme`,
  `platformTheme`, `platformTypes`), never literals — the same rule as the site;
- exit `0` pass, `1` a check failed (each printed `FAIL <url>: <what>`), `2` the
  check could not run (no build, no server, no Chrome).

## 3. Files

| File | Change |
| ---- | ------ |
| `apps/docs/scripts/preview-server.ts` | new: `SetupError`, `startDocsPreview({ build })` → `{ baseUrl, stop }` |
| `apps/docs/scripts/smoke-build.ts` | import the helper; delete the moved functions; behaviour and exit codes unchanged |
| `apps/docs/scripts/smoke-browser.ts` | new: the four checks above |
| `apps/docs/package.json` | `"smoke:browser": "nub scripts/smoke-browser.ts"` |
| `apps/docs/README.md` | the command, what it proves, and the exit-2 rule |
| `.agents/slop/plans/README.md`, `TODO.md` | index and tick |

## 4. Test plan

The script **is** the test; its two-direction proof is run, not asserted in
vitest (a unit test of the DOM parser would prove string matching, not that the
site hydrates):

1. Against the current site: exit `0`, four checks printed.
2. Temporarily change one expectation (the dark background) to a wrong value →
   exit `1` with `FAIL … expected …`. Restore.
3. `--chrome /nonexistent` → exit `2` with `not verified`. `--base-url` pointing
   at a closed port → exit `2` (no server).
4. Re-introducing the plan 445 defect (reading React context instead of the
   document snapshot) makes check 3 fail — recorded in the plan once run.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs smoke:build` | unchanged: exit `0`, 66 pages, 85 links |
| `nub run --filter docs smoke:browser` | exit `0`, four checks |
| `nub run --filter docs check-types` | exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | green |

## 6. STOP conditions

- The production preview does not hydrate in headless Chrome (no `class` set,
  no platform attribute): stop and record it; do not weaken the assertion to
  the SSR HTML — that is the bug this script exists to catch.
- Chrome's `--dump-dom` returns before hydration on a slow host: raise the
  virtual-time budget once; if it is still flaky, stop and record the timing
  rather than adding sleeps.
- The check needs a colour or font literal in `apps/docs`: stop; the values must
  come from the package.

## 7. Acceptance

- One command proves the hydrated preview mode and platform, in both schemes,
  against the production build.
- The shared server helper leaves `smoke:build` behaviour identical.
- Exit `1` means the site is wrong, exit `2` means it was not verified.
- All gates pass; the plan index and `TODO.md` are current; pushed on
  `agent/docs-site`.

## 8. Progress (2026-10-17)

- **Implemented.** `scripts/preview-server.ts` now owns build → serve → ready →
  stop, and both `smoke-build.ts` and the new `smoke-browser.ts` use it; the
  crawler's behaviour is unchanged. `smoke:browser` runs Chrome once per check
  (`--dump-dom`, `--virtual-time-budget=10000`,
  `--blink-settings=preferredColorScheme=0|1`), parses the live DOM and compares
  against `@gpuixui/tokens` values, so no literal is embedded.
- **Four checks pass against the production build:** dark button page, light
  button page, `?platform=win32` (Consolas), and `/docs/theming?platform=linux`
  (the Linux label and all five surfaces).
- **Both directions proven.**
  - expecting `darkTheme.colors.card` instead of `background` → exit `1` with
    `FAIL /docs/components/button (dark): --preview-color-background is
    #11141A, expected #191D25`; restored → exit `0`.
  - `--chrome /nonexistent` → exit `2` ("no Chrome found"); `--base-url
    http://127.0.0.1:1` → exit `2` ("did not answer"); both restored.
- **Verified:** `smoke:build` still exits `0` (66 pages, 85 links),
  `check-types`, the docs suite and the repository gate green.
