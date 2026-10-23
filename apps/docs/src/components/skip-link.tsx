/**
 * The site's own bypass link.
 *
 * Every docs page puts a sidebar of dozens of links before the page it
 * documents, so a keyboard reader paid that tab cost on every navigation. This
 * is the first focusable thing the shell renders; it is off-screen until it is
 * focused and targets the id every content surface carries.
 *
 * `mainContentId` is the contract between the link and the surface: the docs
 * frame, the landing, the live route and the 404 all render it, and
 * `skip-link.test.tsx` holds each one. A bypass link with no target is worse
 * than none — it moves nothing.
 */

/** The id a page's content carries so the skip link can land on it. */
export const mainContentId = "gx-main";

export function SkipLink() {
  return (
    <a className="gx-skip-link" href={`#${mainContentId}`}>
      Skip to content
    </a>
  );
}
