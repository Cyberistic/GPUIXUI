import { blockList } from "./blocks";

/**
 * The blocks index: one card per block, linking to its page, the way shadcn/ui
 * lists its blocks on `/blocks`. The cards live here so the index page stays a
 * thin MDX shell.
 */
export function BlockIndex() {
  return (
    <div className="gx-block-index not-prose">
      {blockList.map((block) => (
        <a
          className="gx-block-card-link"
          href={`/docs/blocks/${block.slug}`}
          key={block.name}
        >
          <div className="gx-demo gx-block-card-thumb">{block.render()}</div>
          <div className="gx-block-card-body">
            <h3 className="gx-block-card-title">{block.title}</h3>
            <p className="gx-block-card-desc">{block.description}</p>
            <span className="gx-block-card-meta">
              {block.name} · {block.packages.join(" · ")}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
