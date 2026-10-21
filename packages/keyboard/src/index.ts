/**
 * `@gpuixui/keyboard` — the keyboard/command layer.
 *
 * Dependency-light on purpose: `effect` for typed parsing and the registry
 * service, `@gpuix/react` for the key-event shape it reads. Nothing here renders
 * or depends on the component/token layers.
 */

export {
  Accelerator,
  AcceleratorParseError,
  Key,
  Modifier,
  format,
  formatSymbols,
  fromEvent,
  parse,
  resolveConcrete,
  sameAccelerator,
  serialize,
} from "./accelerator.js";
export type {
  AcceleratorParseErrorReason,
  ConcreteModifier,
  Platform,
} from "./accelerator.js";
export { formatText } from "./display.js";
export { resolve, type KeyBinding, type Keymap, type Scope } from "./keymap.js";
export { match } from "./match.js";
export {
  CommandRegistry,
  commandRegistry,
  makeCommandRegistry,
  type Command,
  type CommandRegistryService,
} from "./registry.js";
