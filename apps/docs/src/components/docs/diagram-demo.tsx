import { MermaidDiagram } from "./mermaid-diagram";

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

export const DiagramDemo = () => (
  <div className="gx-diagram-demo">
    <MermaidDiagram source={FLOW} caption="How a component becomes a picture" />
    <MermaidDiagram source={SEQUENCE} caption="What the reader composes" />
    <MermaidDiagram source={BROKEN} caption="The failure state" />
  </div>
);

export const diagramDemoSource = `import { Diagram } from "@gpuixui/components/diagram";

<Diagram
  aria-label="The render path"
  source={\`flowchart LR
  author[Author] --> component[Component]
  component --> reader([Reader])\`}
  caption="How a component becomes a picture"
/>;`;
