import { componentIndex } from "./component-index-data";
import { buildExamples, type ExampleEntry } from "./examples";

const files = import.meta.glob(
  "../../../../packages/*/examples/*.example.tsx",
  {
    eager: true,
    query: "?raw",
    import: "default",
  },
);

const repoRelative = (key: string): string => key.replace(/^(\.\.\/)+/, "");

export const examples: ReadonlyArray<ExampleEntry> = buildExamples(
  Object.entries(files).map(([file, source]) => ({
    file: repoRelative(file),
    source,
  })),
  componentIndex,
);
