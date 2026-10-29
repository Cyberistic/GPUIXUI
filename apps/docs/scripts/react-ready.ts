/**
 * Reading a node React has committed, the one way that works in React 19.
 *
 * A browser probe has to know a page is hydrated before it presses anything: a
 * press on server-rendered markup is a no-op and reads exactly like a component
 * that ignores its reader. The probes wait for the control's own `onClick`
 * rather than for a fiber alone, because the route tree commits node by node.
 *
 * React 19 keeps a host node's committed props on its **fiber** and only some
 * nodes also carry the older `__reactProps$…` store; both keys are defined
 * non-enumerably, so a read through `Object.keys` or `Object.entries` finds
 * nothing on a fully interactive page. Measured in headless Chrome on
 * `/components/button`: the sidebar's search trigger carried no enumerable
 * property at all, its visible sibling opened the dialog on a click, and
 * `getOwnPropertyNames` carried `__reactFiber$…` whose `memoizedProps.onClick`
 * ran. Every probe read with `Object.entries`, so each waited out its whole
 * hydration budget against a live page and reported "never hydrated".
 *
 * The snippets are plain source strings rather than `Function#toString` output
 * so they read the way they run; `react-ready.test.ts` executes them against
 * nodes built the way React builds one.
 */

/** A host node's committed props, from either store React keeps them in. */
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

/**
 * Whether a press on `node` runs `handler` — on the node itself or on a
 * component above it, which is where React's synthetic events are handled when
 * a trigger renders as a styled wrapper.
 */
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

/** A browser expression: whether `node` (an expression) answers `handler`. */
export const hasHandler = (
  node: string,
  handler: "onClick" | "onKeyDown" = "onClick",
): string => `${handlerAtScript}(${node}, ${JSON.stringify(handler)})`;

/**
 * A browser expression: the first node matching `selector` whose press answers
 * `handler`, preferring one the page paints.
 *
 * A docs page renders more than one copy of a chrome control (a header trigger
 * and the sidebar's, a desktop and a mobile drawer), and the streamed page
 * commits them at different times — so a probe that read
 * `document.querySelector` could wait on a copy that never commits while a
 * painted sibling was interactive. `matching` narrows the copies, as the source
 * of a predicate over `node`.
 */
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
