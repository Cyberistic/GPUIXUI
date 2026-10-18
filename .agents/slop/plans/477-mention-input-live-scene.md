# 477 — Mention input's suggestion list is a live scene

**Phase:** F (showcase completeness) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455–458 (the live surface and the scene contract), 461 (the
record), 475 (a scene's canvas must be sized), 476 (the same gap-reason rule)

## 1. Why

Two measurements say the recorded gap is false:

- `packages/components/src/mention-input.tsx:86–87` takes `value` and
  `defaultValue`;
- line 131 derives the open query from that text: `dismissed ? None :
  mentionQuery(text)`.

So an initial `@token` opens the real ranked suggestion list, and the gap reason
("the suggestion list exists only while a query is open and no prop opens it")
is no longer true. The list is the interaction a still cannot prove — rows,
highlighting and the anchored placement — so the page belongs at tier L.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | Add `mention-input` to `LIVE_SCENES`; add its expectation. |
| `apps/docs/preview/scene-views.tsx` | Import the parts; add `MentionInputScene` with `defaultValue="@ali"`, three `MentionInputItem` rows and a `MentionInputList`; register it. |
| `apps/docs/src/component-meta/entries.ts` | `liveScene: "mention-input"` on the record. |
| `apps/docs/src/components/preview/gaps.ts` | Remove the `mention-input` entry. |
| `apps/docs/src/components/preview/scene-contract.test.ts` | Add the pairing to `interactionScenes`. |
| `docs/preview-strategy.md` | Counts: thirteen → fourteen scenes, seven → six gaps; remove the row. |
| `apps/docs/README.md` | The live-scene list names Mention input. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row; keep the count current. |

## 3. The scene

```tsx
const MentionInputScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Comment composer</Text>
    <MentionInput label="Comment" defaultValue="@ali">
      <MentionInputList>
        <MentionInputItem value="alice" />
        <MentionInputItem value="alicia" />
        <MentionInputItem value="bob" />
      </MentionInputList>
    </MentionInput>
  </Stack>
);
```

`SCENE_TEXT["mention-input"] = "@alice"` — the row label `MentionInputItem`
paints, not the scene's own heading. `@alice` is inside the component region, so
the plan-472 rule needs no exemption.

## 4. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter docs test` | `scene-contract.test.ts` and `preview-gaps.test.ts` pass; the gap set is six |
| `nub run --filter docs smoke:preview` | exit `0`; `scene mention-input ready — 640x160 canvas`; the page loads its iframe; the mode and platform proofs still pass |
| `nub run check`, `nub run lint`, `nub run test` | exit `0` |

Two-direction proof: delete `defaultValue="@ali"` from the scene, rebuild and
run; `smoke:preview` fails with
`FAIL live scene mention-input: expected "@alice" in the GPUI tree`. Restore.

## 5. STOP conditions

- The list does not open from the initial value: record the painted tree and the
  measured `mentionQuery` behaviour. The gap reason is then still true — restore
  the `gaps.ts` entry and stop; do not fake an open list.
- The list renders but the anchored layer paints off-canvas: record the box; do
  not move the assertion to the scene heading.
- The scene never reaches a sized canvas: record the scene key and the run; a
  scene that does not paint is not shipped.

## 6. Test plan

- `scene-contract.test.ts`: the key is unique, the expectation occurs in the
  view, it is component text, the record declares the scene, the slug matches,
  and the gap set equals the real gaps.
- `preview-gaps.test.ts`: the document names the same six gaps.
- `smoke:preview` drives the standalone scene and the page iframe.
- Two directions: without the initial token the smoke fails by name; with it, it
  passes.

## 7. Progress (2026-10-18)

- `smoke:preview` reports `scene mention-input ready — 640x160 canvas` and
  `/docs/components/mention-input loaded the live iframe`.
- Two-direction proof: with `defaultValue="@ali"` removed, the run failed with
  `FAIL live scene mention-input: expected "@alice" in the GPUI tree (["Comment composer"])`
  (exit `1`); restored, it passes.
- `nub run --filter docs test` (44 files / 273 tests), `nub run check`,
  `nub run lint`, `nub run test`, `smoke:build` and `smoke:browser` pass.

## 8. Acceptance

- The Mention input page renders the real suggestion list on GPUix's wasm
  renderer, with its native evidence beneath it.
- The gap set is six and the document, code and records agree.
- The plan index and `TODO.md` are current; the commit is pushed on
  `agent/docs-site`.
