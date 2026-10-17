import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every named export a package's source declares, across its `.ts(x)` files.
 * Used by the tests that prove a page imports and a compound record names only
 * real exports. `node:fs` is deliberate at this vitest boundary (plan 411 §5).
 */
export const exportedNames = (
  directory: string,
  prefix = "",
): ReadonlyArray<string> =>
  readdirSync(join(directory, prefix), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) return exportedNames(directory, path);
      if (!/\.tsx?$/.test(entry.name)) return [];
      const source = readFileSync(join(directory, path), "utf8");
      return [
        ...source.matchAll(
          /export\s+(?:interface|type|const|function|class)\s+([A-Za-z0-9_]+)/g,
        ),
      ].flatMap((match) => match[1] ?? []);
    },
  );
