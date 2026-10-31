/**
 * The pipeline block's browser preview (plan 728).
 *
 * It reads the compiled block's own `data.ts` and `logic.ts`, so the preview
 * and the native window show the same work, filtered by the same rules, and
 * the source the page prints is the module itself (`?raw`). The frame is
 * `WindowFrame`, the drawing of the shell's `Window`.
 */
import { useState } from "react";
import {
  projects,
  viewer,
  work,
  type Stage,
} from "../../../../../examples/blocks/src/pipeline/data";
import {
  inScope,
  itemsIn,
  stageCounts,
  type Scope,
} from "../../../../../examples/blocks/src/pipeline/logic";
import { WindowFrame } from "./window-frame";

export function PipelineRender() {
  const [scope, setScope] = useState<Scope>("all");
  const [stage, setStage] = useState<Stage>("Build");
  const [chosen, setChosen] = useState("w5");
  const view = { scope, stage, query: "", sort: "due" } as const;
  const scoped = inScope(work, view, viewer);
  const item = work.find((entry) => entry.id === chosen);
  const place = (id: Scope, label: string) => (
    <button
      className="gx-window-row"
      data-selected={scope === id ? "" : undefined}
      key={id}
      onClick={() => setScope(id)}
      type="button"
    >
      <span>{label}</span>
      <span className="gx-pipeline-count">
        {inScope(work, { scope: id, query: "" }, viewer).length}
      </span>
    </button>
  );

  return (
    <WindowFrame
      height={520}
      title="Releases"
      sidebar={
        <>
          {place("all", "All work")}
          {place("mine", "Mine")}
          <span className="gx-window-section">Projects</span>
          {projects.map((project) => place(project, project))}
        </>
      }
      toolbar={
        <div className="gx-segmented gx-pipeline-layout" role="radiogroup">
          <button aria-checked="true" role="radio" type="button">
            List
          </button>
          <button aria-checked="false" role="radio" type="button">
            Board
          </button>
        </div>
      }
      inspector={
        item === undefined ? null : (
          <div className="gx-pipeline-inspector">
            <strong>{item.title}</strong>
            <span className="gx-inset-title">▾ Details</span>
            <div className="gx-inset-box">
              <div className="gx-inset-row">
                <span>Owner</span>
                <span>{item.owner}</span>
              </div>
              <div className="gx-inset-row">
                <span>Due</span>
                <span>{item.due}</span>
              </div>
              <div className="gx-inset-row">
                <span>Estimate</span>
                <span>{item.estimate} pt</span>
              </div>
            </div>
          </div>
        )
      }
    >
      <div className="gx-segmented gx-pipeline-stages" role="radiogroup">
        {stageCounts(scoped).map(([name, count]) => (
          <button
            aria-checked={name === stage}
            key={name}
            onClick={() => setStage(name)}
            role="radio"
            type="button"
          >
            {name} {count}
          </button>
        ))}
      </div>
      {itemsIn(work, view, viewer).map((row) => (
        <button
          className="gx-pipeline-row"
          data-selected={row.id === chosen ? "" : undefined}
          key={row.id}
          onClick={() => setChosen(row.id)}
          type="button"
        >
          <span className="gx-pipeline-owner">
            {row.owner
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </span>
          <span className="gx-pipeline-title">{row.title}</span>
          <span className="gx-pipeline-project">{row.project}</span>
          <span className="gx-pipeline-due">{row.due.slice(5)}</span>
        </button>
      ))}
    </WindowFrame>
  );
}
