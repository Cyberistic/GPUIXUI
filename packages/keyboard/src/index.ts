/**
 * `@gpuixui/keyboard` — the keyboard/command layer.
 *
 * The accelerator grammar, matching, and display are `@tanstack/hotkeys` (the
 * pure, DOM-free API); this package keeps the thin GPUix adapter (decode from
 * `KeyEvent`, which has no `code`), the scope-stack `Keymap` and the
 * `CommandRegistry` service. Nothing here renders or depends on the
 * component/token layers.
 */

export { decodeGpuixEvent } from "./decode.js";
export { formatSymbols } from "./display.js";
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
