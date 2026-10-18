import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every named export a package's source declares, across its `.ts(x)` files.
 * Used by the tests that prove a page imports and a compound record names only
 * real exports. `node:fs` is deliberate at this vitest boundary (plan 411 §5).
 *
 * Re-export aliases count (`export { MenuItem as DropdownMenuItem }`): a part
 * such as `DropdownMenuItem` is a real public export even though its `const`
 * lives in `menu/item.tsx` (plan 479).
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
      const declared = [
        ...source.matchAll(
          /export\s+(?:interface|type|const|function|class)\s+([A-Za-z0-9_]+)/g,
        ),
      ].flatMap((match) => match[1] ?? []);
      const aliased = [
        ...source.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g),
      ].flatMap((match) =>
        (match[1] ?? "").split(",").flatMap((spec) => {
          const name = (spec.split(/\s+as\s+/)[1] ?? spec).trim();
          return /^[A-Za-z0-9_]+$/.test(name) ? [name] : [];
        }),
      );
      return [...declared, ...aliased];
    },
  );
