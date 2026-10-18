# 207 — AI conversation: `Chat` and `Message`

**Phase:** C/E · **Owner:** components workstream · **Depends on:** 200, 201, 203,
206. **Status:** planned (expanded 2026-10-18 for a weaker executor).

Port the **behaviour** of **shadcn/ui's AI Elements `chat` + `message`**, credited
in the docs pages and in `LICENSES/` (owned by the licensing workstream — see
§9). `Message` is one conversation row; `Chat` is the scaffold that hosts rows, a
scroller and a composer. No shadcn source is copied: the API is translated to
this package's flat compound-part convention (`MessageScroller`-style exports,
`docs/component-api.md`), and every interaction is implemented on GPUix host
elements.

The dotted names in the mission sketch (`Chat.Root`) become flat exports
(`Chat`, `ChatMessages`, `ChatComposer`) because that is the API shape every
landed component in this package uses (`docs/component-api.md` §1, ADR 0004).

---

## 1. What exists already (read these first)

| Thing | Path | Why it matters |
| ----- | ---- | -------------- |
| Scroller rules | `src/message-scroller.tsx`, `src/message-scroller/logic.ts` | `ChatMessages` **composes** it; do not reimplement pin/unread |
| Compound parts | `src/internal/parts.ts` | `assertParts`, `PartChildren`; every root calls it |
| Local controls | `src/internal/button.tsx` | activation + focus ring for submit/stop/retry rows |
| Theme seam | `src/internal/theme.ts` | only file allowed to read `@gpuixui/tokens` |
| Disclosure | `src/collapsible.tsx` | `MessageReasoning` composes it; do not rewrite open state |
| Avatar | `src/avatar.tsx` | `MessageAvatar` reuses it |
| Inventory | `src/inventory.ts`, `src/inventory.test.ts` | one record per component; the test parses `COMPONENTS.md` |
| Conventions | `docs/message-scroller.mdx`, `examples/message-scroller.example.tsx` | page + example shape |

Measured runtime facts (pinned `@gpuix/native@0.10.0`):

- `<markdown source="…" onLinkClick>` exists (`dist/host.d.ts`); its text is only
  visible through `renderer.getPaintedText()`, not `getAllText()`.
- `<textarea>` accepts `value`, `onChange`, `onSubmit` (**Enter with the listener
  set**), `onKeyDown`, `minRows`, `maxRows`.
- No `href` element, no `aria-live`, no `aria-checked`, no `aria-labelledby`.
- `getPaintedText()` and `findByTestId` are the assertion tools; native tests
  live under `src/behaviour/`.

## 2. Files to create or change

| # | File | Change |
| - | ---- | ------ |
| 1 | `packages/components/src/message.tsx` | **create** — `Message` + parts + `messageMeta` |
| 2 | `packages/components/src/chat.tsx` | **create** — `Chat`, `ChatMessages`, `ChatComposer`, `ChatEmpty` + `chatMeta` |
| 3 | `packages/components/src/chat/logic.ts` | **create** — `ChatStatus` schema union and pure transitions |
| 4 | `packages/components/src/chat/logic.test.ts` | **create** — transition table, both-direction cases |
| 5 | `packages/components/src/behaviour/message.test.tsx` | **create** — 9 native tests |
| 6 | `packages/components/src/behaviour/chat.test.tsx` | **create** — 9 native tests |
| 7 | `packages/components/examples/message.example.tsx` | **create** — variants + every slot |
| 8 | `packages/components/examples/chat.example.tsx` | **create** — simulated stream, reasoning, tool call, failure/retry |
| 9 | `packages/components/docs/message.mdx` | **create** — page per MISSION §docs |
| 10 | `packages/components/docs/chat.mdx` | **create** — page per MISSION §docs |
| 11 | `packages/components/src/index.ts` | add `export * from "./chat.js";` and `./message.js` (alphabetical) |
| 12 | `packages/components/src/inventory.ts` | import + list `chatMeta`, `messageMeta` |
| 13 | `packages/components/src/inventory.test.ts` | parse the row from the record's **own tier** (row lookup is currently Tier-2-only) |
| 14 | `packages/components/src/behaviour/theme-matrix.test.tsx` | one both-theme row each for `Message` (bubble fill) and `ChatComposer` (surface) |
| 15 | `COMPONENTS.md` | Tier 5 `Chat (AI conversation)` and `Message (AI message row)` rows: `done`, `partial`, native test count, limitations |
| 16 | `TODO.md` | tick plan 207 under Phase C/`packages/components` |
| 17 | `.agents/slop/plans/README.md` | 207 status → done with counts |

