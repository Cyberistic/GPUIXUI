# 474 — The live-surface smoke proves light mode, not only dark

**Phase:** F/G (release gate truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 444/445 (previews follow mode and platform), 455–458 (the surface
and its smoke), 473 (the page loop sees a sized canvas)

## 1. Why

`apps/docs/preview/main.tsx` resolves `mode` from the iframe URL and paints
`themes[mode]`. The docs promise, in `docs/preview-strategy.md`, that a live
surface "follows the docs' light/dark mode". The release gate cannot tell
whether that is true:

- the scene loop hard-codes `&mode=dark` for all eleven scenes;
- the page loop reads `src` but never asserts the mode in it, and the docs page
  colour scheme is whatever the host's `prefers-color-scheme` happens to be, so
  a light host checks a different thing than a dark one;
- no check compares what the renderer paints in the two modes.

A wiring regression that always passed `mode=dark`, or a renderer that ignored
`mode`, would pass every gate. This is a gate-truth gap, not a user-visible
defect: measured on 2026-10-18 the wiring is correct (see §3).

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/scripts/smoke-live-preview.ts` | Expose `Emulation.setEmulatedMedia` and `Page.captureScreenshot` on the CDP session; force the page scheme; assert the page's mode reaches the iframe in **both** modes; prove the Button scene paints a different frame in light than in dark, and the same frame twice in dark. |
| `docs/preview-strategy.md` | State what the smoke now proves about mode, next to the existing scene/page sentences. |
| `apps/docs/README.md` | The live-surface section names the mode proof. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row under the docs-site workstream. |

No component, scene or page change: the smoke and its documentation are the
subject.

## 3. Measured baseline (2026-10-18, this host)

Probe against the built preview (Chrome `--headless=new --enable-unsafe-swiftshader`):

| Observation | Value |
| ----------- | ----- |
| `/docs/components/button` in a light scheme | `<html class="light">`, iframe `src` `…?scene=button&platform=default&mode=light` |
| same page in a dark scheme | `<html class="dark">`, iframe `src` `…&mode=dark` |
| Button scene `mode=dark` screenshot | 19 052 bytes PNG |
| the same dark scene captured twice | byte-identical |
| Button scene `mode=light` screenshot | 18 684 bytes PNG |
| GPUI tree text, both modes | 11 text nodes, `SCENE_TEXT.button` present |

So the two modes are distinguishable at the paint and the capture is
deterministic. The check below is therefore sound, and it fails only when the
behaviour regresses.

## 4. The change

1. **Session surface.** Add to the `Session` interface and `startSession`:

   ```ts
   readonly setColorScheme: (mode: "light" | "dark") => Promise<void>;
   readonly captureScreenshot: () => Promise<string>;
   ```

   `setColorScheme` calls
   `Emulation.setEmulatedMedia` with
   `{ features: [{ name: "prefers-color-scheme", value: mode }] }`; it persists
   across `Page.navigate` for the session's target. `captureScreenshot` calls
   `Page.captureScreenshot` with `{ format: "png" }` and returns `data` (an
   empty string is a failure, not a pass).

2. **Deterministic page mode.** Before the page loop, call
   `session.setColorScheme("dark")` and assert each page's iframe `src` carries
   `mode=dark`. The host's scheme no longer decides what the gate checks.

3. **Light page wiring.** After the page loop:

   ```ts
   await session.setColorScheme("light");
   const light = await openPageSurface(session, `${baseUrl}/docs/components/button`);
   // ready, sized canvas, and src carries mode=light
   await session.setColorScheme("dark");
   ```

   Button is the subject because every page shares `LiveSurface`; one page
   proves the wiring, and the platform pass-through on Theming already covers
   the sibling parameter.

4. **Light paint.** Before the page loop, after the unknown-scene check, capture
   the Button scene in `dark`, in `dark` again, and in `light`:

   ```ts
   const dark = await captureScene("dark");
   const darkAgain = await captureScene("dark");
   const light = await captureScene("light");
   if (dark !== darkAgain) fail("screen capture is not deterministic");
   if (dark === light) fail("mode=light painted the dark surface");
   ```

   `captureScene(mode)` navigates to
   `/gpuix-preview/?scene=button&platform=win32&mode=${mode}`, waits for
   `ready`, asserts `SCENE_TEXT.button` is in `getAllText()`, and returns the
   PNG. The panic strings name the mode that failed.

5. **Logs.** One line per proof:

   ```text
   smoke: the scene paints light and dark — dark 19052 bytes, light 18684 bytes
   smoke: /docs/components/button follows light mode — …&mode=light
   ```

6. **Docs.** `docs/preview-strategy.md` and `apps/docs/README.md` say the smoke
   asserts: every page's iframe carries the page's mode; the Button scene paints
   a different frame in light and dark; the dark frame is reproducible.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs smoke:preview --no-build` **before** | exit `0`; no mode proof in the output |
| same **after** | exit `0`; the two new lines appear; all eleven scenes and twelve page loads still pass |
| force `preview/main.tsx` to `const mode: ThemeMode = "dark"` (proof only) | exit `1`, `FAIL live surface: mode=light painted the dark surface` |
| force `LiveSurface` to pass `mode: "dark"` (proof only) | exit `1`, the light page reports `mode=dark` |
| `nub run --filter docs test`, `nub run check`, `nub run lint` | exit `0` |

Restore both forced changes after recording the proof.

## 6. STOP conditions

- `Page.captureScreenshot` returns an empty or black frame for the WebGPU canvas
  on this host: stop and record the evidence. An empty frame cannot prove mode;
  do **not** replace the check with an assertion on `getAllText`, which is
  identical in both modes.
- The two dark captures differ byte-for-byte: the renderer or capture is
  nondeterministic. Stop and record the differing bytes; do not weaken the
  determinism precondition.
- The light page still reports `mode=dark` after the change: that is a real
  wiring defect. Fix `LiveSurface`/`usePreviewState`; do not weaken the
  assertion.
- The whole smoke exceeds its 420 s budget: raise it with a measured
  justification, or reuse the already-warm page; do not drop a proof.

## 7. Test plan

- The smoke **is** the regression test; it has no unit seam because it depends
  on a real WASM renderer.
- Two-direction proofs: both forced failures in §5 fail by name; the restored
  run passes with the measured byte counts.
- Record the before/after output and the two forced-failure lines in §8.

## 8. Progress (2026-10-18)

- **Baseline:** the probe above; the gate had no mode proof.
- **After:** `smoke:preview` passes with
  `smoke: the scene paints light and dark — dark 19052 bytes, light 18684 bytes`
  and
  `smoke: /docs/components/button follows light mode — /gpuix-preview/?scene=button&platform=default&mode=light`.
  The page loop is forced to dark, so the host scheme no longer decides the
  check.
- **Two directions:** `preview/main.tsx` forced to `mode = "dark"` fails with
  `FAIL live surface: mode=light painted the dark surface` (exit `1`);
  `LiveSurface` forced to `mode: "dark"` fails with
  `FAIL live surface: /docs/components/button in light mode reported /gpuix-preview/?scene=button&platform=default&mode=dark`
  (exit `1`). Both restored; the suite is green again.
- `nub run --filter docs test` (44 files / 273 tests), `nub run check` and
  `nub run lint` pass. The docs build and the other two browser smokes are
  unchanged.

## 9. Acceptance

- A regression that ignores the mode in the renderer or the page fails
  `smoke:preview` by name, in both directions.
- `docs/preview-strategy.md` and `apps/docs/README.md` describe exactly what is
  proven.
- The plan index and `TODO.md` are current; the commit is pushed on
  `agent/docs-site`.
