import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  componentIdFromPath,
  nativeCaptureIds,
  nativeCaptureOf,
  nativeExampleHref,
} from "./native-captures";

/**
 * The build-time native frames, held to the example registry they came from.
 *
 * A checked-in capture is only honest while its example still exists. The
 * registry is read from the example directories rather than imported: importing
 * every example into a Node test would pull the whole component surface (and
 * the native binding) in just to list names the file names already carry.
 */
const repoRoot = new URL("../../../../", import.meta.url);
const exampleDirs = ["packages/components/examples", "packages/data/examples"];

const idsOnDisk = new Set(
  exampleDirs.flatMap((directory) =>
    readdirSync(fileURLToPath(new URL(directory, repoRoot)))
      .filter((file) => file.endsWith(".example.tsx"))
      .map((file) => file.replace(/\.example\.tsx$/, "")),
  ),
);

describe("the native captures", () => {
  it("has a frame for a known component", () => {
    expect(nativeCaptureOf("accordion")).toMatch(/accordion\.webp$/);
  });

  it("names only examples that still exist", () => {
    const stale = nativeCaptureIds.filter((id) => !idsOnDisk.has(id));
    expect(stale).toEqual([]);
  });

  it("does not invent a frame for an uncaptured id", () => {
    expect(nativeCaptureOf("no-such-example")).toBeUndefined();
  });

  it("reads the component from the page path", () => {
    expect(componentIdFromPath("/components/accordion")).toBe("accordion");
    expect(componentIdFromPath("/graphics/charts/area/")).toBe("area");
    expect(componentIdFromPath("/")).toBeUndefined();
  });

  it("opens the live scene on the reader's platform and mode", () => {
    expect(nativeExampleHref("accordion", "win32", "light")).toBe(
      "/live?scene=example&id=accordion&platform=win32&mode=light",
    );
  });
});