Do **not** touch `LICENSES/`, `apps/docs`, `apps/playground` or
`packages/testing` — other workstreams own them. Record the needed changes in
`TODO.md` → Interlocks (§9).

## 3. Design

### 3.1 `Message` — flat parts over one context

```tsx
<Message variant="assistant" streaming>
  <MessageAvatar name="Ada" />
  <MessageContent text={body} onLinkClick={open} />
  <MessageReasoning text={reasoning} />
  <MessageToolCalls calls={calls} />
  <MessageSources sources={sources} onSelect={openSource} />
  <MessageAttachments attachments={files} />
  <MessageStreaming />
  <MessageActions>
    <Button size="sm" onClick={retry}>Retry</Button>
  </MessageActions>
</Message>
```

- `Message.props`: `variant: "user" | "assistant" | "system"` (required),
  `streaming?: boolean` (default `false`), `children?: PartChildren`.
  Renders `role="group"` + `aria-label={`${variant} message`}`.
  The root lays out one row: `user` is `row-reverse` and right-aligned,
  `assistant`/`system` are left-aligned; the variant is carried in a context so
  `MessageContent` picks its bubble fill (`user` = `primary`/`primaryForeground`,
  `assistant` = `muted`/`foreground`, `system` = transparent/`mutedForeground`).
- `MessageAvatar.props`: `name`, `src?` — renders `<Avatar size="sm">`.
- `MessageContent.props`: `text: string` (not children — `PartChildren` rejects
  text), `format?: "markdown" | "text"` (default `"markdown"`), `onLinkClick?`.
  Markdown is `<markdown source={text}>`; `format="text"` is `<text>{text}</text>`.
  Use `format="text"` for a streaming token append if §5 probe 1 says markdown
  does not repaint on source change; otherwise markdown everywhere.
- `MessageReasoning.props`: `text`, `label?` (`"Reasoning"`), `defaultOpen?`
  (`false`). Composes `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`;
  closed content is **unmounted**, so a closed reasoning section is invisible to
  the a11y tree and to `getAllText`.
- `MessageToolCalls.props`: `calls: ReadonlyArray<MessageToolCall>` where
  `MessageToolCall = { name, status: "pending" | "running" | "done" | "failed", result?: string }`.
  One row per call: name, status word, and result when present. `failed` paints
  `theme.colors.destructive` and keeps the result visible. Empty array renders
  nothing.
- `MessageSources.props`: `sources: ReadonlyArray<{ label, url }>`, `onSelect?`,
  `label?` (`"Sources"`). Each source is a real focusable row (local `Button`
  `variant="ghost"`, `size="sm"`) labelled `Open source <label>`; the URL is
  muted text. **There is no `href` in 0.10.0** — the caller opens the URL.
- `MessageAttachments.props`: `attachments: ReadonlyArray<{ name, meta? }>` —
  muted pills; empty array renders nothing.
- `MessageStreaming.props`: `label?` (`"Streaming"`), renders nothing unless the
  root's `streaming` is true. Renders `role="status"` + the label text (0.10.0
  has no `aria-live`; record it).
- `MessageActions.props`: `children?: ReactNode`; a right-aligned row. No
  default actions — the consumer wires copy/retry/feedback.

`assertParts(messageRoot, children)` with family = all nine exports.

### 3.2 `Chat` — status is data, the app owns the async work

`src/chat/logic.ts`:

