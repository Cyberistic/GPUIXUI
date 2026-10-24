import { blockList } from "./blocks";
import { PreviewSurface } from "./preview-surface";

/**
 * The blocks index: one card per block, linking to its page, the way shadcn/ui
 * lists its blocks on `/blocks`. The cards live here so the index page stays a
 * thin MDX shell.
 *
 * The card is not an anchor: a block's preview is a page-level recipe and can
 * carry its own links (the sign-in page's navbar and footer do), and an anchor
 * around them would nest one link inside another — invalid HTML and a
 * hydration error. The title is the card's link.
 */
export function BlockIndex() {
  return (
    <div className="gx-block-index not-prose">
      {blockList.map((block) => (
        <div className="gx-block-card-link" key={block.name}>
          <PreviewSurface className="gx-block-card-thumb">
            {block.render()}
          </PreviewSurface>
          <div className="gx-block-card-body">
            <h3 className="gx-block-card-title">
              <a href={`/docs/blocks/${block.slug}`}>{block.title}</a>
            </h3>
            <p className="gx-block-card-desc">{block.description}</p>
            <span className="gx-block-card-meta">
              {block.name} · {block.packages.join(" · ")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
