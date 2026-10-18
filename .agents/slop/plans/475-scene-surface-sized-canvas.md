# 475 — A live scene's canvas must be sized, not merely non-zero

**Phase:** F/G (release gate truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455–458 (the scenes and their smoke), 473 (the page half of the
same rule), 474 (the mode proof, which exposed it)

## 1. Why

Plan 473 fixed the **page** half of `smoke:preview`: a page iframe could report
`data-gpuix="ready"` while its canvas was still 1×1, and the check accepted it.
The **scene** half still does:

`waitForSurface` returns the moment `data-gpuix="ready"`, and the scene loop only
rejects a canvas whose width or height is **zero**. A blank 1×1 frame passes.

Measured on 2026-10-18 during the plan-474 run:

```text
smoke: loading dropdown-menu
smoke: scene dropdown-menu ready — 1x1 canvas, 7 text nodes
```

The scene then passed: the text assertion is against GPUI's tree, which is
populated before the frame is sized, and nothing else looks at the canvas.
A release gate that accepts a blank frame is exactly the failure plan 473 names.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/scripts/smoke-live-preview.ts` | `waitForSurface` returns only a `ready` surface with a canvas larger than 1×1; a ready-but-unsized surface keeps polling to the existing 30 s budget and reports `timeout`. Delete the now-redundant zero-canvas branch in the scene loop. |
| `docs/preview-strategy.md` | The tier-L paragraph says a scene's canvas must be sized before it counts. |
| `apps/docs/README.md` | One clause: every scene must reach a sized canvas. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row under the docs-site workstream; keep the count current. |

No scene, component or page change: the gate is the subject. If a scene never
grows past 1×1, that is a real scene defect — see the STOP condition.

## 3. The change

```ts
const waitForSurface = async (session: Session): Promise<SurfaceState> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    const surface = await readSurface(session);
    if (surface.state === "failed") return surface;
    // A ready flag lands before the frame is sized (plan 473 measured the
    // same race on the page iframe). A 1×1 canvas is blank, not ready.
    if (
      surface.state === "ready" &&
      surface.canvas[0] > 1 &&
      surface.canvas[1] > 1
    ) {
      return surface;
    }
    if (Date.now() > deadline) {
      return { state: "timeout", canvas: surface.canvas };
    }
    await sleep(250);
  }
};
```

Then remove this block from the scene loop, because the wait now guarantees it:

```ts
if (surface.canvas[0] === 0 || surface.canvas[1] === 0) { … }
```

`openScene` already returns the `timeout` surface, and the loop fails with
`FAIL live scene <key>: state=timeout`. `captureScene` (plan 474) goes through
the same `openScene`, so the Button mode proof is sized too.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs smoke:preview --no-build` **before** | exit `0`; the run can print a `1x1 canvas` for a scene and still pass (measured for `dropdown-menu`) |
| same **after** | exit `0`; every scene prints a 640×160 canvas, including `dropdown-menu` |
| force the threshold to `> 2000` (proof only) | exit `1`, `FAIL live scene button: state=timeout` |
| `nub run --filter docs test`, `nub run check`, `nub run lint` | exit `0` |

Restore the forced threshold after recording the proof.

## 5. STOP conditions

- A scene still reports 1×1 after the 30 s budget: that is a real scene or
  renderer defect. Record the scene key, the frame markup and the run; do not
  lower the threshold to keep the gate green.
- The whole smoke exceeds the 420 s budget because scenes now wait: raise it
  with a measured justification, or reduce the per-scene poll; do not remove the
  size condition.
- The canvas grows and then shrinks back to 1×1: record the measurements before
  changing anything; that would be a scene lifecycle bug, not a wait.

## 6. Test plan

- The smoke is the regression test; there is no unit seam without a renderer.
- Reproduce the defect first: the `dropdown-menu` `1x1` line from the plan-474
  run is the "before".
- Two-direction proof: the forced `> 2000` threshold fails the first scene by
  key with `timeout`; the restored run passes with 640×160 on every scene.
- Record the before/after lines in §7.

## 7. Progress (2026-10-18)

- **Before:** `smoke: scene dropdown-menu ready — 1x1 canvas, 7 text nodes`,
  exit `0`.
- **After:** every scene reports `640x160`; `dropdown-menu` is
  `640x160` after the wait.
- **Proof:** with the threshold forced to `> 2000`, the first scene failed with
  `FAIL live scene button: state=timeout`, exit `1`; restored.
- `smoke:preview` green end to end (eleven scenes, the mode proof, twelve page
  loads and the platform pass-through); `nub run --filter docs test` (44 files /
  273 tests), `nub run check` and `nub run lint` pass.

## 8. Acceptance

- A scene that never grows a sized canvas cannot pass `smoke:preview`.
- The page rule from plan 473 and the scene rule here are the same rule, stated
  once each.
- The plan index and `TODO.md` are current; the commit is pushed on
  `agent/docs-site`.
