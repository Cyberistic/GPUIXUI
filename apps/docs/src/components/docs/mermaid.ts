import { Effect, Schema } from "effect";
import { render, type RenderOptions } from "pele";

export class MermaidError extends Schema.TaggedError<MermaidError>()(
  "MermaidError",
  {
    message: Schema.String,
  },
  {
    description: "A Mermaid source that Pele's parser refused.",
  },
) {}

export const renderMermaid = (
  source: string,
  options?: RenderOptions,
): Effect.Effect<string, MermaidError> =>
  Effect.try({
    try: () => render(source, options).svg,
    catch: (cause) =>
      new MermaidError({
        message:
          cause instanceof Error && cause.message !== ""
            ? cause.message
            : "The diagram could not be read.",
      }),
  });

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
