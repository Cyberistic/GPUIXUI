import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const source = read("packages/components/src/command-menu.tsx");

interface Binding {
  readonly helper: string;
  readonly words: ReadonlyArray<string>;
}

const bindings: ReadonlyArray<Binding> = [
  { helper: "isDown", words: ["↓", "Ctrl+N"] },
  { helper: "isUp", words: ["↑", "Ctrl+P"] },
  { helper: "isFirst", words: ["Home"] },
  { helper: "isLast", words: ["End"] },
  { helper: "isDismiss", words: ["Escape"] },
];

const handler =
  /const handleKeyDown = [\s\S]*?\n {2}\};/.exec(source)?.[0] ?? "";

describe("the Command menu page's keys", () => {
  it("reads the handler it documents", () => {
    expect(handler).toContain('step({ _tag: "Move", delta: 1 })');
    expect(
      bindings.filter(({ helper }) => !handler.includes(`${helper}(event)`)),
    ).toEqual([]);

    expect(source).toContain("onSubmit={runActive}");
  });
});
