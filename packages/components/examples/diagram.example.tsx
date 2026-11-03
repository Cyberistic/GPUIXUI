/** @jsxImportSource @gpuix/react */
/**
 * Diagram example: a flow, a sequence and a source the parser refuses.
 *
 * The first drawing is the shape a documentation page uses most: a left-to-
 * right flow with a nested subgraph. The second is a sequence, so the two
 * kinds a reader meets in a spec are both here. The third is the **error
 * state** — a source that does not parse, which the component paints with
 * the parser's own sentence rather than an empty frame.
 */

import { Diagram } from "../src/diagram.js";

/** The render path, as a flow. */
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

/** A conversation, as a sequence. */
const SEQUENCE = `sequenceDiagram
  Author->>Component: compose
  Component->>Theme: read the roles
  Theme-->>Component: the palette
  Component-->>Author: the surface`;

/** A source no parser reads. */
const BROKEN = "this is not a diagram";

/** Two drawings and the state a source that does not parse paints. */
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
