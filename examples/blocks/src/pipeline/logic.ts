import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Str from "effect/String";
import { stages, type Project, type Stage, type WorkItem } from "./data.js";

export type Scope = "all" | "mine" | Project;

export type SortKey = "due" | "title";

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

export const stageCounts = (
  work: ReadonlyArray<WorkItem>,
): ReadonlyArray<readonly [Stage, number]> =>
  Arr.map(stages, (stage) => [
    stage,
    Arr.length(Arr.filter(work, (item) => item.stage === stage)),
  ]);
