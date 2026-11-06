/**
 * GPUix key names → DOM `KeyboardEvent.key` values.
 *
 * GPUix reports GPUI's key names: lowercase, and short for the arrows
 * (`"enter"`, `"down"`, `"pageup"`, `"f1"`). Hotkey libraries, and any code
 * written against the DOM, expect `KeyboardEvent.key` values (`"Enter"`,
 * `"ArrowDown"`, `"PageUp"`, `"F1"`). This module is the one place that
 * translates between them, and it imports no hotkey library, so a keymap
 * keeps working when the library changes, or with no library at all:
 *
 *   toDomKey(event.key) === "Enter"
 *
 * Bindings use the same table, so `Mod+Enter`, `mod+enter` and `mod+return`
 * all name one key.
 */

/** GPUI's named keys, as GPUix reports them, by the DOM value each one is. */
const GPUIX_NAMED_KEYS: Readonly<Record<string, string>> = {
  backspace: "Backspace",
  delete: "Delete",
  down: "ArrowDown",
  end: "End",
  enter: "Enter",
  escape: "Escape",
  home: "Home",
  insert: "Insert",
  left: "ArrowLeft",
  pagedown: "PageDown",
  pageup: "PageUp",
  right: "ArrowRight",
  space: " ",
  tab: "Tab",
  up: "ArrowUp",
};

/** Other spellings people write in a binding. */
const BINDING_ALIASES: Readonly<Record<string, string>> = {
  del: "Delete",
  esc: "Escape",
  pgdn: "PageDown",
  pgup: "PageUp",
  return: "Enter",
  spacebar: " ",
};

/**
 * Every spelling, lowercased: GPUI's names, the aliases, and each DOM value
 * itself, so `"ArrowDown"` and `"arrowdown"` resolve as well as `"down"`.
 */
const DOM_KEY = new Map<string, string>([
  ...Object.entries(GPUIX_NAMED_KEYS),
  ...Object.entries(BINDING_ALIASES),
  ...Object.values(GPUIX_NAMED_KEYS).map((dom): [string, string] => [
    dom.toLowerCase(),
    dom,
  ]),
]);

const FUNCTION_KEY = /^f([1-9]|[1-2]\d|3[0-5])$/i;

/**
 * The DOM `KeyboardEvent.key` value for a GPUix key name or a binding's key
 * token, in any case. A printable character (`"a"`, `"/"`, `"ß"`) is already
 * its own DOM value and passes through unchanged.
 */
export const toDomKey = (name: string): string => {
  const named = DOM_KEY.get(name.toLowerCase());
  if (named !== undefined) return named;
  const fn = FUNCTION_KEY.exec(name);
  return fn === null ? name : `F${fn[1]}`;
};