```ts
export const ChatStatus = Schema.TaggedUnion({
  idle: {},
  submitting: {},
  streaming: {},
  error: { message: Schema.String },
});
export type ChatStatus = typeof ChatStatus.Type;

export const canSubmit: (status: ChatStatus) => boolean   // idle | error
export const canStop: (status: ChatStatus) => boolean     // submitting | streaming
export const beginSubmit: (status) => ChatStatus          // idle|error → submitting
export const beginStream: (status) => ChatStatus          // submitting → streaming
export const endStream: (status) => ChatStatus            // streaming → idle
export const stopStream: (status) => ChatStatus           // submitting|streaming → idle
export const failStream: (status, message) => ChatStatus  // submitting|streaming → error
```

Every function returns the **same** status when it does not apply (identity), so
a late `endStream` after `stopStream` cannot resurrect a stale state. Unit tests
must assert both the transition and the identity rows.

- `Chat.props`: `label` (required accessible name), `status` (required),
  `onStatusChange?`, `onSubmit(text)`, `onStop?`, `onAttach?`,
  `attachLabel?` (`"Attach files"`), `children?: PartChildren`.
  Renders `role="group"` named by `label`; provides status + intents through one
  context. On submit it calls `onSubmit(trimmed)` and then
  `onStatusChange?.(beginSubmit(status))`; on stop it calls `onStop?.()` and then
  `onStatusChange?.(stopStream(status))`. The parent may ignore or override.
- `ChatMessages.props`: `label?` (`"Conversation"`), `style?`, `children`.
  Composes `MessageScroller` → `MessageScrollerViewport` (default
  `flexGrow: 1`, `minHeight: 200`, column, gap `sm`, padding `md`) →
  `MessageScrollerItem` per child → `MessageScrollerJumpToLatest` beneath.
  Children are wrapped, so consumers do not import the scroller parts.
- `ChatComposer.props`: `label` (required field name), `placeholder?`,
  `submitLabel?` (`"Send"`), `stopLabel?` (`"Stop"`), `value?`, `defaultValue?`,
  `onValueChange?`.
  Renders a `<textarea>` (`minRows: 1`, `maxRows: 6`) + the local `Button`.
  - Enter (no shift) submits a non-empty trimmed draft once and clears it.
  - Shift+Enter never submits; the runtime inserts the newline (§5 probe 2).
  - Escape stops while `canStop(status)`; otherwise it is passed through.
  - While `canSubmit` is false the submit control is not rendered; while
    `canStop` is true the stop control **replaces** submit.
  - `onAttach` renders an Attach button (no `attachments` boolean).
- `ChatEmpty.props`: `title`, `description?` — composes `EmptyState`; a slot the
  consumer renders inside `ChatMessages` when its message list is empty.
  The component cannot know the row count, so it never guesses.
- When `status._tag === "error"`, `Chat` renders the message in a `role="alert"`
  row above the composer. The composer is enabled (retry = submit again).

`assertParts(chatRoot, children)` with family = `Chat`, `ChatMessages`,
`ChatComposer`, `ChatEmpty`; `Chat` accepts all but itself.

### 3.3 Naming and metadata

- Flat exports, matching every other module: `Chat`, `ChatMessages`,
  `ChatComposer`, `ChatEmpty`; `Message`, `MessageAvatar`, `MessageContent`,
  `MessageReasoning`, `MessageToolCalls`, `MessageSources`,
  `MessageAttachments`, `MessageStreaming`, `MessageActions`.
- `chatMeta`: name `"Chat (AI conversation)"`, tier 5, status `"done"`, support
  `"partial"`, docs/example/testFile per the table; limitations (no virtualized
  history, no `aria-live`, no attachments picker, no real link element).
- `messageMeta`: name `"Message (AI message row)"`, tier 5, status `"done"`,
  support `"partial"`, same file checks; limitations (no `aria-labelledby`, no
  real link element, sources are caller-opened).

## 4. Steps and exact commands

Run every command from the repo root unless noted.

1. **Write the three guards first** (they define the contract before the
   components exist): `src/chat/logic.test.ts`, then `src/behaviour/message.test.tsx`
   and `src/behaviour/chat.test.tsx` per §5. They may fail to compile until
   step 2 — that is expected exactly once.
2. Create `src/message.tsx` and `src/chat/logic.ts` + `src/chat.tsx` per §3.
3. `cd packages/components && nub run check-types`
   **Expected:** exit 0, no diagnostics.
