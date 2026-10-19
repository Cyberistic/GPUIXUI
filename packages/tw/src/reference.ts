/**
 * Read-only access to the `references/ui` clone for the provenance tests.
 *
 * The clone is optional: a test guards its own suite with `existsSync` so a
 * checkout without `references/` still runs the unit tests.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The shadcn/ui clone, resolved from this package. */
const ui = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../references/ui",
);

/** Whether the clone contains a path, so a suite can skip cleanly. */
export const present = (...parts: ReadonlyArray<string>): boolean =>
  existsSync(join(ui, ...parts));

/** Reads a file from the clone, relative to its root. */
export const read = (...parts: ReadonlyArray<string>): string =>
  readFileSync(join(ui, ...parts), "utf8");
