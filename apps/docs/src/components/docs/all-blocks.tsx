import { allBlocks } from "@/lib/block-index-data";

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
