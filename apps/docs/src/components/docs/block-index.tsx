import { blockList } from "./blocks";

export function BlockIndex() {
  return (
    <div className="gx-block-index not-prose">
      {blockList.map((block) => (
        <div className="gx-block-card-link" key={block.name}>
          <img
            alt=""
            className="gx-block-card-thumb"
            loading="lazy"
            src={`/blocks/${block.slug}.webp`}
          />
          <div className="gx-block-card-body">
            <h3 className="gx-block-card-title">
              <a href={`/blocks/${block.slug}`}>{block.title}</a>
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
