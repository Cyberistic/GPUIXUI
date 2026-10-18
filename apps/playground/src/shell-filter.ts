/**
 * The sidebar's filter rule (plan `528`).
 *
 * The registry is the sidebar, so this function is the one place a scenario
 * can be hidden from the UI while the smoke suite still runs it. Keeping it
 * pure means the decision is tested without a renderer, and the shell only
 * lays the result out.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import type { PlaygroundScenario } from "./types.js";

/** The fields a query matches: the id, the title and the capability. */
const fieldsOf = (scenario: PlaygroundScenario): ReadonlyArray<string> => [
  scenario.id,
  scenario.title,
  scenario.capability,
];

const matchesFields = (needle: string, scenario: PlaygroundScenario): boolean =>
  Str.isEmpty(needle) ||
  Arr.some(fieldsOf(scenario), (field) =>
    Str.includes(needle)(Str.toLowerCase(field)),
  );

/**
 * A case-insensitive substring match over a scenario's id, title or
 * capability. An empty or whitespace-only query matches every scenario.
 */
export const scenarioMatches =
  (query: string) =>
  (scenario: PlaygroundScenario): boolean =>
    matchesFields(pipe(query, Str.trim, Str.toLowerCase), scenario);

/** The scenarios `query` matches, in registry order. */
export const filterScenarios = (
  list: ReadonlyArray<PlaygroundScenario>,
  query: string,
): ReadonlyArray<PlaygroundScenario> =>
  Arr.filter(list, scenarioMatches(query));
