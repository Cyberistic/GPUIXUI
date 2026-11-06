
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

const DOM_KEY = new Map<string, string>([
  ...Object.entries(GPUIX_NAMED_KEYS),
  ...Object.entries(BINDING_ALIASES),
  ...Object.values(GPUIX_NAMED_KEYS).map((dom): [string, string] => [
    dom.toLowerCase(),
    dom,
  ]),
]);

const FUNCTION_KEY = /^f([1-9]|[1-2]\d|3[0-5])$/i;

export const toDomKey = (name: string): string => {
  const named = DOM_KEY.get(name.toLowerCase());
  if (named !== undefined) return named;
  const fn = FUNCTION_KEY.exec(name);
  return fn === null ? name : `F${fn[1]}`;
};
