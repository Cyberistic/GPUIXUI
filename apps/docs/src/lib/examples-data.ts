import { componentIndex } from "./component-index-data";
import { buildExamples, type ExampleEntry } from "./examples";

/**
 * The example registry, read at build time.
 *
 * A package's examples are native GPUix modules, so the site can only read
 * them: `?raw` gives the page the file a reader copies without making the
 * native package a browser dependency. The glob covers every package, so a new
 * `packages/<pkg>/examples/<id>.example.tsx` appears on `/docs/examples` with
 * no docs change.
 */
const files = import.meta.glob(
  "../../../../packages/*/examples/*.example.tsx",
  {
    eager: true,
    query: "?raw",
    import: "default",
  },
);

/** A glob key is relative to this module; the registry names repo files. */
const repoRelative = (key: string): string => key.replace(/^(\.\.\/)+/, "");

export const examples: ReadonlyArray<ExampleEntry> = buildExamples(
  Object.entries(files).map(([file, source]) => ({
    file: repoRelative(file),
    source,
  })),
  componentIndex,
);
