import { blocks } from "./blocks";
import { PreviewSurface } from "./preview-surface";
import { RecipeSource } from "./recipe-source";

/**
 * One block page: the recipe's screen, then the source that draws it.
 *
 * A block is a page, not a specimen, so it is not mounted in the component
 * pages' fixed-height Preview/Code panel — that box cropped a dashboard and
 * squeezed an inbox into 520px. The screen takes the page column's own width
 * and paints at its natural size; the recipe follows in a disclosure beneath.
 *
 * The scene is still `PreviewSurface`, so the palette, `data-platform` and
 * platform font keep following the switch.
 */
export function BlockPreview({ name }: { name: string }) {
  const block = blocks[name];
  if (block === undefined) {
    throw new Error(`BlockPreview: no block named "${name}"`);
  }

  return (
    <div className="gx-block-screen not-prose">
      <PreviewSurface className="gx-block-stage">
        {block.render()}
      </PreviewSurface>
      <RecipeSource label={block.name} source={block.source} />
    </div>
  );
}
