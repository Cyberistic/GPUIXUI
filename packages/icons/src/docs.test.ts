import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import { ICON_SIZES } from "./sizes.js";

/**
 * Guards the icon page's two factual tables against the source they describe.
 *
 * `docs/icon.mdx` is the consumer's first view of the package, and it states
 * two things the code also knows: which props `Icon` accepts, and what each
 * size step paints. Both were maintained by hand — the frontmatter even
 * claimed "Forty-seven" while `ICON_NAMES` had 48 — so this suite reads the
 * page and the source and fails when they disagree (plan `357`).
 */

/** The text of one level-two section, without its heading. */
const section = (markdown: string, heading: string): string => {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const body = markdown.slice(start + heading.length + 3);
  const end = body.indexOf("\n## ");
  return end === -1 ? body : body.slice(0, end);
};

/** The props an interface declares, in declaration order. */
const declaredProps = (
  typescript: string,
  name: string,
): ReadonlyArray<string> => {
  const open = typescript.indexOf(`export interface ${name} {`);
  if (open === -1) return [];
  const body = typescript.slice(open).split("\n}")[0] ?? "";
  return Arr.getSomes(
    Arr.map(body.split("\n"), (line) =>
      Option.fromNullishOr(
        /^\s+(?:readonly\s+)?([A-Za-z][\w-]*)\??:/.exec(line)?.[1],
      ),
    ),
  );
};

/** The first cell of every row in a Markdown table. */
const tableKeys = (markdown: string): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(markdown.split("\n"), (line) =>
      Option.fromNullishOr(/^\| `([^`]+)` \|/.exec(line)?.[1]),
    ),
  );

/** The step → pixels rows of the size table. */
const sizeRows = (markdown: string): Readonly<Record<string, number>> =>
  R.fromEntries(
    Arr.getSomes(
      Arr.map(markdown.split("\n"), (line) => {
        const match = /^\| `([^`]+)`(?:\s*\([^)]*\))? \| (\d+) \|$/.exec(line);
        return Option.flatMap(Option.fromNullishOr(match?.[1]), (step) =>
          Option.map(
            Option.fromNullishOr(match?.[2]),
            (pixels) => [step, Number(pixels)] as const,
          ),
        );
      }),
    ),
  );

const sorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.sort(values, Order.String);

/** Both files this guard compares, read through the platform service. */
const read = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const here = import.meta.dirname;
  return {
    page: yield* fs.readFileString(path.join(here, "..", "docs", "icon.mdx")),
    source: yield* fs.readFileString(path.join(here, "Icon.tsx")),
  };
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("the icon page", () => {
  it("documents every prop Icon accepts, and no prop it does not", async () => {
    const { page, source } = await Effect.runPromise(read);
    expect(sorted(tableKeys(section(page, "API")))).toEqual(
      sorted(declaredProps(source, "IconProps")),
    );
  });

  it("states the size scale the component resolves", async () => {
    const { page } = await Effect.runPromise(read);
    expect(sizeRows(section(page, "Sizes"))).toEqual(ICON_SIZES);
  });
});
