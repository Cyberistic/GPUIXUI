import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readRepo } from "./doc-snippets.test-util";
import { repoRoot } from "./public-symbols-source";

export interface Manifest {
  readonly name: string;
  readonly scripts?: Readonly<Record<string, string>>;

  readonly devEngines?: {
    readonly packageManager?: { readonly name?: string };
  };

  readonly napi?: { readonly targets?: ReadonlyArray<string> };
}

export const manifest = (path: string): Manifest =>
  JSON.parse(readRepo(path)) as Manifest;

const manifestsIn = (dir: string): ReadonlyArray<Manifest> =>
  readdirSync(join(repoRoot, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? [manifest(`${dir}/${entry.name}/package.json`)] : [],
  );

export const workspaceManifests: ReadonlyArray<Manifest> = [
  ...manifestsIn("packages"),
  ...manifestsIn("apps"),
];

export interface Run {
  readonly filter: string | undefined;
  readonly script: string;
}

export const runsIn = (page: string): ReadonlyArray<Run> =>
  [...page.matchAll(/nub run (?:(--filter (\S+) )?([\w:-]+))/g)].map(
    (match) => ({ filter: match[2], script: match[3] ?? "" }),
  );

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
