/**
 * The toast hold the runtime can and cannot deliver.
 *
 * The bug this guards: the page promised that keyboard focus on a toast's
 * controls pauses its auto-dismiss clock. A `Tab` traversal focuses the control
 * **without running its focus handler** — the playground's `tabs-lifecycle`
 * measured that on a trigger of this shape on 0.11.0 — so the clock paused only
 * for a press or a programmatic focus, and a keyboard reader could watch an
 * Undo vanish under them. The page now states the limit and names
 * `duration: 0` as the persistent route for an actionable toast; this holds the
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
  it("states the focus a traversal does not deliver, and the escape", () => {
    const text = page();

    expect(text).toContain("A `Tab` traversal delivers no such event");
    expect(text).toContain("tabs-lifecycle");
    expect(text).toContain("duration: 0");
    // The retracted absolute: the hold was claimed for keyboard focus plainly.
    expect(text).not.toContain("keyboard focus on either of its");
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
