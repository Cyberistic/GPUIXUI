# 317 — Preview card

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §5 (D10), `112` (popover), `114` (shared row) |
| Status | done — 8 native tests; delay + pointer-travel + Escape proven |
| Source | `docs/component-api.md` §8 (planned parts: `PreviewCard`, `PreviewCardTrigger`, `PreviewCardContent`); `COMPONENTS.md` → Tier 2 → Preview Card; plan `205` D10 |

This plan is self-contained. It adds `PreviewCard` at the Tier 2 bar.

---

## 1. Why

A link in a document or a row in a list can preview what it points at: a title,
a description, an avatar or a small image. `Popover` opens on a click; a preview
card must also open on **hover** and **focus**, and close when the pointer
leaves both the trigger and the card. That timing rule is the component.

Positioning is GPUix's `FloatingLayer` + `<anchored>` (published 0.10.0), and
dismissal shares the package's dismiss stack, exactly as `Popover` does.

## 2. The target API

```tsx
<PreviewCard>
  <PreviewCardTrigger>design-system.md</PreviewCardTrigger>
  <PreviewCardContent label="design-system.md">
    <Card>
      <CardHeader>
        <CardTitle>Design system</CardTitle>
        <CardDescription>Tokens, roles and themes.</CardDescription>
      </CardHeader>
    </Card>
  </PreviewCardContent>
</PreviewCard>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `PreviewCard` | open state (controlled/uncontrolled), the hover/focus open policy, the close timer | `open?`, `defaultOpen?`, `onOpenChange?`, `openDelay?` (default 300 ms), `closeDelay?` (default 150 ms), children |
| `PreviewCardTrigger` | a focusable trigger: hover/focus opens, `aria-expanded` | the local `ButtonProps` |
| `PreviewCardContent` | the anchored surface; hovering it keeps the card open, leaving it schedules the close | `label` (required), `side?` (`"bottom"` default), `align?`, `sideOffset?`, `collisionPadding?`, children |

### Behaviour contract

- **Open:** `mouseEnter` on either the trigger or the content starts the open
  path; focus on the trigger opens **immediately** (no delay) for keyboard
  users. The pointer must stay on one of the two surfaces for `closeDelay` ms
  before the card closes; re-entering cancels the close.
- **Close:** Escape (restores focus to the trigger), an outside press, or the
  close delay elapsing after the pointer leaves both surfaces.
- **No hover on touch:** there is no pointer-type signal in 0.10.0; a press on
  the trigger toggles the card, so touch and keyboard both have a path.
- **Timers** are `window.setTimeout`/`clearTimeout` inside the component, because
  they are UI timing at the boundary. The delays are props so tests pass `0` and
  do not sleep for 300 ms. Record this in the docs: this is a UI timer, not a
  domain clock.
- The content is **hoverable** (unlike a tooltip): it may contain a link or a
  small action, which is what makes it a preview *card*.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/preview-card.tsx` | **create** — the three parts, the timers, `previewCardMeta` |
| `packages/components/src/index.ts` | add `export * from "./preview-card.js";` |
| `packages/components/src/inventory.ts` | import and list `previewCardMeta` |
| `packages/components/src/behaviour/preview-card.test.tsx` | **create** — 8 tests, `openDelay={0}` |
| `packages/components/examples/preview-card.example.tsx` | **create** — a document link with a real PreviewCard |
| `packages/components/docs/preview-card.mdx` | **create** |
| `docs/component-api.md` | move Preview card into the built table |
| `COMPONENTS.md` | row → `done` / `partial`, 8 native tests, the timers/pointer limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: PreviewCard 8
nub run --filter @gpuixui/components test             # expected: inventory pass
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- `onMouseEnter`/`onMouseLeave` are not delivered on the trigger or the content
  (they are part of the host event map) — measure with the real renderer, then
  fall back to a click-only preview and record the loss;
- the hover timer cannot be advanced without real time in the test renderer —
  use `openDelay={0}`/`closeDelay={0}` plus one `await new Promise(r =>
  setTimeout(r, 10))`, and never claim a delay test that did not wait;
- the content cannot receive pointer events inside a `FloatingLayer` — record
  the evidence and make the card non-interactive (a large tooltip) rather than
  claiming a hoverable card.

## 6. Test plan

`src/behaviour/preview-card.test.tsx`, `openDelay={0}`, `closeDelay={0}`:

1. renders only the trigger until it is hovered;
2. hovering the trigger opens the content after the delay; focus opens it
   immediately;
3. moving the pointer from the trigger into the content keeps it open;
4. moving it out of both closes it after `closeDelay`;
5. Escape closes it and returns focus to the trigger;
6. an outside press closes it;
7. the content is named by `label` and the trigger reports `aria-expanded`;
8. controlled `open` + `onOpenChange` and a consumer `style` on the content.

**Both directions.** Ignore the content's `mouseEnter` (cancel the close on any
enter): test 3 fails. Skip `focus` → open: test 2 fails. Restore after each.

## 7. Acceptance criteria

- Three parts with JSDoc; delays are props with documented defaults.
- Eight native tests that can fail; timers proven to be the component's.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.

## 8. Result

Landed 2026-10-18:

- `src/preview-card.tsx` — three parts. One measured runtime fact shaped the
  close policy: moving the pointer dispatches the **new** element's `mouseEnter`
  before the **old** element's `mouseLeave` (probed directly), so a naive
  "leave schedules close" policy closed the card as the pointer entered it. The
  card tracks `trigger`/`content` pointer occupancy in refs and only schedules a
  close when neither holds the pointer.
- `src/behaviour/preview-card.test.tsx` — 8 tests with `openDelay={20}`,
  `closeDelay={20}` and a real timer wait. A second measured fact: hovering the
  card's **centre** can land on a child, which delivers the content's leave, so
  the suite hovers the card's padding. The "elsewhere" target sits 200 px to the
  right so the open card never covers it.
- **Both directions:** removing the content's enter-cancel and the focus-open
  branch fails 7 tests. Restored: 8 native green.
