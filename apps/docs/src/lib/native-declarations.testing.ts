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

/** The installed `@gpuix/react` root declarations (plan 633). */
export const installedReactDeclarations = (): string => {
  const resolved = createRequire(import.meta.url).resolve("@gpuix/react");
  return readFileSync(resolved.replace(/\.js$/u, ".d.ts"), "utf8");
};

/** The installed `@gpuix/native` package directory (plan 633). */
export const installedNativeRoot = (): string =>
  dirname(createRequire(import.meta.url).resolve("@gpuix/native"));

/** Every `.tsx` file in a package's `src` tree, excluding tests. */
export const packageElementSources = (): ReadonlyArray<string> =>
  packageSourceFiles([".tsx"]);

/**
 * Every `.ts`/`.tsx` file in the workspace packages' `src` trees, excluding
 * tests and build output. The absence guards read it: a package that calls a
 * runtime API falsifies a page that says no component ships it (plan 633).
 */
export const packageSources = (): ReadonlyArray<string> =>
  packageSourceFiles([".ts", ".tsx"]);

const packageSourceFiles = (
  extensions: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const root = new URL("../../../../packages/", import.meta.url);
  const read = (directory: URL): ReadonlyArray<string> =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === "node_modules" || entry.name === "dist") return [];
      const path = new URL(
        `${entry.name}${entry.isDirectory() ? "/" : ""}`,
        directory,
      );
      if (entry.isDirectory()) return read(path);
      return extensions.some((extension) => entry.name.endsWith(extension)) &&
        !/\.test\.tsx?$/u.test(entry.name)
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
