# `@gpuixui/keyboard`

The keyboard/command layer: chord grammar, matching, keymaps with scope-stack
precedence, multi-step sequences and a command registry. The grammar, parsing,
matching and display are **`@tanstack/hotkeys`** (the pure, DOM-free API); this
package keeps the thin GPUix adapter, the scope stack and the registry.

## Modules

| Module | What it owns |
| ------ | ------------ |
| `decode` | `decodeGpuixEvent(event, platform)` — the GPUix `KeyEvent` → parsed-chord adapter |
| `match` | `match(binding, event, platform)` — exact modifier matching via `areHotkeysEqual` |
| `keymap` | `Keymap` + `resolve(keymap, scopes, chord, platform)` — scope precedence, first match wins |
| `sequence` | `makeSequenceMatcher(sequence, options)` — multi-step sequences with a timeout |
| `registry` | `Command` + the `CommandRegistry` `Context.Service` and its layer |
| `display` | `formatSymbols` (keycap glyphs), an alias over `formatForDisplay(..., parts)` |
| `platform` | `Platform` + `toTanstackPlatform` |
| `react` | `CommandRegistryProvider` + `useCommandRegistry` |

## Why `@tanstack/hotkeys` (0.17.0)

The hand-rolled accelerator grammar (~459 LOC across `accelerator.ts` and
`display.ts`) is deleted. `@tanstack/hotkeys@0.17.0` already provides, better
than we did, `parseHotkey` / `normalizeHotkey` / `formatForDisplay`,
`areHotkeysEqual`, `hasNonModifierKey`, `validateHotkey`, `normalizeKeyName`,
`PUNCTUATION_CODE_MAP`, physical bindings (`Mod+[KeyS]`), dead-key handling, and
sequence types. It is TanStack-maintained, `sideEffects: false`, and has **zero
peer dependencies** — only `@tanstack/store`, which the repo already has.

- **Gained**: the full chord/sequence algebra, physical bindings, dead-key and
  Option+letter correctness, `Mod` resolution, and canonical display — for a net
  **~280 fewer LOC** (non-test source shrank 643 → 363; the 459-LOC grammar is
  now a 68-LOC adapter).
- **Deleted**: `accelerator.ts` (parse/format/serialize/alias tables),
  `display.ts`, and the `Accelerator`/`AcceleratorParseError`/`Modifier`/`Key`
  schemas TanStack now owns.

### Pure API + adapter, not `@tanstack/react-hotkeys`

`@tanstack/react-hotkeys` peers on `react-dom`, which this repo does not have
(GPUix renders through React, not the DOM). `@tanstack/hotkeys`' event-facing
API (`matchesKeyboardEvent`, `parseKeyboardEvent`, `createSequenceMatcher`) is
typed against the DOM `KeyboardEvent`, which a GPUix `KeyEvent` is not. So this
package installs **only** `@tanstack/hotkeys`, uses its pure functions, and
writes the GPUix decode itself rather than casting a plain object to
`KeyboardEvent`.

### The 0.x churn risk

`@tanstack/hotkeys` is 0.x, so its surface may change in a minor release. The
adapter isolates that risk: only `decode.ts`, `display.ts` and `platform.ts`
touch the dependency's types; consumers import `@gpuixui/keyboard` and see a
stable `Platform`/`Binding` shape. A breaking bump means updating three small
files, not the components.

## The decode adapter

GPUix has no DOM, so its `KeyEvent` carries `key` (the logical key name —
`"s"`, `"enter"`, `"f1"`), `keyChar` (the produced character — `"ß"` for
Option+S), and `modifiers` `{shift, ctrl, alt, cmd}` — **no `code`**.

`decodeGpuixEvent` reads `key` and the modifier flags, normalises with
`normalizeKeyName`, and produces `parseHotkey({ key, ctrl, shift, alt, meta })`
where `meta` is `modifiers.cmd`. It never touches `keyChar`: binding identity is
the physical key, so an Option+letter or dead-key press decodes to its base key
(Option+S → `Alt+S`, not `Alt+ß`). This is the `code` fallback TanStack's DOM
matcher performs, already supplied here by `key` itself.

A consequence: **physical bindings (`Mod+[KeyS]`) parse but cannot match a GPUix
event** — there is no `code` to compare. They stay distinct from logical
bindings (`Mod+S`), and are supported for forward compatibility, not for the
current runtime.

## Scopes, sequences and the registry

A `Keymap` maps bindings (a chord or a `["g", "g"]` sequence) to command ids in
named scopes. `resolve` takes the scope **stack as data**, most-specific first
(`["dialog", "global"]`), first match wins. Multi-step sequences resolve through
`makeSequenceMatcher`, a small step machine driven by decoded chords and an
injected clock (mirroring `createSequenceMatcher`, which is DOM-typed and so
unusable here without a cast). The `CommandRegistry` service resolves one
`KeyEvent` to at most one `Command`; its `handler` runs at the caller's
boundary, never inside the registry.
