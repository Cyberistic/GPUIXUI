export const mainContentId = "gx-main";

export function SkipLink() {
  return (
    <a className="gx-skip-link" href={`#${mainContentId}`}>
      Skip to content
    </a>
  );
}
