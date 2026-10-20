import { existsSync, readFileSync, readdirSync } from "node:fs";
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

/**
 * The installed `@gpuix/react` JSX runtime declarations (plan 626). This is the
 * file that says which tags TSX accepts, as opposed to which ones
 * `@gpuix/native` declares.
 */
export const installedJsxRuntimeDeclarations = (): string => {
  const resolved = createRequire(import.meta.url).resolve(
    "@gpuix/react/jsx-runtime",
  );
  return readFileSync(resolved.replace(/\.js$/u, ".d.ts"), "utf8");
};

/** Every `.tsx` file in a package's `src` tree, excluding tests. */
export const packageElementSources = (): ReadonlyArray<string> => {
  const root = new URL("../../../../packages/", import.meta.url);
  const read = (directory: URL): ReadonlyArray<string> =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === "node_modules" || entry.name === "dist") return [];
      const path = new URL(
        `${entry.name}${entry.isDirectory() ? "/" : ""}`,
        directory,
      );
      if (entry.isDirectory()) return read(path);
      return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")
        ? [readFileSync(path, "utf8")]
        : [];
    });

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const source = new URL(`${entry.name}/src/`, root);
      return existsSync(source) ? read(source) : [];
    });
};
