import * as Option from "effect/Option";
import type { PackageOrigin } from "@/lib/collection-routes";
import { previewFor } from "@/lib/package-preview";
import { ComponentPreview } from "./component-preview";

/**
 * The preview the site mounts on a package page.
 *
 * A package page's Markdown is the package's, so a lane whose pages cannot
 * mount a `<ComponentPreview>` of their own is previewed here, from
 * `src/lib/package-preview.ts`. The drawing is the same registered demo a
 * curated page reads and carries the same label, so a reader is told the same
 * thing whichever half mounted it.
 *
 * A page the table does not name renders nothing at all; the package page is
 * then complete on its own, exactly as it was written.
 */
export function MountedPreview({
  origin,
  path,
}: {
  readonly origin: PackageOrigin;
  readonly path: string;
}) {
  return Option.match(previewFor(origin, path), {
    onNone: () => null,
    onSome: (demo) => <ComponentPreview name={demo} />,
  });
}
