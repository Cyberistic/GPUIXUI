import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  firstReady,
  hasHandler,
  propsOfScript,
} from "../../scripts/react-ready";

/**
 * Reading a node React has committed.
 *
 * Every browser probe waits for a control's own `onClick` before it presses,
 * because a press on markup the route tree has not committed does nothing and
 * reads as a component that ignores its reader. React 19 keeps a host node's
 * committed props on its **fiber**, only some nodes also carry the older
 * `__reactProps$…` store, and both keys are non-enumerable: measured in headless
 * Chrome on `/components/button`, the sidebar's search trigger had no
 * enumerable property at all while a click on it opened the dialog. Every probe
 * read with `Object.entries`, so each one waited out its whole hydration budget
 * against a live page and reported "never hydrated".
 *
 * The guard executes the very expressions a probe evaluates, against nodes built
 * the way React builds them, so the two cannot drift apart again.
 */

const root = new URL("../../../../", import.meta.url);

/** A value with one own property, enumerable only when asked for. */
const withProperty = (
  key: string,
  value: unknown,
  enumerable = false,
): object => {
  const target: Record<string, unknown> = {};
  Object.defineProperty(target, key, { value, enumerable, configurable: true });
  return target;
};

/** A fiber, as React leaves one: committed props and the parent fiber. */
const fiber = (props: unknown, parent?: unknown): object => ({
  memoizedProps: props,
  pendingProps: null,
  return: parent,
});

/** A host node that carries only React's fiber, as React 19 leaves most. */
const fiberNode = (props: unknown, parent?: unknown): object =>
  withProperty("__reactFiber$fixture", fiber(props, parent));

/** Evaluate a probe expression the way the browser does: one free `node`. */
const evaluate = (expression: string, node: unknown): unknown =>
  new Function("node", `return ${expression};`)(node);

const pressable = { onClick: () => undefined };

/** A chrome control: committed props and the box the page paints it in. */
const chromeNode = (props: unknown, width: number): object => {
  const node = withProperty("__reactFiber$fixture", fiber(props));
  Object.defineProperty(node, "getBoundingClientRect", {
    value: () => ({ width }),
  });
  return node;
};

/** The probes that gate a press on a node's React handler. */
const hydrationGated = [
  "data-previews-probe.ts",
  "docs-theme-probe.ts",
  "palette-switch-probe.ts",
  "platform-switch-probe.ts",
  "preview-press-probe.ts",
  "search-probe.ts",
  "theme-editor-probe.ts",
] as const;

describe("a node React has committed", () => {
  it("reads the props from the fiber, not from enumerable keys", () => {
    const node = fiberNode(pressable);

    expect(Object.keys(node)).toEqual([]);
    expect(evaluate(`${propsOfScript}(node)`, node)).toBe(pressable);
    // A node that also keeps the older store still answers its props.
    expect(
      evaluate(
        `${propsOfScript}(node)`,
        withProperty("__reactProps$x", pressable),
      ),
    ).toBe(pressable);
    // Absence is absence, not a throw on a node that has not committed yet.
    expect(evaluate(`${propsOfScript}(node)`, {})).toBeUndefined();
    expect(evaluate(`${propsOfScript}(node)`, null)).toBeUndefined();
  });

  it("says ready only for a node whose press runs the handler", () => {
    const expression = hasHandler("node");

    // React 19's host-node shape, and the older store beside it.
    expect(evaluate(expression, fiberNode(pressable))).toBe(true);
    expect(
      evaluate(expression, withProperty("__reactProps$x", pressable)),
    ).toBe(true);
    // A trigger whose handler sits on a component above it, which is where
    // React's synthetic events are handled for a styled wrapper.
    expect(evaluate(expression, fiberNode({}, fiber(pressable)))).toBe(true);
    // Committed, but nothing listens: cold for the probe's purpose.
    expect(evaluate(expression, fiberNode({}))).toBe(false);
    expect(evaluate(expression, fiberNode("props"))).toBe(false);
    expect(evaluate(expression, {})).toBe(false);
    expect(evaluate(expression, null)).toBe(false);
  });

  it("does not let a distant ancestor answer for a control", () => {
    // A fiber chain of `wrappers` components above the control, ending in one
    // that handles the press. The walk is bounded, so a handler too far above a
    // control cannot make it look ready.
    const ancestors = (wrappers: number): unknown =>
      wrappers === 0 ? fiber(pressable) : fiber({}, ancestors(wrappers - 1));
    const nodeAt = (wrappers: number): object =>
      withProperty("__reactFiber$fixture", ancestors(wrappers));

    expect(evaluate(hasHandler("node"), nodeAt(5))).toBe(true);
    expect(evaluate(hasHandler("node"), nodeAt(6))).toBe(false);
  });

  it("picks the first painted, committed copy of a chrome control", () => {
    const cold = { getBoundingClientRect: () => ({ width: 30 }) };
    const hiddenReady = chromeNode(pressable, 0);
    const paintedReady = chromeNode(pressable, 30);

    const pick = (matches: ReadonlyArray<unknown>): unknown =>
      new Function("document", `return ${firstReady("button")};`)({
        querySelectorAll: () => matches,
      });

    // The page renders more than one copy (a header trigger and the sidebar's)
    // and commits them at different times: the painted committed one wins over
    // a cold sibling and over a committed one the page does not paint.
    expect(pick([cold, hiddenReady, paintedReady])).toBe(paintedReady);
    expect(pick([cold, hiddenReady])).toBe(hiddenReady);
    expect(pick([cold])).toBeUndefined();
  });

  it("keeps the React keys in the one module that reads them", () => {
    const scripts = new URL("apps/docs/scripts/", root);
    const files = readdirSync(scripts)
      .filter((name) => name.endsWith(".ts") && name !== "react-ready.ts")
      .map((name) => ({
        name,
        source: readFileSync(new URL(name, scripts), "utf8"),
      }));

    // A floor: a walk that stopped matching must not pass on an empty set.
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(
      files
        .filter((file) => file.source.includes("__reactProps"))
        .map((file) => file.name),
    ).toEqual([]);
  });

  it("has every hydration-gated probe read through the helper", () => {
    const missing = hydrationGated.flatMap((name) => {
      const source = readFileSync(
        new URL(`apps/docs/scripts/${name}`, root),
        "utf8",
      );
      return [
        /from "\.\/react-ready\.ts"/.test(source)
          ? []
          : [`${name} does not import the shared read`],
        /hasHandler\(|propsOfScript|firstReady\(/.test(source)
          ? []
          : [`${name} holds its own readiness read`],
      ].flat();
    });

    expect(missing).toEqual([]);
  });

  it("states the rule in the preview policy", () => {
    const policy = readFileSync(
      new URL("docs/preview-strategy.md", root),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(policy).toContain("non-enumerably");
    expect(policy).toContain("fiber");
    expect(policy).toContain("apps/docs/scripts/react-ready.ts");
  });
});
