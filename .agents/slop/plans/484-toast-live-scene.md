# 484 — Toast gets a live scene

**Phase:** F (showcase completeness) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455–458 (the live surface and the scene contract), 461 (the
record), 475 (a scene's canvas must be sized), 476–478 (the gap-reason rule),
483 (the chrome no longer denies the live surface)

## 1. Why

Toast is one of the six delivered pages with neither a live scene nor an
illustration (`apps/docs/src/components/preview/gaps.ts`). Its measured reason
was:

> A scene must race the toast's own dismissal, and its provider pulls the
> Effect runtime into every scene.

The first half is false against the shipped API. `ToastInput.duration` is a
`Schema.Duration`, and the store only schedules a timer when the duration is
**positive and finite** (`packages/components/src/toast/store.ts`,
`dismisses`). `Duration.infinity` therefore keeps a toast on screen until it is
explicitly dismissed, and `packages/components/src/toast/store.test.ts` already
proves it with a `persistent` fixture. A scene that pushes once on mount with an
infinite duration is deterministic — nothing to race.

The second half is a bundle cost, not a correctness block. The scene bundle is
the isolated click-to-load `/gpuix-preview/` document behind a ~19 MB wasm
asset; the effect module adds a fraction of that. This plan measures the growth
and records it.

The result: the Toast page shows the real `ToastProvider`, the real
`ToastViewport` and a real toast card on GPUix's WebAssembly renderer, with the
native tier (the behaviour suite) still beneath it. The gap set falls from six
to five.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | Add `"toast"` to `LIVE_SCENES`; add `SCENE_TEXT.toast = "The site rebuilds in about a minute."`. |
| `apps/docs/preview/scene-views.tsx` | Import `ToastProvider`, `ToastViewport`, `useToast` from `@gpuixui/components/toast`; add `ToastScene`; register it in `LIVE_SCENE_VIEWS`. |
| `apps/docs/src/component-meta/entries.ts` | `liveScene: "toast"` on the toast record. |
| `apps/docs/src/components/preview/gaps.ts` | Remove the `toast` entry; update the doc comment if the count is named. |
| `apps/docs/src/components/preview/scene-contract.test.ts` | Add `["toast", "toast"]` to `interactionScenes`. |
| `apps/docs/content/docs/components/toast.mdx` | Remove “No live scene ships for this component yet…”; describe the scene in Composition. |
| `docs/preview-strategy.md` | Fifteen → sixteen scenes, add Toast to the tier-L row and the scene sentence; six → five gaps; delete the `toast` gap row. |
| `apps/docs/README.md` | Add Toast to the live-scene list. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | Tick the live-scene gap row; keep the “every `liveScene` gap is measured” row truthful. |

## 3. The scene

`preview/scene-views.tsx` gains one composition. The push runs once because
`push` is a stable `useCallback` over the runtime; `toast` (the API object) is
not used as an effect dependency, because it changes identity whenever the
queue changes and would re-push forever.

```tsx
const ToastSurface = (): ReactElement => {
  const toast = useToast();
  useEffect(() => {
    toast.push({
      title: "Changes published",
      description: "The site rebuilds in about a minute.",
      tone: "success",
      duration: Duration.infinity,
    });
  }, [toast.push]);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Notifications</Text>
      <Text role="body" tone="muted">
        A persistent toast, so the surface never races its own dismissal.
      </Text>
      <ToastViewport />
    </Stack>
  );
};

const ToastScene = (): ReactElement => (
  <ToastProvider>
    <ToastSurface />
  </ToastProvider>
);
```

`SCENE_TEXT.toast` is the toast's description — text the card paints, not the
scene's own heading (the rule plan 472 added). The viewport paints over the
bottom-right of the surface; the scene's own background is the active theme.

## 4. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter docs test` | pass; the scene contract, gap and preview tests agree |
| `nub run --filter docs smoke:preview` | exit `0`; a `scene toast ready — WxH canvas` line with a sized canvas; no `FAIL live scene toast`; the Button light/dark and unknown-scene proofs still pass |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` |

Two-direction proof: remove the `toast.push` call and rebuild; the surface then
paints only the scene's own text and `smoke:preview` fails with
`FAIL live scene toast: expected "The site rebuilds in about a minute." in the
GPUI tree (["Notifications","A persistent toast, so the surface never races its
own dismissal."])`. Restore the push and it passes. (A one-second duration is
not a valid negative control: the check can read the tree before the dismissal,
so it passes by winning the race — the missing push is deterministic.)

Bundle measurement: the preview's JS asset grows from 536,266 to 714,565 bytes
(+178,299, the effect module); the 19.1 MB wasm asset is unchanged. The preview
is a click-to-load document, so the reader pays this only when they open a live
surface; it is recorded, not hidden.

## 5. STOP conditions

- **The renderer never reaches a sized canvas for the toast scene.** Record the
  scene key and the smoke output; stop, restore `gaps.ts` and the record, and
  keep the measured reason. Do not accept a 1×1 frame (plan 475).
- **The effect runtime throws in the browser renderer** (`data-gpuix="failed"`
  with a reason from the provider). Record the reason; stop and leave the page
  at tier V. Do not mount a hand-built card that imitates `ToastViewport`.
- **The scene paints no toast after the push** (the text is absent from
  `getAllText()`). Record the tree; stop. The next honest step is a component
  change (a `defaultOpen`-shaped initial queue), not a docs-side fake.
- **`smoke:preview` cannot run** (no Chrome / no WebGPU): report exit `2` as
  unverified and do not claim the scene passes.

## 6. Test plan

- `scene-contract.test.ts` already enforces, for every scene: a unique key, a
  non-empty expectation, the expectation occurring in the view, the expectation
  not being the scene's own `<Text role="h3">`, the record declaring the scene,
  the slug equalling the scene key, and the gap set equalling the real gaps.
  Adding Toast to `interactionScenes` makes it part of that contract.
- `preview-gaps.test.ts` compares `gaps.ts` with
  `docs/preview-strategy.md`, so the count and the table must change together.
- `smoke:preview` is the runtime proof; it derives every scene from
  `LIVE_SCENES`, so the new key is driven without a second list.
- Two directions: the infinite duration passes; a one-second duration fails by
  the scene's name and expected text.

## 7. Progress (2026-10-18)

- Landed: the scene, the record, the gap set (six → five), the page prose and
  the document/README counts.
- `nub run --filter docs test`, `nub run check`, `nub run lint` and
  `nub run test` pass.
- `smoke:preview`: `scene toast ready — 640x160 canvas, 6 text nodes`, and
  `/docs/components/toast loaded the live iframe` (606×358).
- Two-direction proof: with the `toast.push` call removed, the run exits `1` and
  names the scene and the missing text; restored, it exits `0`. A one-second
  duration passed by winning the read race and is therefore **not** used as the
  negative control.
- Measured bundle: 536,266 → 714,565 bytes of preview JS (+178 KB for the effect
  module); wasm unchanged.

## 8. Acceptance

- The Toast page renders a real toast on GPUix's wasm renderer, with its native
  suite and source beneath it.
- `gaps.ts`, `docs/preview-strategy.md`, the README and `TODO.md` agree.
- All gates and the live-surface smoke pass; the commit is pushed on
  `agent/docs-site`.
