/**
 * Browser preview for the Skeleton page.
 *
 * A skeleton is a pulsing placeholder block. The preview draws the shape of a
 * card: a title line, a body line and a full-width block, with the radius and
 * circle variants. The Code tab shows the native usage.
 */

export const SkeletonDemo = () => (
  <div className="gx-demo gx-demo-column gx-skel-scene">
    <div className="gx-skel-card">
      <span className="gx-skel gx-skel-title" />
      <span className="gx-skel gx-skel-body" />
      <span className="gx-skel gx-skel-body gx-skel-body-short" />
      <span className="gx-skel gx-skel-block" />
    </div>
    <div className="gx-demo-row">
      <span className="gx-skel gx-skel-circle" />
      <span className="gx-skel gx-skel-pill" />
    </div>
  </div>
);

const skeletonDemoSource = `import { Skeleton, Stack } from "@gpuixui/primitives";

<Stack direction="column" gap="sm">
  <Skeleton height={36} width="45%" />
  <Skeleton height={14} width="70%" />
  <Skeleton height={12} />
</Stack>;

// circle rounds the block; the missing side mirrors the other.
<Skeleton circle width={24} height={24} />;
<Skeleton width={120} height={24} />;`;

export { skeletonDemoSource };