4. `nub run --filter @gpuixui/components test`
   **Expected:** unit suite green, including `chat/logic.test.ts`.
5. `nub run --filter @gpuixui/components test:behaviour -- message chat`
   **Expected:** `message.test.tsx` 9 passed, `chat.test.tsx` 9 passed.
   This run needs the built `darwin-x64` binding (present in the store) and
   takes minutes under load; do not interrupt it.
6. Create the examples and docs pages; add both exports to `src/index.ts`, both
   records to `src/inventory.ts`, and update the Tier 5 rows in `COMPONENTS.md`.
7. Extend `inventory.test.ts` so the `COMPONENTS.md` row is looked up in the
   record's own tier (`tierRows(meta.tier)`), then run
   `nub run --filter @gpuixui/components test -- inventory`
   **Expected:** green; `Chat`/`Message` rows agree.
8. Add the two both-theme cases, then
   `nub run --filter @gpuixui/components test:behaviour`
   **Expected:** every file green; the total grows by 20 tests (18 new behaviour
   + the harness file unchanged) — record the real number in the plan result and
   in `TODO.md`; never copy this sentence's estimate.
9. `nub run check`, `nub run lint`, `nub run test`
   **Expected:** all exit 0.
10. Update `TODO.md`, this plan's §8 and the plan index. Commit in two units:
    `feat(components): add message rows and the chat scaffold` and
    `docs(components): message and chat pages, examples and inventory`.

## 5. Probes that decide an implementation choice (run before writing)

Write these as temporary cases in `src/behaviour/zz-probe.test.tsx` (delete it
before committing; it must not remain in the suite):

1. **Markdown repaint.** Render `<markdown source="one">`, flush, change to
   `source="one two"` via a stateful harness, flush; assert
   `getPaintedText()` gained the new token. If it does not, `MessageContent`
   uses `format="text"` while `streaming` and records the limitation.
2. **Shift+Enter.** Focus a `<textarea onSubmit={fn}>`, send
   `simulateKeystrokes("shift-enter")`; assert `fn` was not called. Then send
   `"enter"` and assert it was. If shift still submits, guard on
   `event.modifiers?.shift === true` and re-probe; if the newline is eaten,
   **STOP** — a guessed keymap is worse than a documented gap (STOP 2).
3. **`role="status"`.** Render a text node with `role="status"`; assert the a11y
   dump reports it. If not, use `aria-label` on the row and document the gap.

## 6. Test plan — what each test must catch

`src/chat/logic.test.ts` (no runtime):

| Case | Fails when |
| ---- | ---------- |
| idle/error submit → submitting | `beginSubmit` is missing a branch |
| submitting → streaming, streaming → idle | `beginStream`/`endStream` inverted |
| stop from submitting and streaming → idle | `stopStream` only handles one tag |
| fail keeps the message | error branch drops `message` |
| every inapplicable intent returns the same value | a transition overwrites a terminal state |

`src/behaviour/message.test.tsx` (native):

1. assistant and user rows align on opposite sides (`getElementBounds` of the
   content root; user's x > assistant's x).
2. markdown content paints its text (`getPaintedText`), and a source change
   repaints the new text (the streaming contract).
3. reasoning is closed by default; a real click opens it and the text appears.
4. tool calls show name/status/result; a `failed` call paints
   `theme.colors.destructive`; an empty array renders nothing.
5. sources render label + URL and a real click calls `onSelect` **once**.
6. attachments render their names; empty array renders nothing.
7. `MessageStreaming` is absent until the root is `streaming`.
8. `MessageActions` renders nothing by default and a supplied action clicks once.
9. `Message` rejects a `MessageActions`-inside-`MessageActions`-style misplaced
   family part (`assertParts`) — use `MessageReasoning` inside `MessageContent`,
   which is not a host, and assert the thrown message names both.

`src/behaviour/chat.test.tsx` (native):

1. typing and Enter calls `onSubmit` once with the trimmed draft, then clears it
   (a second Enter with no draft does not resubmit).
