# Plan 206: Message Scroller — follow-new-content scrolling with a pinned reader

## Why

A chat, a log, a streaming agent transcript and an activity feed all need the same
behaviour, and getting it wrong is immediately felt: new content arrives while the
reader is scrolled up, and either the view yanks them to the bottom (losing their
place) or it silently stops following and they never see the reply. This is one of
the main behaviours this library should provide, and it is being ported from
**shadcn/ui's Message Scroller** (`https://ui.shadcn.com/docs/components/base/message-scroller`),
credited in `LICENSES/`.

The behaviour, not the browser implementation: a scroll container that follows new
content while the reader is at the end, leaves them alone when they are not, and
offers an explicit way back to the latest.

## Current state

- No message/chat/scroller component exists in `COMPONENTS.md` or the source.
- GPUix provides `<virtual-list>` (verified in the research), scroll handles and
  `motion`; the pin/jump/stream state machine is ours.
- The compound-part API convention comes from plan `200`; follow it
  (`Root` / `Viewport` / `Item` / `JumpToLatest`), not a single mega-prop component.

## Behaviour to implement

1. **Pinned reading.** While the reader is at (or within a small threshold of) the
   end, new items scroll into view. Threshold is a token, not a magic number.
2. **Do not steal the reader's place.** If they have scrolled up, new items do not
   move the viewport; instead the `JumpToLatest` affordance appears with an unread
   count.
3. **Jump to latest.** Activating it scrolls to the end and re-pins. A keyboard
   path must exist (the affordance is focusable, and `End` re-pins where the
   runtime supports it).
4. **Streaming rows.** An item can be appended to (a token stream); the scroller
   follows it only while pinned, and the item's height change must not fight the
   scroll position.
5. **Empty and short histories** render without a scrollbar and without the
   affordance.
6. **Long histories** use `<virtual-list>`; the pin decision must survive
   virtualization (measure from the end, not from absolute scroll height).

## API shape (target)

```tsx
<MessageScroller.Root>
  <MessageScroller.Viewport>
    {messages.map((m) => (
      <MessageScroller.Item key={m.id}>{m.body}</MessageScroller.Item>
    ))}
  </MessageScroller.Viewport>
  <MessageScroller.JumpToLatest />
</MessageScroller.Root>
```

Compound parts, a controlled `pinned` / `onPinnedChange` for consumers that need to
know, and no boolean-prop soup. Styling goes through the theme tokens; the parts are
plain enough to restyle — the shadcn rule.

## Steps

1. **A pure state machine first** (`messageScrollerLogic.ts` + its test): inputs are
   the scroll position, the viewport size, the content size and item-height changes;
   outputs are `pinned`, `unread` and `jumpRequested`. This is the part that must be
   unit-tested without a window.
2. **The parts**, on `<virtual-list>` + scroll handles, wired to that state machine.
3. **The affordance** — `JumpToLatest` with the unread count, themed and focusable.
4. **Docs page** with a live example: a simulated token stream, plus a "scroll up
   while streaming" demo that proves the reader is not yanked.
5. **Credit shadcn/ui** in `LICENSES/` (MIT) and on the docs page.

## Test plan

- **Unit (must pass without a native window):** pinned when at the end; unpinned
  when scrolled past the threshold; `unread` increments only while unpinned; a
  content resize while pinned keeps it pinned; a content resize while unpinned does
  not move the reader; `jumpToLatest` re-pins and clears `unread`. Each test must
  fail without the logic (e.g. remove the threshold → the "not yanked" test fails).
- **Native smoke (requires B1):** a real stream appends rows; the view follows while
  pinned and does not move after scrolling up; the affordance re-pins.

## Acceptance

- [ ] `MessageScroller` exists with compound parts and typed props.
- [ ] Pinned / unpinned / streaming / empty / long-history states behave as above.
- [ ] The pure state machine is unit-tested in both directions.
- [ ] A docs page with a streaming example and a scroll-up-while-streaming example.
- [ ] shadcn/ui credited in `LICENSES/` and on the page.
- [ ] Native smoke test passes — blocked by B1 until the playground runs.

## STOP conditions

- `<virtual-list>` cannot report a reliable distance-from-end → implement against a
  non-virtualized viewport first and record the limitation; do not fake the pin.
- The runtime has no scroll handle to observe → STOP and report; a timer-based
  approximation is not acceptable.
- Anything needs a change outside this workstream's paths → add a TODO, do not edit
  another workstream's files.

## Maintenance notes

- The threshold and the unread semantics are product decisions; keep them in tokens,
  not literals.
- If a later GPUix release adds a native "stick to bottom" primitive, swap step 2 to
  it and keep the state machine — the behaviour is the contract, the primitive is an
  implementation detail.
