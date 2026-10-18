# 473 — The live-preview page check must see a sized canvas, not only a ready flag

**Phase:** F/G (release gate truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455–458 (the surface and its smoke), 471/472 (the scene truth)

## 1. Why

`smoke:preview` proves two things per live page: the iframe reaches GPUI
(`data-gpuix="ready"`) and its `src` still names the scene. It never checks that
the surface has a **sized** canvas. Measured on the fixed tree (plan 472 run):

```
/docs/components/button  … (1x1)
/docs/components/tabs    … (606x358)
```

The first page it visits reports a 1×1 canvas and passes anyway. Either the
frame is still sizing when `ready` lands, or the first surface genuinely paints
1×1 — and the gate cannot tell. Every later page is 606×358 because it arrives
after the warm-up. A blank first frame is exactly the failure a release check
exists to catch.

The scene loop already rejects a zero canvas; the page loop, added later, does
not.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/scripts/smoke-live-preview.ts` | `openPageSurface` returns only when the frame is `ready` **and** the canvas is at least 2×2; otherwise it keeps polling to its existing timeout and reports `timeout`. Comment names the 1×1 observation. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row; keep the count current. |

No page, component or scene change: the smoke is the subject.

## 3. The change

Inside the polling expression, split `ready` from `sized`:

```js
if (state === "ready") {
  const canvas = frame?.contentDocument?.querySelector("canvas");
  const width = canvas?.width ?? 0;
  const height = canvas?.height ?? 0;
  if (width > 1 && height > 1) {
    return JSON.stringify({ state, src: frame?.getAttribute("src") ?? "", canvas: [width, height] });
  }
}
```

The existing 240 × 250 ms loop (60 s) is the sizing budget; a frame that never
grows past 1×1 reports `timeout` with `sawControl` true, and the caller already
fails on that state naming the page.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs smoke:preview --no-build` **before** | exit `0`, `/docs/components/button … (1x1)` |
| same **after** | exit `0`; every page reports a 606×358 canvas (the first page now waits for the size) |
| same with the threshold forced above the real width (proof only) | exit `1`, `FAIL live surface: /docs/components/button reported timeout` |
| `nub run check` / `nub run lint` | exit `0` |

## 5. STOP conditions

- A page never exceeds 1×1 even after the 60 s budget: that is a real surface
  defect. Record the page and the frame markup in this plan; do not lower the
  threshold to keep the gate green.
- The whole smoke now exceeds its 420 s budget because pages wait: raise the
  budget with a measured justification, or reduce the per-page wait; do not
  remove the size condition.
- The iframe's canvas is a 1×1 placeholder by design until the first paint: stop
  and record the evidence; a wait is then correct, but the gate must still see
  the grown canvas.

## 6. Test plan

- **Non-vacuous:** the forced-threshold run fails on the first page with
  `timeout`; the normal run passes with a sized canvas on every page.
- Record the before/after canvas pair for `/docs/components/button`.
- The scene loop's own size check is unchanged.

## 7. Acceptance

- Every page iframe is proven to reach a canvas larger than 1×1.
- Both runs above are recorded; `check` and `lint` pass; the plan index and
  `TODO.md` are current; the commit is pushed on `agent/docs-site`.

## 8. Progress (2026-10-18)

- **Before:** exit `0` with `/docs/components/button … (1x1)` and every later
  page `(606x358)`.
- **After:** exit `0`; all twelve page loads (eleven scenes plus Theming) report
  `(606x358)`, so the first frame was still sizing when `ready` landed, not
  blank.
- **Proof:** with the threshold forced to `> 2000`, the first page failed with
  `FAIL live surface: /docs/components/button reported timeout`, exit `1`;
  restored.
- The scene loop's size check is untouched.
