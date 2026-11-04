import { useEffect, useRef, useState } from "react";

const GRAPH_DESCRIPTION =
  "GPUixUI components render through the GPUix native renderer — a GPU renderer with no DOM — onto macOS, Windows 11, Linux/Arch and a terminal.";

export function Lineage() {
  const figure = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = figure.current;
    if (node === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="landing-section" id="lineage">
      <p className="landing-kicker">blazingly fast btw 🦀</p>
      <h2 className="landing-h2">Build once, run on the GPU everywhere</h2>

      <figure
        aria-label={GRAPH_DESCRIPTION}
        className="landing-graph"
        data-inview={seen || undefined}
        ref={figure}
      >
        <div aria-hidden="true" className="landing-graph-body">
          <div className="landing-graph-row">
            <GraphNode name="shadcn/ui" role="composition" />
            <GraphNode name="Base UI" role="behaviour" />
            <GraphNode name="Tailwind" role="syntax" />
          </div>

          <Connector kind="converge" />

          <GraphNode
            className="landing-graph-core"
            name="GPUixUI components"
            role="one component set"
          />

          <Connector kind="stem" />

          <GraphNode
            className="landing-graph-renderer"
            name="GPUix native renderer"
            role="GPU, no DOM"
          />

          <Connector kind="fork" />

          <div className="landing-graph-row landing-graph-leaf-row">
            <GraphNode className="landing-graph-leaf" name="macOS" />
            <GraphNode className="landing-graph-leaf" name="Windows 11" />
            <GraphNode className="landing-graph-leaf" name="Linux / Arch" />
            <GraphNode className="landing-graph-leaf" name="Terminal" />
            <GraphNode className="landing-graph-leaf" name="Web (WASM)" />
          </div>
        </div>

        <p className="landing-sr">{GRAPH_DESCRIPTION}</p>
      </figure>
    </section>
  );
}

function GraphNode({
  name,
  role,
  className,
}: {
  name: string;
  role?: string;
  className?: string;
}) {
  return (
    <div className={`landing-graph-node${className ? ` ${className}` : ""}`}>
      <span className="landing-graph-name">{name}</span>
      {role ? <span className="landing-graph-role">{role}</span> : null}
    </div>
  );
}

function Connector({ kind }: { kind: "converge" | "stem" | "fork" }) {
  const d =
    kind === "converge"
      ? "M16.67 0V20 M50 0V20 M83.33 0V20 M16.67 20H83.33 M50 20V40"
      : kind === "fork"
        ? "M50 0V20 M10 20H90 M10 20V40 M30 20V40 M50 20V40 M70 20V40 M90 20V40"
        : "M50 0V40";

  return (
    <svg
      aria-hidden="true"
      className="landing-graph-connector"
      preserveAspectRatio="none"
      viewBox="0 0 100 40"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
