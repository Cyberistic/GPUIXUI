import { allBlocks } from "@/lib/block-index-data";

/**
 * Every block in one column.
 *
 * The cards on `/docs/blocks` are for browsing a picture of each block; this
 * page is for finding one. One row per block, each built from the page's own
 * frontmatter, so the list cannot omit a page or describe it differently.
 */
export function AllBlocks() {
  return (
    <div className="gx-all-blocks not-prose">
      {allBlocks.map((block) => (
        <a className="gx-all-block" href={block.url} key={block.slug}>
          <span className="gx-all-block-title">{block.title}</span>
          <span className="gx-all-block-desc">{block.description}</span>
        </a>
      ))}
    </div>
  );
}
