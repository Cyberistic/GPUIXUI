/**
 * Browser preview for the Diagram page.
 *
 * The native `Diagram` paints its drawing as **one image** — the runtime's own
 * SVG decoder paints the whole document — so the browser preview paints the
 * same document as **markup**: Pele's SVG goes into the page as it stands.
 *
 * The drawing is the same one either way: Pele's renderer is the same
 * renderer, and its palette is written as CSS custom properties, which the
 * browser resolves and a raster cannot. So the preview re-themes with the
 * page's theme, and the native component bakes the theme's values into the
 * drawing — the docs page says so.
 */

import { MermaidDiagram } from "./mermaid-diagram";

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

/** The Diagram page's preview: a flow, a sequence and the failure state. */
export const DiagramDemo = () => (
  <div className="gx-diagram-demo">
    <MermaidDiagram source={FLOW} caption="How a component becomes a picture" />
    <MermaidDiagram source={SEQUENCE} caption="What the reader composes" />
    <MermaidDiagram source={BROKEN} caption="The failure state" />
  </div>
);

/** The source the page's snippet shows. */
export const diagramDemoSource = `import { Diagram } from "@gpuixui/components/diagram";

<Diagram
  aria-label="The render path"
  source={\`flowchart LR
  author[Author] --> component[Component]
  component --> reader([Reader])\`}
  caption="How a component becomes a picture"
/>;`;
