import type { ReactNode } from "react";

/**
 * The glyphs the block previews draw.
 *
 * A block renders in the browser, not through GPUix, so it cannot use the
 * library's `Icon` — which paints a native host element. These are the same
 * strokes on a plain `<svg>`, shared by the file manager and the mail client so
 * one geometry serves every block.
 */
export type BlockIconName =
  | "alert"
  | "archive"
  | "bell"
  | "card"
  | "chart"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "clock"
  | "columns"
  | "download"
  | "eye"
  | "file"
  | "flag"
  | "flame"
  | "folder"
  | "forward"
  | "gear"
  | "grid"
  | "link"
  | "list"
  | "mail"
  | "mark"
  | "more"
  | "paperclip"
  | "phone"
  | "plus"
  | "refresh"
  | "reply"
  | "replyAll"
  | "search"
  | "send"
  | "snooze"
  | "sparkles"
  | "badgeCheck"
  | "logout"
  | "star"
  | "trash"
  | "zap";

const GLYPHS: Readonly<Record<BlockIconName, ReactNode>> = {
  alert: (
    <>
      <path d="m12 3 9.5 17H2.5Z" />
      <path d="M12 9v5M12 17.5h.01" />
    </>
  ),
  archive: (
    <>
      <rect height="4" rx="1" width="18" x="3" y="4" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7" />
      <path d="M10.3 20a3 3 0 0 0 3.4 0" />
    </>
  ),
  card: (
    <>
      <rect height="14" rx="2" width="20" x="2" y="5" />
      <path d="M2 10h20" />
    </>
  ),
  chart: (
    <>
      <path d="M3 20h18" />
      <path d="m4 15 5-5 4 3 7-8" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  columns: (
    <>
      <rect height="18" rx="1" width="4" x="3" y="3" />
      <rect height="18" rx="1" width="4" x="10" y="3" />
      <rect height="18" rx="1" width="4" x="17" y="3" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  flag: (
    <>
      <path d="M4 22V4h16l-3 5 3 5H4" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  flame: (
    <path d="M12 22c4 0 7-2.7 7-6.5 0-3.6-2.5-5.8-4-8.5-.7-1.2-1-2.6-1-4-3 2-5 5-5 8 0 1.2.4 2.2 1 3-1.7 0-3-1.3-3-3-1.3 1.4-2 3.1-2 5 0 3.8 3 6 7 6Z" />
  ),
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  forward: (
    <>
      <path d="m15 17 5-5-5-5" />
      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  grid: (
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  mail: (
    <>
      <rect height="14" rx="2" width="20" x="2" y="5" />
      <path d="m2 7 10 6 10-6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  mark: <path d="M20 6 9 17l-5-5" />,
  more: (
    <>
      <circle cx="5" cy="12" fill="currentColor" r="1.4" />
      <circle cx="12" cy="12" fill="currentColor" r="1.4" />
      <circle cx="19" cy="12" fill="currentColor" r="1.4" />
    </>
  ),
  paperclip: (
    <path d="M21.4 11.05 12.25 20.2a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </>
  ),
  reply: (
    <>
      <path d="m9 17-5-5 5-5" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </>
  ),
  replyAll: (
    <>
      <path d="m7 17-5-5 5-5" />
      <path d="m12 17-5-5 5-5" />
      <path d="M22 18v-2a4 4 0 0 0-4-4h-6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </>
  ),
  snooze: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  star: (
    <path d="m12 2 3 6.6 7 .7-5 4.9 1.2 7-6.2-3.2L5.8 21 7 14.2 2 9.3l7-.7Z" />
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m6 6 1 15h10l1-15" />
    </>
  ),
  zap: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  sparkles: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.4 6.4 2.8 2.8M14.8 14.8l2.8 2.8M17.6 6.4l-2.8 2.8M9.2 14.8l-2.8 2.8" />
    </>
  ),
  badgeCheck: (
    <>
      <path d="M12 2.5 15 5l3.5-.5.5 3.5 2.5 3-2.5 3 .5 3.5L15 17l-3 2.5L9 17l-3.5.5L5 14 2.5 11 5 8l.5-3.5L9 5Z" />
      <path d="m9 11 2 2 4-4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
};

/** One block glyph, `currentColor` at `size` pixels. */
export function BlockIcon({
  name,
  size = 14,
}: {
  readonly name: BlockIconName;
  readonly size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className="gx-block-glyph"
      data-icon={name}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {GLYPHS[name]}
    </svg>
  );
}
