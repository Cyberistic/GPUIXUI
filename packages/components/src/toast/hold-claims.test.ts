import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const page = (): string => source("../../docs/toast.mdx");
const viewport = (): string => source("./viewport.tsx");
const store = (): string => source("./store.ts");

describe("the toast hold", () => {
  it("keeps the page's persistent-duration advice and retracts the traversal claim", () => {
    const text = page();

    expect(text).toContain("duration: 0");

    expect(text).not.toContain("traversal delivers that event");
    expect(text).not.toContain("holds the clock too");
    expect(text).not.toContain("focuses=1");
  });

  it("holds every clock on the pointer and on a focus event", () => {
    const code = viewport();

    expect(code).toContain("syncHold");
    expect(code).toContain("hold(held)");
    expect(code).toContain("onHover(true)");
    expect(code).toContain("onFocusChange(toast.id, true)");
  });

  it("keeps a non-positive duration persistent, as the page advises", () => {
    expect(store()).toContain("Duration.toMillis(duration) > 0");
  });
});
