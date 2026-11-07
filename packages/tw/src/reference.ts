import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ui = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../references/ui",
);

export const present = (...parts: ReadonlyArray<string>): boolean =>
  existsSync(join(ui, ...parts));

export const read = (...parts: ReadonlyArray<string>): string =>
  readFileSync(join(ui, ...parts), "utf8");
