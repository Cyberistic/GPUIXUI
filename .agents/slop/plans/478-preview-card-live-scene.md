# 478 — Preview card gets a live scene

**Phase:** F (showcase completeness) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455–458 (the live surface and the scene contract), 461 (the
record), 475 (a scene's canvas must be sized), 476/477 (the gap-reason rule)

## 1. Why

Preview Card is an **interaction-only** component: its value is the hover/focus
card, and its page currently shows only a tier-A static approximation of one.
`PreviewCard` takes `defaultOpen`
(`packages/components/src/preview-card.tsx:70–71`), so the real anchored card can
be mounted open on the GPUix renderer, with its real delays, dismiss layer and
content. That is the strongest honest preview for the page.

The page is not in `gaps.ts` (it has an illustration), so this plan does not
change the gap set; it adds a fifteenth scene and keeps the tier-A rest state
beneath it.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | Add `preview-card` and its expectation. |
| `apps/docs/preview/scene-views.tsx` | Import the parts; add `PreviewCardScene` with `defaultOpen`; register it. |
| `apps/docs/src/component-meta/entries.ts` | `liveScene: "preview-card"` on the record. |
| `apps/docs/src/components/preview/scene-contract.test.ts` | Add the pairing to `interactionScenes`. |
| `docs/preview-strategy.md` | Counts: fourteen → fifteen scenes; add Preview card to the lists. |
| `apps/docs/README.md` | The live-scene list names Preview card. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row; keep the count current. |

## 3. The scene

```tsx
const PreviewCardScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">File preview</Text>
    <PreviewCard defaultOpen>
      <PreviewCardTrigger>design-system.md</PreviewCardTrigger>
      <PreviewCardContent label="design-system.md">
        <Stack direction="column" gap="sm">
          <Text role="label">Design system</Text>
          <Text role="body" tone="muted">
            Tokens, semantic roles and the theme extension mechanism.
          </Text>
        </Stack>
      </PreviewCardContent>
    </PreviewCard>
  </Stack>
);
```

`SCENE_TEXT["preview-card"] = "Tokens, semantic roles and the theme extension mechanism."`
— the card's body, not the scene's heading.

## 4. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter docs test` | the scene contract and gap tests pass |
| `nub run --filter docs smoke:preview` | exit `0`; `scene preview-card ready — 640x160 canvas`; the page loads its iframe; the mode and platform proofs still pass |
| `nub run check`, `nub run lint`, `nub run test` | exit `0` |

Two-direction proof: remove `defaultOpen`, rebuild and run; `smoke:preview`
fails with
`FAIL live scene preview-card: expected "Tokens, semantic roles and the theme extension mechanism." in the GPUI tree`.
Restore.

## 5. STOP conditions

- The card does not render from `defaultOpen`: record the painted tree; restore
  the record to no live scene and stop. Do not fake an open card.
- The card paints off-canvas because the trigger sits near the window edge:
  reposition the scene, not the expectation.
- The scene never reaches a sized canvas: record the key and the run.

## 6. Test plan

- `scene-contract.test.ts`: unique key, expectation occurs in the view, it is
  component text, the record declares the scene, the slug matches.
- `smoke:preview` drives the standalone scene and the page iframe.
- Two directions: without `defaultOpen`, the smoke fails by name; with it, it
  passes.

## 7. Progress (2026-10-18)

- `smoke:preview` reports `scene preview-card ready — 640x160 canvas` and
  `/docs/components/preview-card loaded the live iframe`.
- Two-direction proof: with `defaultOpen` removed, the run failed with
  `FAIL live scene preview-card: expected "Tokens, semantic roles and the theme extension mechanism." in the GPUI tree`
  (exit `1`); restored, it passes.
- `nub run --filter docs test`, `nub run check`, `nub run lint` and
  `nub run test` pass.

## 8. Acceptance

- The Preview Card page renders the real open card on GPUix's wasm renderer,
  with its static approximation and native evidence beneath it.
- The scene contract holds and the mode/platform proofs still pass.
- The plan index and `TODO.md` are current; the commit is pushed on
  `agent/docs-site`.
