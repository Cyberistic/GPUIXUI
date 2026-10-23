/**
 * Browser preview for the Meter page.
 *
 * A meter reports where a measurement sits in a known range — not task
 * progress. The preview draws the four tones at different fills. The Code tab
 * shows the native usage.
 */

const meters = [
  { tone: "primary", value: 68, label: "Disk usage" },
  { tone: "success", value: 40, label: "Storage" },
  { tone: "destructive", value: 92, label: "Load" },
  { tone: "muted", value: 15, label: "Reserved" },
] as const;

export const MeterDemo = () => (
  <div className="gx-demo gx-demo-column gx-meter-scene">
    {meters.map((entry) => (
      <div className="gx-meter-block" key={entry.tone}>
        <span className="gx-meter-label">
          {entry.label} · {entry.value}%
        </span>
        <span
          className="gx-meter"
          role="meter"
          aria-valuetext={`${entry.value}%`}
        >
          <span className="gx-meter-track">
            <span
              className="gx-meter-fill"
              data-tone={entry.tone}
              style={{ width: `${entry.value}%` }}
            />
          </span>
        </span>
      </div>
    ))}
  </div>
);

const meterDemoSource = `import { Meter, Stack, Text } from "@gpuixui/primitives";

<Stack direction="column" gap="xs">
  <Text role="caption" tone="muted">Disk usage · 68 of 100 GB</Text>
  <Meter
    label="Disk usage"
    value={68}
    max={100}
    formatValue={(v) => \`\${v} GB\`}
  />
</Stack>;

<Meter label="Storage" value={40} tone="success" />;
<Meter label="Load" value={92} tone="destructive" />;
<Meter label="Reserved" value={15} tone="muted" />;`;

export { meterDemoSource };