2. Shift+Enter does not call `onSubmit` (probe 2).
3. while `streaming`, Stop is shown, Send is absent; activating Stop calls
   `onStop`, never `onSubmit`, and reports `idle` through `onStatusChange`.
4. while `submitting`, Enter does not submit again.
5. `error` renders the message in a `role="alert"` node and submit is enabled
   again (retry path).
6. Escape while streaming stops; Escape while idle does not.
7. `onAttach` renders an Attach action and runs it once; without it no action
   renders.
8. `ChatMessages` wraps rows in the scroller and follows an appended row
   (compare `getScrollOffset` before/after, as `message-scroller.test.tsx`
   does).
9. `ChatEmpty` renders title/description inside the messages area.

Both-direction proof (do all three, record the measured failures in §8):

- Delete the `canStop` guard in `ChatComposer` (submit while streaming) → chat
  test 3 fails.
- Make `MessageReasoning` open by default → message test 3 fails.
- Move the `Chat` row out of `## Tier 5` (or leave it `todo` while the record is
  `done`) → `inventory` test fails.
- Revert each, re-run, green.

## 7. STOP conditions

- Probe 2 shows the runtime cannot distinguish Shift+Enter from Enter, or the
  newline never arrives → stop and report; do not invent a keyboard contract.
- Probe 1 shows `<markdown>` cannot repaint a changed `source` **and**
  `format="text"` cannot be selected per streaming state without breaking the
  public API → record the limitation and keep markdown for final text.
- Any need to edit `LICENSES/`, `apps/docs`, `apps/playground`,
  `packages/testing` or another package → record a TODO interlock, do not edit.
- A second live session holds this worktree (B3) → stop writing, report the
  measured session count (plan 118 §5).
- The behaviour suite needs an edit to an existing test → stop; this plan adds
  tests only.

## 8. Result

Landed 2026-10-18.

- `Message` (9 parts) and `Chat` (4 parts) with the pure status contract in
  `src/chat/logic.ts`; 10 transition cases and a boundary decode.
- Native suites: `message.test.tsx` **10 passed**, `chat.test.tsx` **9 passed**;
  two both-theme rows added to `theme-matrix.test.tsx`.
- Probe answers, measured:
  - `<markdown source>` **does** repaint when the source changes, so the body is
    markdown in every state and `format="text"` stays an explicit caller choice.
  - `Shift+Enter` does not submit and does insert a newline: the suite types
    `one`, presses shift-enter, types `two`, presses enter, and receives
    `one\ntwo`.
  - `role="alert"` reaches the a11y dump; the error row is asserted by role and
    by text. `role="status"` on the streaming line is not asserted by role — the
    suite asserts the line's text and that it is absent when not streaming.
- `inventory.test.ts` now looks up the row in the record's **own tier**; the
  previous Tier-2-only lookup would have reported "no COMPONENTS.md row" for
  every Tier 5 record.
- Counts after the change: behaviour **481** (460 + 19 new + 2 theme-matrix),
  unit **318** (33 files). Update these if a later run differs; the numbers here
  are the measured totals from the commands in §4.

### Both-direction proof, measured

- COMPONENTS.md drift: change the `Chat (AI conversation)` row to `todo` while
  the record is `done` → `inventory` reports
  `Chat (AI conversation): row says todo, record says done`; restored, green.
- Chat's stop guard: swap the composer's `canStop` branch so Send renders during
  a stream → `chat.test.tsx` "stops instead of submitting while streaming" fails
  at the Send assertion; restored, green.
- Reasoning default: `defaultOpen = true` → `message.test.tsx` "keeps reasoning
  closed until the reader opens it" fails on the absent-text assertion;
  restored, green.

## 9. Interlocks recorded, not owned

| Need | Owner |
| ---- | ----- |
| Credit shadcn/ui AI Elements `chat` + `message` in `LICENSES/` (MIT) | licensing |
| Docs-site pages rendering `docs/chat.mdx` and `docs/message.mdx` | docs-site |
| Playground mounting `chat` and `message` examples in its registry | playground |
| `aria-live`, `aria-labelledby`, `href` in GPUix | upstream |
