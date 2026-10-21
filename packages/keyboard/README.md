# `@gpuixui/keyboard`

The keyboard/command layer: accelerator grammar, keymaps with scopes, exact
event matching, and a command registry. Dependency-light on purpose — `effect`
for typed parsing and the registry service, `@gpuix/react` for the key-event
shape it reads. Nothing here renders or depends on the component/token layers.

Plan `438` §4 specified the architecture; this package implements its library
half (accelerators, scopes, commands). Focus traversal and the Escape layer
stack belong to the runtime (`@gpuix/native@0.11.0` owns Tab/Shift+Tab and the
headless `Dialog`), so they are deliberately **not** here.

## Modules

| Module | What it owns |
| ------ | ------------ |
| `accelerator` | `parse` / `format` / `formatSymbols` / `serialize` / `fromEvent` / `sameAccelerator`, the `Accelerator`/`Modifier`/`Key` schemas, and `AcceleratorParseError` |
| `match` | `match(accelerator, event, platform)` — exact modifier matching |
| `keymap` | `Keymap` + `resolve(keymap, scopes, accelerator, platform)` — scope precedence |
| `registry` | `Command` + the `CommandRegistry` `Context.Service` and its layer |
| `display` | `formatSymbols` (keycap glyphs) and `formatText` (plain text) |
| `react` | `CommandRegistryProvider` + `useCommandRegistry` |

## The accelerator grammar

`+`-separated tokens: zero or more modifiers, then exactly one key.
Case-insensitive, order-insensitive on parse, canonical order on format.

- **Modifiers** — `Mod`, `Cmd`/`Meta`/`Command`/`Super`, `Ctrl`/`Control`,
  `Alt`/`Option`, `Shift`.
- **`Mod`** resolves to the platform's primary modifier (⌘/Cmd on macOS, Ctrl
  elsewhere); `Cmd` and `Ctrl` stay distinct on every platform.
- **Keys** — the named keys (`Enter`, `Space`, `Tab`, `Escape`, `Backspace`,
  `Delete`, arrows, `PageUp`, `PageDown`, `Home`, `End`, `F1`–`F12`) or one
  printable character.

`parse` is strict and returns a `Result`: a malformed chord is a typed
`AcceleratorParseError` that names the offending token and the accepted form.
`Platform` mirrors `@gpuixui/tokens`'s `PlatformName`
(`"darwin" | "linux" | "win32" | "default"`) so the two are interchangeable.

## Scopes and precedence

A `Keymap` maps accelerators to command ids in named scopes. `resolve` takes the
scope **stack as data**, ordered most-specific first (`["dialog", "global"]`),
and returns the first match — so a dialog's binding shadows the global one for
the same chord, and popping the scope restores it.

The `CommandRegistry` service resolves a `KeyEvent` to at most one `Command`;
the matched command's `handler` runs at the caller's boundary, never inside the
registry.
