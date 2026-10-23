/**
 * Browser preview for the Progress page.
 *
 * Progress is a determinate or indeterminate bar. The preview draws a
 * determinate fill with a buffer segment and an indeterminate segment. The Code
 * tab shows the native usage.
 */

export const ProgressDemo = () => (
  <div className="gx-demo gx-demo-column gx-meter-scene">
    <div className="gx-meter-block">
      <span className="gx-meter-label">Uploading · 42%</span>
      <span className="gx-meter" role="progressbar" aria-valuetext="42%">
        <span className="gx-meter-track">
          <span
            className="gx-meter-fill"
            data-tone="primary"
            style={{ width: "42%" }}
          />
          <span className="gx-progress-buffer" style={{ width: "64%" }} />
        </span>
      </span>
    </div>
    <div className="gx-meter-block">
      <span className="gx-meter-label">Indeterminate · loading</span>
      <span className="gx-meter" role="progressbar" aria-valuetext="loading">
        <span className="gx-meter-track">
          <span className="gx-progress-segment" />
        </span>
      </span>
    </div>
  </div>
);

const progressDemoSource = `import { Progress, Stack, Text } from "@gpuixui/primitives";

<Stack direction="column" gap="xs">
  <Text role="caption" tone="muted">Uploading · 42%</Text>
  <Progress value={42} label="Uploading" buffer={64} />
</Stack>;

// Without value the bar is indeterminate; loadingText says the word.
<Progress label="Uploading" loadingText="loading" />;`;

export { progressDemoSource };
