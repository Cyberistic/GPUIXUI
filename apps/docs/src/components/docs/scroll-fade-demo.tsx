/**
 * Browser preview for the Scroll fade page.
 *
 * The native scroll box fades the edge hiding more content; the preview toggles
 * the same two-stop strips with the offset.
 */

import { useState, type UIEvent } from "react";

const notes = [
  "Releases ship on Tuesdays",
  "Nightly exports run at 02:00",
  "Seats renew every 30 days",
  "Audit logs keep 90 days",
  "Invoices email on the 1st",
  "Builds timeout after 20 minutes",
];

export function ScrollFadeDemo() {
  const [fade, setFade] = useState({ top: false, bottom: true });

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    setFade({
      top: el.scrollTop > 0,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
    });
  };

  return (
    <div className="gx-scrollfade">
      <span
        aria-hidden="true"
        className="gx-scrollfade-edge gx-scrollfade-top"
        data-visible={fade.top ? "" : undefined}
      />
      <div className="gx-scrollfade-box" onScroll={onScroll}>
        {notes.map((note) => (
          <div className="gx-scrollfade-row" key={note}>
            {note}
          </div>
        ))}
      </div>
      <span
        aria-hidden="true"
        className="gx-scrollfade-edge gx-scrollfade-bottom"
        data-visible={fade.bottom ? "" : undefined}
      />
    </div>
  );
}

export const scrollFadeDemoSource = `import { ScrollFade } from "@gpuixui/components/scroll-fade";

<ScrollFade color={theme.colors.card} style={{ height: 240 }}>
  {notes.map((note) => (
    <Note key={note.id} note={note} />
  ))}
</ScrollFade>;`;
