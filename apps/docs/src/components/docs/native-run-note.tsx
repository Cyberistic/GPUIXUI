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
 * A package page is rendered as-is from `packages/<pkg>/docs`, and the site has
 * no native surface, so it states that the browser will not draw the component
 * and points at the command that will.
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
      browser preview is not available for this {kind}: run it in the native
      playground with <code>{playgroundCommand}</code> —{" "}
      <a href={playgroundHref}>how to run the playground</a>.
    </Callout>
  );
}
