/**
 * The filter behind the project-browser pattern (plan 575).
 *
 * Kept pure so the composition's rule can be proved without a GPUix window.
 * The search is case-insensitive and covers the name **and** the description:
 * the live gesture types lower-case `atlas`, so a case-sensitive match would
 * make the scene's filter do nothing, and a name-only haystack would miss a
 * project a reader searches for by what it does.
 */
import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** The two fields a project search reads. */
export interface SearchableProject {
  readonly name: string;
  readonly description: string;
}

/** Whether one project matches a query; a blank query matches every project. */
export const matchesProject = (
  project: SearchableProject,
  query: string,
): boolean => {
  const needle = Str.toLowerCase(Str.trim(query));
  return (
    needle === "" ||
    Str.includes(needle)(
      Str.toLowerCase(`${project.name} ${project.description}`),
    )
  );
};

/** The projects a query keeps, in their original order. */
export const filterProjects = <A extends SearchableProject>(
  projects: ReadonlyArray<A>,
  query: string,
): ReadonlyArray<A> =>
  Arr.filter(projects, (project) => matchesProject(project, query));
