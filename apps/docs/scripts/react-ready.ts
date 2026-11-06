export const propsOfScript = `((node) => {
  const read = (value, key) =>
    value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined;
  const own = (value, prefix) =>
    value !== null && typeof value === "object"
      ? Object.getOwnPropertyNames(value)
          .filter((name) => name.startsWith(prefix))
          .map((name) => read(value, name))[0]
      : undefined;
  return own(node, "__reactProps") ?? read(own(node, "__reactFiber"), "memoizedProps");
})`;

const handlerAtScript = `((node, handler) => {
  const read = (value, key) =>
    value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined;
  const own = (value, prefix) =>
    value !== null && typeof value === "object"
      ? Object.getOwnPropertyNames(value)
          .filter((name) => name.startsWith(prefix))
          .map((name) => read(value, name))[0]
      : undefined;
  const runs = (value) => typeof read(value, handler) === "function";

  if (runs(own(node, "__reactProps"))) return true;

  // Six hops is deeper than any wrapper between a control and its handler, and
  // short enough that a shared ancestor cannot answer for a control far below it.
  const walk = (fiber, hops) => {
    if (fiber === undefined || fiber === null || hops === 0) return false;
    return (
      runs(read(fiber, "memoizedProps")) ||
      runs(read(fiber, "pendingProps")) ||
      walk(read(fiber, "return"), hops - 1)
    );
  };

  return walk(own(node, "__reactFiber"), 6);
})`;

export const hasHandler = (
  node: string,
  handler: "onClick" | "onKeyDown" = "onClick",
): string => `${handlerAtScript}(${node}, ${JSON.stringify(handler)})`;

export const firstReady = (
  selector: string,
  handler: "onClick" | "onKeyDown" = "onClick",
  matching?: string,
): string => `(() => {
  const matches = [...document.querySelectorAll(${JSON.stringify(selector)})]${matching === undefined ? "" : `.filter((node) => ${matching})`};
  const painted = matches.filter((node) => node.getBoundingClientRect().width > 0);
  return [...painted, ...matches].filter((node) =>
    ${hasHandler("node", handler)})[0];
})()`;
