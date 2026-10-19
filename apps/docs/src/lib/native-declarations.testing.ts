import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Every declaration file the installed `@gpuix/native` package ships. Test-only:
 * `node:fs` is deliberate here, because the docs bundle must not import the
 * runtime and a content guard has to read the declarations a consumer installs
 * (`accessibility.test.ts`, `host-props.test.ts`).
 */
export const installedNativeDeclarations = (): ReadonlyArray<string> => {
  const root = dirname(createRequire(import.meta.url).resolve("@gpuix/native"));

  const declarations = (directory: string): ReadonlyArray<string> =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === "node_modules") return [];
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return declarations(path);
      return entry.name.endsWith(".d.ts") ? [readFileSync(path, "utf8")] : [];
    });

  return declarations(root);
};
