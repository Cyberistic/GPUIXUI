# 708 — Clipboard read/write

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | binding (`remorses/gpuix`) |
| Owner | runtime owner |
| Depends on | none |
| Source | `references/fc-gpui` (Apache-2.0) `crates/gpui/src/app.rs:1625`, `platform.rs:2575-2990`; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | the `Clipboard API` gap; copy buttons; paste in fields |

---
## Goal

Let an app write text (and read it) through the OS clipboard.

## Why

`COMPONENTS.md` records the clipboard gap as unfiled; fc-gpui ships Zed's
`ClipboardItem` API, and our bridge has none.

## Work

- Expose `writeToClipboard(items)` / `readFromClipboard()` on the renderer,
  restricted to text (`ClipboardItem::new_string`) — skip the multi-entry metadata
  format until a consumer needs it.
- Read is asynchronous on macOS (`NSPasteboard` promise), so both return
  `Promise`.
- React: a typed helper `copyText(text)` and a `useClipboard`-free API (plain
  function; no hook unless a component must re-render).
- Wire the existing `CopyButton`/`CodeBlock` to it where the caller asks.

## Tests

- Rust: write a string, read it back; empty string writes an empty entry.
- Runtime macOS: copy in the example, read it in another app (manual, documented)
  or read via `pbpaste` in the test harness.

## Acceptance

`renderer.writeToClipboard("x")` is readable by `pbpaste`, and the read returns
what was written.

## STOP

None expected; this is a translation with a tested primitive.
