/**
 * Browser preview for the ScrollArea page.
 *
 * A scroll area is a bounded container that scrolls on the chosen axes. The
 * preview draws a vertical frame around a list that overflows it, and a
 * horizontal strip. The Code tab shows the native usage.
 */

const rows = Array.from({ length: 14 }, (_, index) => `Row ${index + 1}`);

export const ScrollAreaDemo = () => (
  <div className="gx-demo gx-demo-column gx-scroll-scene">
    <div className="gx-scroll-block">
      <span className="gx-scroll-label">Vertical</span>
      <div className="gx-scroll" role="group" aria-label="Rows" tabIndex={0}>
        {rows.map((row) => (
          <span className="gx-scroll-row" key={row}>
            {row}
          </span>
        ))}
      </div>
    </div>
    <div className="gx-scroll-block">
      <span className="gx-scroll-label">Horizontal</span>
      <div
        className="gx-scroll gx-scroll-h"
        role="group"
        aria-label="Columns"
        tabIndex={0}
      >
        {[
          "Deployment",
          "Branch",
          "Commit",
          "Status",
          "Duration",
          "Trigger",
          "Author",
          "Log",
        ].map((column) => (
          <span className="gx-scroll-chip" key={column}>
            {column}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const scrollAreaDemoSource = `import { ScrollArea, Stack, Text } from "@gpuixui/primitives";

<ScrollArea axis="vertical" style={{ height: 240 }} padding="md" label="Rows">
  <Stack direction="column" gap="sm">
    {rows.map((row) => (
      <Text role="body" key={row}>{row}</Text>
    ))}
  </Stack>
</ScrollArea>;

// axis="horizontal" scrolls sideways; "both" does both.
<ScrollArea axis="horizontal" style={{ width: 320 }} label="Columns" />;`;

export { scrollAreaDemoSource };
