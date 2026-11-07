import * as Option from "effect/Option";
import type { PackageOrigin } from "@/lib/collection-routes";
import { previewFor } from "@/lib/package-preview";
import { ComponentPreview } from "./component-preview";

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
