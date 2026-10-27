/**
 * Browser preview for the Progress component page.
 *
 * The shipped bar is a GPUix host tree, so the preview draws the same shapes
 * from the theme bridge and says so. The one rule it can teach is the shape of
 * the API: a value stated against a maximum, and an indeterminate bar with no
 * measurement at all.
 */

/** One bar, its share and the words beside it. */
const Bar = ({
  value,
  max,
  label,
  indeterminate = false,
}: {
  readonly value?: number;
  readonly max?: number;
  readonly label: string;
  readonly indeterminate?: boolean;
}) => {
  const share =
    indeterminate || value === undefined || max === undefined
      ? 40
      : Math.min(100, (value / max) * 100);
  return (
    <div className="gx-meter-block">
      <span className="gx-meter-label">
        {label} · {indeterminate ? "loading" : `${share.toFixed(0)}%`}
      </span>
      <span
        aria-valuetext={indeterminate ? "loading" : `${share.toFixed(0)}%`}
        className="gx-meter"
        role="progressbar"
      >
        <span className="gx-meter-track">
          {indeterminate ? (
            <span className="gx-progress-segment" />
          ) : (
            <span
              className="gx-meter-fill"
              data-tone="primary"
              style={{ width: `${share}%` }}
            />
          )}
        </span>
      </span>
    </div>
  );
};

export const ProgressValues = () => (
  <div className="gx-demo gx-demo-column gx-meter-scene">
    <Bar label="30 of 120" max={120} value={30} />
    <Bar label="Complete" max={100} value={100} />
    <Bar indeterminate label="Preparing archive" />
  </div>
);

const progressValuesSource = `import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@gpuixui/components/progress";

// value and max are the caller's units: this paints a quarter.
<Progress value={30} max={120} label="Uploading">
  <ProgressLabel />
  <ProgressValue />
</Progress>;

// No value paints the indeterminate segment.
<Progress label="Preparing archive" loadingText="preparing" />;`;

export { progressValuesSource };
