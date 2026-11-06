import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const adapter = (): string => read("./internal/button.tsx");

const primitive = (): string =>
  read("../../primitives/src/components/Button.tsx");

describe("the action's activation", () => {
  it("hands the caller's press to the primitive's one activation", () => {
    const source = adapter();

    expect(source).toContain("onActivate={onClick}");
    expect(source).not.toContain("onClick={onClick}");
    expect(source).not.toContain("activationHandlers");
    expect(source).not.toContain("decideActivation");
  });

  it("depends on the order the primitive composes", () => {
    const source = primitive();

    expect(source).toContain(
      'onKeyDown={composeEvent<KeyEvent>(onKey("down"), onKeyDown)}',
    );
    expect(source).toContain(
      'onKeyUp={composeEvent<KeyEvent>(onKey("up"), onKeyUp)}',
    );
  });
});
