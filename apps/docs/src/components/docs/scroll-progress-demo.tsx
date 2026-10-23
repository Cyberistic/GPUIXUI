/**
 * Browser preview for the Scroll progress page.
 *
 * The native reading line tracks how far through scrollable content the reader
 * is; the preview fills the same line from the scroll offset.
 */

import { useState, type UIEvent } from "react";

const rows = [
  "Profile",
  "Notifications",
  "Appearance",
  "Keyboard",
  "Integrations",
  "Sessions",
  "Billing",
  "Danger zone",
];

export function ScrollProgressDemo() {
  const [progress, setProgress] = useState(0);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max <= 0 ? 0 : el.scrollTop / max);
  };

  return (
    <div className="gx-scrollprogress">
      <div aria-hidden="true" className="gx-scrollprogress-track">
        <span
          className="gx-scrollprogress-fill"
          style={{ width: `${(progress * 100).toFixed(1)}%` }}
        />
      </div>
      <div
        aria-label="Settings read"
        className="gx-scrollprogress-box"
        onScroll={onScroll}
      >
        {rows.map((row) => (
          <div className="gx-scrollprogress-row" key={row}>
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

export const scrollProgressDemoSource = `import { ScrollProgress } from "@gpuixui/components/scroll-progress";

<ScrollProgress label="Settings read" style={{ height: 240 }}>
  {settings.map((setting) => (
    <SettingsRow key={setting.id} setting={setting} />
  ))}
</ScrollProgress>;`;
