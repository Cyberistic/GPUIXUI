/**
 * The motion port owes a NOTICE, not only a licence record.
 *
 * `LICENSES/open-gpui.md` records that a TypeScript port of `crates/motion`
 * "must carry both NOTICE copyright lines" (Apache-2.0, section 4(d)), and
 * `LICENSES/gpui-motion.md` records the MIT attribution the borrowed API
 * surface sits under. For a release the repository shipped neither: the
 * records stated the obligation and `packages/motion/NOTICE` did not exist, so
 * a redistribution of the package would have travelled without the notice it
 * owes.
 *
 * The guard derives the required lines from the records instead of repeating
 * them here, so it fails in both directions: dropping a line from the NOTICE
 * loses the attribution, and dropping it from the record means the port is no
 * longer held to it (the count/pattern cases below fail). `node:fs` is
 * deliberate: this is a check over the repository's own notices, and the
 * package keeps zero runtime dependencies.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const notice = read("../NOTICE");
const readme = read("../README.md");
const licenceRecords = read("../../../LICENSES/README.md");
const openGpui = read("../../../LICENSES/open-gpui.md");
const gpuiMotion = read("../../../LICENSES/gpui-motion.md");

/** The quoted copyright lines an Apollo-style NOTICE list requires. */
const quotedNoticeLines = (record: string): ReadonlyArray<string> =>
  [...record.matchAll(/^- "(.+)"$/gm)].map(([, line]) => line ?? "");

/** The attribution line a MIT record carries, wherever it sits in the prose. */
const mitCopyright = (record: string): string =>
  record.match(/Copyright \(c\) \d{4} [^"`\n]+/)?.[0] ?? "";

describe("the motion port's NOTICE", () => {
  it("carries both open-gpui copyright lines its record quotes", () => {
    const required = quotedNoticeLines(openGpui);
    expect(required).toHaveLength(2);
    expect(required).toContain("Copyright 2022 - 2025 Zed Industries, Inc.");
    expect(required.filter((line) => !notice.includes(line))).toEqual([]);
    expect(notice).toMatch(/Apache License, Version 2\.0/);
  });

  it("carries the gpui-motion copyright and the MIT text it relies on", () => {
    const copyright = mitCopyright(gpuiMotion);
    expect(copyright).toBe("Copyright (c) 2026 1keep contributors");
    expect(notice).toContain(copyright);
    expect(notice).toMatch(/MIT OR Apache-2\.0/);
    expect(notice).toContain("Permission is hereby granted");
    expect(notice).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  it("is named in the licence file table and beside the port", () => {
    // Both entry points a reader or a release checklist follows.
    expect(licenceRecords).toContain("`packages/motion/NOTICE`");
    const licences = readme.slice(readme.indexOf("## Licences"));
    expect(licences).toContain("NOTICE");
  });
});
