import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  firstReady,
  hasHandler,
  propsOfScript,
} from "../../scripts/react-ready";

const root = new URL("../../../../", import.meta.url);

const withProperty = (
  key: string,
  value: unknown,
  enumerable = false,
): object => {
  const target: Record<string, unknown> = {};
  Object.defineProperty(target, key, { value, enumerable, configurable: true });
  return target;
};

const fiber = (props: unknown, parent?: unknown): object => ({
  memoizedProps: props,
  pendingProps: null,
  return: parent,
});

const fiberNode = (props: unknown, parent?: unknown): object =>
  withProperty("__reactFiber$fixture", fiber(props, parent));

const evaluate = (expression: string, node: unknown): unknown =>
  new Function("node", `return ${expression};`)(node);

const pressable = { onClick: () => undefined };

const chromeNode = (props: unknown, width: number): object => {
  const node = withProperty("__reactFiber$fixture", fiber(props));
  Object.defineProperty(node, "getBoundingClientRect", {
    value: () => ({ width }),
  });
  return node;
};

const hydrationGated = [
  "data-previews-probe.ts",
  "docs-theme-probe.ts",
  "palette-switch-probe.ts",
  "platform-switch-probe.ts",
  "preview-press-probe.ts",
  "search-probe.ts",
] as const;

describe("a node React has committed", () => {
  it("reads the props from the fiber, not from enumerable keys", () => {
    const node = fiberNode(pressable);

    expect(Object.keys(node)).toEqual([]);
    expect(evaluate(`${propsOfScript}(node)`, node)).toBe(pressable);

    expect(
      evaluate(
        `${propsOfScript}(node)`,
        withProperty("__reactProps$x", pressable),
      ),
    ).toBe(pressable);

    expect(evaluate(`${propsOfScript}(node)`, {})).toBeUndefined();
    expect(evaluate(`${propsOfScript}(node)`, null)).toBeUndefined();
  });

  it("says ready only for a node whose press runs the handler", () => {
    const expression = hasHandler("node");

    expect(evaluate(expression, fiberNode(pressable))).toBe(true);
    expect(
      evaluate(expression, withProperty("__reactProps$x", pressable)),
    ).toBe(true);

    expect(evaluate(expression, fiberNode({}, fiber(pressable)))).toBe(true);

    expect(evaluate(expression, fiberNode({}))).toBe(false);
    expect(evaluate(expression, fiberNode("props"))).toBe(false);
    expect(evaluate(expression, {})).toBe(false);
    expect(evaluate(expression, null)).toBe(false);
  });

  it("does not let a distant ancestor answer for a control", () => {
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
