import { IllustrativeApproximation } from "./approximation-banner";
import { previewsBySlug } from "./approximations";

/**
 * A labelled tier-A preview for a component that has one (plan 412, plan 434).
 * A slug with no registered preview renders nothing — a page may document a
 * component without a browser approximation. The banner is part of this
 * component, so a preview can never be rendered unlabelled.
 */
export function ComponentPreview({ slug }: { readonly slug: string }) {
  const Preview = previewsBySlug.get(slug);
  if (Preview === undefined) return null;

  return (
    <div data-component-preview={slug}>
      <IllustrativeApproximation>
        <Preview />
      </IllustrativeApproximation>
    </div>
  );
}
