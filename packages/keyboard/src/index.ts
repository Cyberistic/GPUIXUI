/**
 * `@gpuixui/keyboard` — the keyboard/command layer.
 *
 * The accelerator grammar, matching, and display are `@tanstack/hotkeys` (the
 * pure, DOM-free API); this package keeps the thin GPUix adapter (decode from
 * `KeyEvent`, which has no `code`), the scope-stack `Keymap` and the
 * `CommandRegistry` service. `toDomKey` translates GPUix key names to DOM
 * `KeyboardEvent.key` values without any library, for code that matches keys
 * itself. Nothing here renders or depends on the
 * component/token layers.
 */

export { canonicalKey } from "./chord.js";
export { decodeGpuixEvent } from "./decode.js";
export { formatSymbols } from "./display.js";
export { toDomKey } from "./key-names.js";
export {
  resolve,
  type Binding,
  type KeyBinding,
  type Keymap,
  type Scope,
} from "./keymap.js";
export { match } from "./match.js";
export {
  makeSequenceMatcher,
  type SequenceMatcher,
  type SequenceMatcherOptions,
} from "./sequence.js";
export {
  CommandRegistry,
  commandRegistry,
  makeCommandRegistry,
  type Command,
  type CommandRegistryService,
} from "./registry.js";
export { toTanstackPlatform, type Platform } from "./platform.js";
export {
  areHotkeysEqual,
  formatForDisplay,
  hasNonModifierKey,
  normalizeHotkey,
  parseHotkey,
  validateHotkey,
} from "@tanstack/hotkeys";
export type {
  Hotkey,
  HotkeyChord,
  HotkeySequence,
  ParsedHotkeyChord,
} from "@tanstack/hotkeys";
