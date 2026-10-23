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
  | "archive"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "columns"
  | "download"
  | "eye"
  | "flag"
  | "folder"
  | "forward"
  | "grid"
  | "list"
  | "mail"
  | "mark"
  | "paperclip"
  | "phone"
  | "plus"
  | "refresh"
  | "reply"
  | "replyAll"
  | "search"
  | "send"
  | "snooze"
  | "star"
  | "trash"
  | "zap";

const GLYPHS: Readonly<Record<BlockIconName, ReactNode>> = {
  archive: (
    <>
      <rect height="4" rx="1" width="18" x="3" y="4" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
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
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  forward: (
    <>
      <path d="m15 17 5-5-5-5" />
      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
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
  mark: <path d="M20 6 9 17l-5-5" />,
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
