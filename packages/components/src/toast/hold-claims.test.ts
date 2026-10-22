/**
 * The toast hold the runtime delivers.
 *
 * The bug this guards: the page claimed a `Tab` traversal moves focus **without
 * running its focus handler**, so a keyboard reader could watch an Undo vanish,
 * and it advised `duration: 0` for that reason. The playground re-measured the
 * traversal on 0.11.0 (`tabs-lifecycle`, `focuses=1`) and the event does arrive,
 * so the hold works for a keyboard reader too; `duration: 0` stays as the route
 * for a toast that could dismiss before the reader reaches it. This holds the
 * prose to the two source rules it depends on — the card still holds on both
 * hover and a focus event, and the store still treats a non-positive duration as
 * no auto-dismiss at all.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const page = (): string => source("../../docs/toast.mdx");
const viewport = (): string => source("./viewport.tsx");
const store = (): string => source("./store.ts");

describe("the toast hold", () => {
  it("states that a traversal holds the clock, and the escape", () => {
    const text = page();

    expect(text).toContain("A `Tab` traversal delivers that event");
    expect(text).toContain("tabs-lifecycle");
    expect(text).toContain("duration: 0");
    // The retracted claims: the traversal was said not to deliver the event.
    expect(text).not.toContain("delivers no such event");
    expect(text).not.toContain("does not deliver that event");
    expect(text).not.toContain("without running its focus handler");
  });

  it("holds on the pointer and on a focus event", () => {
    const code = viewport();

    expect(code).toContain("setHover(");
    expect(code).toContain("setFocus(");
    expect(code).toContain("onFocus=");
  });

  it("keeps a non-positive duration persistent, as the page advises", () => {
    expect(store()).toContain("Duration.toMillis(duration) > 0");
  });
});
