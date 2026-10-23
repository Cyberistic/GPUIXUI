import { Callout } from "fumadocs-ui/components/callout";

/**
 * The command that opens the companion native playground.
 *
 * The package pages are Markdown, not a browser rendering, so the note above
 * one has to say how to see the real thing. It quotes the root manifest's script
 * by name; `native-run-note.test.ts` holds both to each other.
 */
export const playgroundScript = "dev:playground";
export const playgroundCommand = `nub run ${playgroundScript}`;
export const playgroundHref = "/docs/installation#run-the-playground";

/**
 * The note above a page the package ships.
 *
 * A package page is rendered as-is from `packages/<pkg>/docs` and the site has
 * no native surface, so a `Preview` the page mounts is a browser drawing and
 * says nothing about the GPUix frame. The note cannot deny that preview — a
 * component or primitive page mounts one — so it labels the drawing an
 * approximation and points at the command that shows the real component.
 */
export function NativeRunNote({
  kind,
  path,
}: {
  /** What the collection calls the package: `primitive`, `component`, `icon set`. */
  readonly kind: string;
  /** Repository-relative path of the Markdown this page renders. */
  readonly path: string;
}) {
  return (
    <Callout title={`This page ships with the ${kind}`} type="info">
      It is rendered from <code>{path}</code>, the page the package maintains. A
      Preview tab, where the page has one, is a browser approximation, labelled
      as one — the shipped code renders through GPUix. Run the real component in
      the native playground with <code>{playgroundCommand}</code> —{" "}
      <a href={playgroundHref}>how to run the playground</a>.
    </Callout>
  );
}
