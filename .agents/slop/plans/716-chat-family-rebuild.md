# 716 — Chat family on shadcn's Bubble / Message / MessageScroller

## Why

The chat demo resized as messages arrived and when the status changed. The
scroller, the jump affordance and the failed-reply row were siblings in a
non-growing column: every one of them took height from the viewport, so the
transcript's box and the composer moved. The chat family also predates shadcn's
`Bubble` surface: `MessageContent` owns the bubble, so a caller cannot use a
bubble on its own, cannot group bubbles, and has no hover/focus action row,
timestamp or reaction row.

## Target composition

```
Chat
├── ChatHeader          title · status/error · actions (fixed row)
├── ChatMessages        MessageScroller (flex: 1 1 0, min-height: 0)
│   └── MessageScrollerViewport
│       └── MessageScrollerContent
│           └── MessageScrollerItem
│               └── Message
│                   ├── MessageAvatar
│                   └── MessageContent
│                       ├── MessageHeader
│                       ├── Bubble
│                       │   ├── BubbleAvatar
│                       │   ├── BubbleContent
│                       │   ├── BubbleActions
│                       │   └── BubbleReactions
│                       └── MessageFooter
└── ChatComposer        field · send/stop · hint · attachments (fixed row)
```

## Decisions

- **Fixed rows, flexible middle.** `ChatRoot` is `flex: 1 1 0` with
  `min-height: 0`; `ChatHeader` and `ChatComposer` are `flex-shrink: 0`;
  `ChatMessages` is `flex: 1 1 0; min-height: 0`. The viewport grows inside it.
  No part of the scroller may take height from the viewport when it appears.
- **The jump control owns a reserved rail** (`MESSAGE_SCROLLER_RAIL`, one
  control height). It fades and travels 4px inside that rail, so showing it
  never changes the viewport's height. `position: absolute` resolves against the
  mount parent in 0.11.0, so a floating corner control is not honest; the rail
  is the strongest alternative and is documented.
- **The failed reply lives in the header.** It used to be a row between the
  viewport and the affordance, which shrank the viewport when it appeared. The
  header is already fixed; the copy is one line (`lineClamp: 1`) with the full
  sentence in `aria-description`, and the retry action sits beside it.
- **Scroller state is a `LocalState` store** (`message-scroller/store.ts`):
  `pinned`, `unread`, `streaming`, `hold`. React subscribes through
  `useLocalState`; handlers call store commands through `send`. No `useState`
  owns scroll state.
- **Bubble is independent of Message.** `variant`, `align`, `maxWidth`
  (`DimensionValue`, default `"80%"`, `ghost` `"100%"`), `group` position
  (`single`/`first`/`middle`/`last`) and a `radius` override. Parts:
  `BubbleAvatar`, `BubbleContent`, `BubbleActions`, `BubbleReactions`,
  `BubbleGroup`.
- **Actions are reserved, not floating.** `BubbleActions` is always laid out
  when a caller supplies it; it fades in on pointer-over or its own focus. That
  keeps hover from moving the transcript.
- **Message owns author, timestamp and meta.** `variant` selects the default
  author and alignment; `author`, `timestamp`, `meta`, `avatar` (name/src) are
  root props; `MessageHeader` and `MessageAvatar` read them from context. The
  bubble is a child (`Bubble`), never built by `MessageContent`.
- **No transform.** The jump control uses `motion` `opacity` + `top`. Nothing
  else moves on arrival.

## Files

Create:

- `packages/components/src/bubble.tsx`
- `packages/components/src/bubble/logic.ts` (variant/align/group tables, guards)
- `packages/components/src/message-scroller/store.ts`
- `packages/components/src/behaviour/bubble.test.tsx`
- `packages/components/src/behaviour/chat-layout.test.tsx` (screenshots use the
  `sidebar-screenshots` pattern and land in `apps/playground/.artifacts/live/`)
- `packages/components/examples/bubble.example.tsx`
- `packages/components/docs/bubble.mdx`

Rewrite:

- `packages/components/src/message.tsx`
- `packages/components/src/message-scroller.tsx`
- `packages/components/src/chat.tsx`
- `packages/components/src/{chat,message,message-scroller}/logic.ts` where the
  new rules live
- `packages/components/docs/{chat,message,message-scroller}.mdx`
- `packages/components/examples/{chat,message,message-scroller}.example.tsx`
- `packages/tw/src/recipes.ts` (BUBBLE_*, MESSAGE_*, CHAT_HEADER_*,
  MESSAGE_SCROLLER_RAIL/CONTENT)
- `apps/docs/src/components/docs/chat-demo.tsx` + `demos.css` + test: the chat
  preview becomes the shadcn-shaped block (header with title/status/reset,
  scrolling transcript, composer) at a fixed height.
- `COMPONENTS.md`, `packages/components/src/inventory.ts`,
  `packages/components/src/index.ts`, `TODO.md`.

## Tests

1. `bubble.test.tsx`: every variant paints its role (both themes); align end;
   80% default and an override; ghost full width/no frame; group position
   squares the sender-side corners; avatar sits on the outer edge; actions are
   hidden until hover and until their own focus; reactions render as a named row;
   misplaced parts are rejected.
2. `chat-layout.test.tsx`:
   - fixed 360px-tall chat; record the composer's `y`; append three messages;
     assert the composer's `y` is unchanged on each append and the viewport's
     `scrollTop` follows (decreases) while pinned and the last row stays visible.
   - wheel up, record offset and composer `y`; append three; assert both are
     unchanged and the jump control is active with `3 new messages`.
   - grow a streaming row while pinned → composer `y` unchanged and tail
     visible; grow it while scrolled up → offset and composer `y` unchanged.
   - capture four frames (`chat-idle`, `chat-streaming`, `chat-scrolled`,
     `chat-block`) and assert each file is non-empty after asserting the state
     painted.
3. Invert each new case against its source (remove the viewport's
   `flex: 1 1 0`, then the pinned scroll effect, then the rail) and record the
   failure. Restore.
4. `nub run --filter @gpuixui/components test`, `test:behaviour`,
   `nub run --filter @gpuixui/docs test`, `nub run check`.

## STOP conditions

- The renderer cannot paint `maxWidth: "80%"` or a 4px motion travel.
- Any layout-shift case cannot be made to fail by inverting a source line (the
  test would be unproven).
- A native behaviour suite cannot run on this host.

## Acceptance

The four new files above exist, the four frames exist under
`apps/playground/.artifacts/live/`, `COMPONENTS.md`/inventory/`TODO.md` are
current, and the two-direction runs are recorded in the report.
