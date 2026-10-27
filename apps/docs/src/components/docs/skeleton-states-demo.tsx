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

/** The list shape a caller builds from rows, not a component of its own. */
export const SkeletonList = () => (
  <div className="gx-demo gx-demo-column gx-skel-scene">
    <div className="gx-skel-card gx-skel-list">
      {[0, 1, 2].map((row) => (
        <div className="gx-skel-row" key={row}>
          <span className="gx-skel gx-skel-circle gx-skel-avatar" />
          <div className="gx-skel-lines">
            <span className="gx-skel gx-skel-body" />
            <span className="gx-skel gx-skel-body gx-skel-body-short" />
          </div>
        </div>
      ))}
    </div>
    <p className="gx-demo-label">
      Rows are composition: a circle, two lines and the caller's own gap.
    </p>
  </div>
);

const skeletonListSource = `import { Skeleton } from "@gpuixui/components/skeleton";
import { Stack } from "@gpuixui/primitives";

<Stack direction="column" gap="md">
  {people.map((person) => (
    <Stack key={person.id} direction="row" align="center" gap="sm">
      <Skeleton circle width={32} height={32} />
      <Stack direction="column" gap="xs" style={{ flexGrow: 1 }}>
        <Skeleton height={12} width="45%" />
        <Skeleton height={12} width="70%" />
      </Stack>
    </Stack>
  ))}
</Stack>;`;

export { skeletonListSource };
