/**
 * Browser preview for the Skeleton component page.
 *
 * The shipped placeholder is a GPUix host tree, so the preview draws the blocks
 * from the theme bridge and says so. It teaches the two shapes a caller builds:
 * a composed card and one block held still.
 */

export const SkeletonStates = () => (
  <div className="gx-demo gx-demo-column gx-skel-scene">
    <div className="gx-skel-card">
      <span className="gx-skel gx-skel-title" />
      <span className="gx-skel gx-skel-body" />
      <span className="gx-skel gx-skel-body gx-skel-body-short" />
      <span className="gx-skel gx-skel-block" />
    </div>
    <div className="gx-demo-row">
      <span className="gx-skel gx-skel-circle" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="gx-skel gx-skel-body" />
        <span className="gx-skel gx-skel-body gx-skel-body-short" />
      </div>
    </div>
    <p className="gx-demo-label">
      Last line: <code>{"animate={false}"}</code> — one frame, no timer.
    </p>
  </div>
);

const skeletonStatesSource = `import { Skeleton } from "@gpuixui/components/skeleton";

<Skeleton width="45%" height={14} />;
<Skeleton width="70%" height={14} />;

// A circle mirrors whichever side it was given.
<Skeleton circle width={40} height={40} />;

// The still frame a reduced-motion preference asks for.
<Skeleton width="60%" height={14} animate={false} />;`;

export { skeletonStatesSource };
