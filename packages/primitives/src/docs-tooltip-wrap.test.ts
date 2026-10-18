/**
 * Guards the tooltip pages against denying the wrap the resolver performs.
 *
 * The bug guarded (plan `395`): plan `391` replaced the tooltip's
 * unconditional `whiteSpace: "nowrap"` with a measured `maxWidth` cap
 * (`whiteSpace: "normal"`) and updated `docs/tooltip.mdx`, but
 * `docs/info-tip.mdx` still said "The tip does not wrap (`whiteSpace:
 * "nowrap"`), so keep `content` short". Measured on this host: a mounted
 * `InfoTip` with a 230-character tip paints 1251 × 40 px — two caption lines —
 * in a 1280 × 800 window. Nothing compared the prose to the resolver, so the
 * page promised a limitation the component does not have.
 *
 * The rule is not "never say nowrap": the **uncapped** element-tree form is
 * still `nowrap` and `tooltip.mdx` says so accurately. The rule is that no page
 * may claim a mounted tip cannot wrap, because the wrapper always passes the
 * measured cap.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { tooltipStyle } from "./components/Tooltip.js";
import { testTheme } from "./core/testing/theme.fixture.js";

/** A claim that a mounted tip cannot wrap. */
const DENIES_WRAP = /does not wrap|whiteSpace:\s*"nowrap"/i;

/** The documented page for the bug guarded: it must not make the claim again. */
const INFO_TIP = "info-tip.mdx";

const readDocs = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const directory = path.join(import.meta.dirname, "..", "docs");
  const files = yield* fs.readDirectory(directory);
  return yield* Effect.forEach(
    Arr.filter(files, Str.endsWith(".mdx")),
    (file) =>
      Effect.map(fs.readFileString(path.join(directory, file)), (body) => ({
        file,
        body,
      })),
    { concurrency: 8 },
  );
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** Every line that denies the wrap, with its page and 1-based line number. */
const denials = (
  pages: ReadonlyArray<{ readonly file: string; readonly body: string }>,
): ReadonlyArray<string> =>
  Arr.flatMap(pages, ({ file, body }) =>
    Arr.flatMap(Str.split(body, "\n"), (line, index) =>
      DENIES_WRAP.test(line) ? [`${file}:${index + 1} ${line.trim()}`] : [],
    ),
  );

describe("the tooltip wrap contract", () => {
  it("wraps a capped tip and keeps the uncapped form on one line", () => {
    const capped = tooltipStyle(testTheme, 320);
    expect(capped.whiteSpace).toBe("normal");
    expect(capped.maxWidth).toBe(320);

    // The element-tree renderer has no viewport to cap against; that form is
    // still one line, which is what `tooltip.mdx` describes.
    const uncapped = tooltipStyle(testTheme);
    expect(uncapped.whiteSpace).toBe("nowrap");
    expect(uncapped.maxWidth).toBeUndefined();
  });

  it("is not denied by any primitives page, InfoTip included", async () => {
    const pages = await Effect.runPromise(readDocs);
    // The page that shipped the false claim must still be present, so a rename
    // cannot make this guard vacuously green.
    expect(Arr.some(pages, (page) => page.file === INFO_TIP)).toBe(true);
    expect(denials(pages)).toStrictEqual([]);
  });
});
