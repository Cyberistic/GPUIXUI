import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readRepo } from "./doc-snippets.test-util";
import { repoRoot } from "./public-symbols-source";

/**
 * The commands a documentation page tells a reader to run, read from the
 * manifests that declare them.
 *
 * A page's shell snippet looks correct whether or not the script behind it
 * exists, and this repository renames scripts (a package's `test` gains a
 * `test:runtime` or a `test:behaviour` sibling). `/installation` was the
 * first page held this way; `/contributing` prints the same commands for a
 * contributor, so the reader is shared rather than copied.
 */

export interface Manifest {
  readonly name: string;
  readonly scripts?: Readonly<Record<string, string>>;
  /** The root manifest's pinned toolchain. */
  readonly devEngines?: {
    readonly packageManager?: { readonly name?: string };
  };
  /** The native package's declared prebuild matrix. */
  readonly napi?: { readonly targets?: ReadonlyArray<string> };
}

export const manifest = (path: string): Manifest =>
  JSON.parse(readRepo(path)) as Manifest;

const manifestsIn = (dir: string): ReadonlyArray<Manifest> =>
  readdirSync(join(repoRoot, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? [manifest(`${dir}/${entry.name}/package.json`)] : [],
  );

/** Every workspace package and app, by manifest. */
export const workspaceManifests: ReadonlyArray<Manifest> = [
  ...manifestsIn("packages"),
  ...manifestsIn("apps"),
];

export interface Run {
  /** The `--filter` target, or nothing when the command runs at the root. */
  readonly filter: string | undefined;
  readonly script: string;
}

/** `nub run [--filter <package>] <script>` commands a page prints. */
export const runsIn = (page: string): ReadonlyArray<Run> =>
  [...page.matchAll(/nub run (?:(--filter (\S+) )?([\w:-]+))/g)].map(
    (match) => ({ filter: match[2], script: match[3] ?? "" }),
  );

/**
 * The commands a page prints that no manifest declares, each worded so a
 * failure names the package and the missing script.
 */
export const undeclaredRuns = (page: string): ReadonlyArray<string> => {
  const byPackage = new Map(
    workspaceManifests.map((entry) => [entry.name, entry]),
  );
  const root = manifest("package.json");

  return runsIn(page).flatMap(({ filter, script }) => {
    const owner = filter === undefined ? root : byPackage.get(filter);
    if (owner === undefined) return [`no workspace package named ${filter}`];
    return owner.scripts?.[script] === undefined
      ? [`${owner.name} has no ${script} script`]
      : [];
  });
};
