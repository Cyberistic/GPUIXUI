/**
 * The pipeline's rules, pure: which items a view shows, in which order, and
 * how many each stage holds.
 */

import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Str from "effect/String";
import { stages, type Project, type Stage, type WorkItem } from "./data.js";

/** What the sidebar narrows to: everyone's work, the viewer's, or one project. */
export type Scope = "all" | "mine" | Project;

/** How the list is sorted. */
export type SortKey = "due" | "title";

/** The view a reader has chosen. */
export interface PipelineView {
  readonly stage: Stage;
  readonly scope: Scope;
  readonly query: string;
  readonly sort: SortKey;
}

const byKey: Readonly<Record<SortKey, Order.Order<WorkItem>>> = {
  due: Order.mapInput(Order.String, (item: WorkItem) => item.due),
  title: Order.mapInput(Order.String, (item: WorkItem) => item.title),
};

/** The items in a scope, matching a query, before the stage is applied. */
export const inScope = (
  work: ReadonlyArray<WorkItem>,
  view: Omit<PipelineView, "stage" | "sort">,
  viewer: string,
): ReadonlyArray<WorkItem> => {
  const needle = Str.toLowerCase(Str.trim(view.query));
  return Arr.filter(
    work,
    (item) =>
      (view.scope === "all" ||
        (view.scope === "mine"
          ? item.owner === viewer
          : item.project === view.scope)) &&
      (needle === "" || Str.includes(needle)(Str.toLowerCase(item.title))),
  );
};

/** The rows the list shows: one stage of the scope, sorted. */
export const itemsIn = (
  work: ReadonlyArray<WorkItem>,
  view: PipelineView,
  viewer: string,
): ReadonlyArray<WorkItem> =>
  Arr.sort(
    Arr.filter(
      inScope(work, view, viewer),
      (item) => item.stage === view.stage,
    ),
    byKey[view.sort],
  );

/** How many items of the scope each stage holds, in stage order. */
export const stageCounts = (
  work: ReadonlyArray<WorkItem>,
): ReadonlyArray<readonly [Stage, number]> =>
  Arr.map(stages, (stage) => [
    stage,
    Arr.length(Arr.filter(work, (item) => item.stage === stage)),
  ]);
