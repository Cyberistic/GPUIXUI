# Plan 207: AI conversation — `Chat` and `Message` (shadcn AI Elements behaviour port)

## Why

This library exists to build AI-heavy desktop tools, so the conversation surface is one of
the main behaviours to provide. Port the **behaviour** of **shadcn/ui's AI Elements
`chat` and `message`** (https://ui.shadcn.com/docs/ai-elements/base/chat,
https://ui.shadcn.com/docs/ai-elements/base/message) — credited in `LICENSES/` — not the
browser implementation. `message` is the row; `chat` is the conversation built on the
Message scroller.

## Depends on

`206` (Message scroller — the pinned follow/jump-to-latest behaviour), `200` (compound-part
API contract), `201` (runtime/context/parts state model), `203` (capability map). GPUix
provides `<markdown>` for content and `<virtual-list>` for long histories.

## Scope

**`Message`** — one row of a conversation.

- **Variants:** `user`, `assistant`, `system` (a closed schema union, not a loose string).
- **Parts:** `Root`, `Avatar`, `Content`, `Actions`.
- **Slots (all optional, never booleans):** attachments, reasoning (collapsible, closed by
  default), tool calls (name → status → result), sources/citations, a streaming indicator.
- **Actions:** copy, retry, feedback — slots a consumer wires; the component renders none by
  default.

**`Chat`** — the conversation scaffold.

- **Parts:** `Root`, `Messages` (a `Message.Scroller` viewport), `Composer`.
- **Composer:** text input, submit, stop-while-streaming, attachments, an empty state.
- **Status:** `idle | submitting | streaming | error`, modelled as a schema tagged union.
- **Keyboard:** Enter submits, Shift+Enter newlines, Esc stops a stream (where the runtime
  delivers those keys — verify, do not assume).

## Behaviour

- **Streaming appends without layout jank** — the composer stays put and the scroller follows
  only while pinned (the `206` contract).
- **Reasoning collapses by default** and expands on demand; its height change must not fight
  the scroll position.
- **Tool calls** show status and result, and a failed call is visibly failed, not silently
  empty.
- **Sources** render as links/citations.
- **Error** shows the failure and offers retry; retry is the consumer's callback, the
  component only emits the intent.
- **AccessKit** roles/labels where supported; note the known gaps (`aria-checked`,
  `aria-valuenow`, `aria-labelledby`, `aria-describedby` are absent in 0.10.0) rather than
  pretending full ARIA.

## API shape (target)

```tsx
<Chat.Root status={status} onStop={stop}>
  <Chat.Messages>
    {messages.map((m) => (
      <Message.Root key={m.id} variant={m.role}>
        <Message.Avatar />
        <Message.Content>{m.body}</Message.Content>
        <Message.Reasoning>{m.reasoning}</Message.Reasoning>
        <Message.Actions onRetry={retry} />
      </Message.Root>
    ))}
  </Chat.Messages>
  <Chat.Composer onSubmit={send} attachments />
</Chat.Root>
```

## Test plan

- **Unit (no native runtime):** the status union transitions (`idle → submitting →
  streaming → idle|error`); Stop during `streaming` does **not** emit submit; a user message
  and an assistant message render different variants; optional slots render nothing when
  absent. Each must fail without the code (e.g. remove the stop guard → the "stop does not
  submit" test fails).
- **Native smoke (requires B1):** a simulated token stream appends rows and the scroller
  follows while pinned, then stops following after scrolling up; retry after error restores
  the composer.

## Acceptance

- [ ] `Message` and `Chat` exist with compound parts, variants and slots.
- [ ] Streaming, reasoning, tool calls, sources, error/retry behave as above.
- [ ] Docs pages: a live streaming example, a reasoning/tool-call example, a retry-on-error
      example.
- [ ] shadcn/ui AI Elements credited in `LICENSES/` and on both pages.
- [ ] Native smoke test passes — blocked by B1 until the playground runs.

## STOP conditions

- `<markdown>` cannot render incrementally during streaming → render plain text while
  streaming and record the limitation; do not fake token-level markdown.
- The runtime does not deliver Enter/Shift+Enter/Esc to the composer → STOP and report; a
  guessed keymap is worse than a documented gap.
- AccessKit cannot express a required role/label → document it in the component page's
  accessibility section.

## Maintenance notes

- `206` owns scrolling; do not reimplement pin logic here.
- If GPUix later ships a chat/transcript primitive, adopt it at the `Chat.Messages` seam and
  keep the state unions — the behaviour is the contract.
