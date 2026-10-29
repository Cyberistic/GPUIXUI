import { Effect, Schema } from "effect";
import { render } from "pele";

/**
 * Mermaid diagrams, rendered by Pele.
 *
 * Pele renders Mermaid to SVG synchronously with no runtime dependency, and it
 * themes itself by reading `--pele-*` custom properties — so the diagram is
 * built once and a theme switch re-themes it without a second render.
 *
 * ## Why this lives in the docs and not in the component library
 *
 * A GPUix surface cannot paint a Mermaid diagram. `<svg source>` paints its
 * whole markup **as one tint** (the runtime masks it in the element's colour, so
 * a shape's own `fill` never reaches the frame — see
 * `docs/gpuix-capabilities.md`, "Inline SVG painting"), and a Mermaid diagram is
 * many colours. The library's other vector route decodes SVG **bytes** through
 * `ImgInstance.setImage`, which does paint every fill its own colour, but an
 * image cannot be re-themed by a CSS variable, cannot be selected and cannot
 * carry a link. The docs site is a browser, so it takes the SVG as markup.
 *
 * The source is a boundary: it is user text, so a diagram that does not parse is
 * a typed failure rather than a thrown render.
 */

/** A diagram Pele could not read, with the source that failed to parse. */
export class MermaidError extends Schema.TaggedError<MermaidError>()(
  "MermaidError",
  {
    message: Schema.String,
  },
  {
    description: "A Mermaid source that Pele's parser refused.",
  },
) {}

/** Render one Mermaid source to SVG markup. */
export const renderMermaid = (
  source: string,
): Effect.Effect<string, MermaidError> =>
  Effect.try({
    try: () => render(source).svg,
    catch: (cause) =>
      new MermaidError({
        message:
          cause instanceof Error && cause.message !== ""
            ? cause.message
            : "The diagram could not be read.",
      }),
  });

/** The diagram a page shows when it offers no source of its own. */
export const EVIDENCE_SOURCE = `flowchart LR
  subgraph author[Author]
    component[Component] --> recipe[Recipe]
  end
  subgraph render[Render]
    recipe --> themed[Themed surface]
    themed --> frame[Frame]
  end
  author --> render
  render --> reader([Reader])`;
