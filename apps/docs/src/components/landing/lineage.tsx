const GRAPH_DESCRIPTION =
  "shadcn/ui (component composition), Base UI (component behaviour) and Tailwind (utility syntax) feed GPUixUI components, which render through the GPUix native renderer — a GPU renderer with no DOM — onto macOS, Windows 11 and Linux/Arch.";

export function Lineage() {
  return (
    <section className="landing-section" id="lineage">
      <p className="landing-kicker">The lineage</p>
      <h2 className="landing-h2">Composition, behaviour, syntax.</h2>

      <figure className="landing-graph" aria-label={GRAPH_DESCRIPTION}>
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

          <div className="landing-graph-row">
            <GraphNode className="landing-graph-leaf" name="macOS" />
            <GraphNode className="landing-graph-leaf" name="Windows 11" />
            <GraphNode className="landing-graph-leaf" name="Linux / Arch" />
          </div>
        </div>

        <figcaption className="landing-graph-caption">
          shadcn/ui composition, Base UI behaviour and Tailwind syntax — on
          native platforms, through GPUix.
          <span className="landing-graph-foot">
            Tailwind&apos;s utility syntax is mapped to native styles, not the
            CSS engine.
          </span>
        </figcaption>

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
        ? "M50 0V20 M16.67 20H83.33 M16.67 20V40 M50 20V40 M83.33 20V40"
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
