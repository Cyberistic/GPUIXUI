/**
 * The toast hold the runtime does not deliver on a traversal.
 *
 * The bug this guards: the page claimed a `Tab` traversal pauses a card's
 * auto-dismiss clock, and this suite asserted the probe's `focuses=1`. On a
 * clean build at HEAD both live probes read the opposite — `tabs-lifecycle`
 * reports `focuses=0` while the trigger holds the focus, and
 * `tooltip-lifecycle`'s tip does not open — so a keyboard reader's arrival does
 * **not** run the card's `onFocus`. The hold works on the pointer and on a press
 * that focuses a control, and `duration: 0` stays the route for an actionable
 * toast that must outlive the reader's journey to it. This holds the prose to
 * the two source rules it depends on — the card still holds on hover and on a
 * focus event, and the store still treats a non-positive duration as no
 * auto-dismiss at all.
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
  it("keeps the traversal off the clock, and names the escape", () => {
    const text = page();

    expect(text).toContain("A traversal does not hold the clock");
    expect(text).toContain("focuses=0");
    expect(text).toContain("duration: 0");
    // The retracted claims: a traversal was said to deliver the focus event.
    expect(text).not.toContain("traversal delivers that event");
    expect(text).not.toContain("holds the clock too");
    expect(text).not.toContain("focuses=1");
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
