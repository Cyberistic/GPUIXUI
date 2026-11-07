/** @jsxImportSource @gpuix/react */
import { Diagram } from "../src/diagram.js";

const FLOW = `flowchart LR
  subgraph author[Author]
    component[Component] --> recipe[Recipe]
  end
  subgraph render[Render]
    recipe --> themed[Themed surface]
    themed --> frame[Frame]
  end
  author --> render
  render --> reader([Reader])`;

const SEQUENCE = `sequenceDiagram
  Author->>Component: compose
  Component->>Theme: read the roles
  Theme-->>Component: the palette
  Component-->>Author: the surface`;

const BROKEN = "this is not a diagram";

export const DiagramExample = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <Diagram
      aria-label="The render path"
      source={FLOW}
      caption="How a component becomes a picture"
    />
    <Diagram
      aria-label="A composition"
      source={SEQUENCE}
      caption="What the reader composes"
    />
    <Diagram
      aria-label="A source that does not parse"
      source={BROKEN}
      caption="The failure state"
    />
  </div>
);
