/**
 * PinnedList: a sectioned scroll region whose section headers stay on screen.
 *
 * The runtime paints **no `position: "sticky"`** (measured: a sticky child
 * scrolls with its scroller), so this is not a layout mode — it is a header
 * layer over the scroller, repositioned from the measured offset every frame
 * (`pinned-list/logic.ts`). A header travels with its section, holds at the top
 * once it reaches it, and is pushed out by the section's last row. The header is
 * painted **once**: the scrolled content carries an empty spacer of the same
 * height, so nothing is duplicated and the reading order stays the list's own.
 *
 * A held header sits over moving rows, so it paints the caller's surface
 * opaquely and gains a bottom edge; while it travels it is just a title. The
 * layer takes `pointerEvents: "none"`, so a press on the first row under a held
 * header still reaches the row.
 *
 * Like the scroll readings, the box is `@gpuixui/primitives`' `ScrollArea`
 * viewport: a pinned header must measure the very element that scrolls, and that
 * element is also the keyboard region (`docs/pinned-list.mdx` §Keyboard).
 */

import type { EventPayload, StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState, type ReactNode } from "react";
import { ScrollSurface } from "./internal/scroll-surface.js";
import { textStyle, useTheme } from "./internal/theme.js";
import {
  headerHeightOf,
  pinnedHeaders,
  type PinnedHeaderFrame,
} from "./pinned-list/logic.js";

/** One section of a pinned list. */
export interface PinnedListSection {
  /** The section's title. It is also the section's key. */
  readonly title: string;
  readonly children?: ReactNode;
}

/** {@link PinnedList} props. */
export interface PinnedListProps {
  /** The sections, in scroll order. */
  readonly sections: ReadonlyArray<PinnedListSection>;
  /** The scroller's locator, for a probe or an automation host. */
  readonly testId?: string;
  /** The scroll region's accessible name. Default: the primitives' "Scroll region". */
  readonly "aria-label"?: string;
  /** A style for the component's box. Give it a bounded height. */
  readonly style?: StyleDesc;
  /** The absolute offset after any move. */
  readonly onScrollChange?: (event: EventPayload) => void;
  /** The viewport's painted box. */
  readonly onLayout?: (event: EventPayload) => void;
  /**
   * The height reserved for every header, in pixels. Default `32`; a header is
   * one line, so a wrapped title needs a taller row.
   */
  readonly headerHeight?: number;
  /**
   * The surface a held header paints over the rows below it. Default the
   * theme's `background` role; a list on a card or a popover passes that role.
   */
  readonly surfaceColor?: string;
  /** A Tailwind class string for the component's box, merged last. */
  readonly className?: string;
}

/**
 * A bounded scroll box of titled sections whose headers pin to the top.
 *
 * The component publishes one accessibility node per section — a group named by
 * the title — and the painted header is a presentation node. That is deliberate:
 * `0.11.0` has no `aria-hidden`, so a heading beside a painted copy would publish
 * the title twice, once in the wrong place.
 */
export const PinnedList = ({
  sections,
  headerHeight,
  surfaceColor,
  className,
  testId,
  "aria-label": label,
  style,
  onScrollChange,
  onLayout,
}: PinnedListProps) => {
  const theme = useTheme();
  const header = headerHeightOf(Option.fromNullishOr(headerHeight));
  const surface = surfaceColor ?? theme.colors.background;
  // One measured height per section, in content order. A height is 0 until the
  // first layout, and a section that changes size reports again.
  const [heights, setHeights] = useState<ReadonlyArray<number>>([]);

  const noteHeight =
    (index: number) =>
    (event: EventPayload): void => {
      const height = event.height ?? 0;
      setHeights((current) =>
        Arr.map(sections, (_, at) =>
          at === index ? height : (current[at] ?? 0),
        ),
      );
    };

  const headerLayer = (frames: ReadonlyArray<PinnedHeaderFrame>) => (
    <div
      testId="pinned-layer"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
        // A held header must not swallow a press on the row under it.
        pointerEvents: "none",
      }}
    >
      {Arr.map(frames, (frame) =>
        frame.visible ? (
          <div
            key={sections[frame.index]?.title ?? frame.index}
            testId={`pinned-header-${frame.index}`}
            role="presentation"
            style={{
              position: "absolute",
              top: frame.top,
              left: 0,
              right: 0,
              height: header,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: theme.spacing.md,
              paddingRight: theme.spacing.md,
              backgroundColor: surface,
              ...(frame.pinned
                ? {
                    borderBottomWidth: theme.borderWidth.thin,
                    borderColor: theme.colors.border,
                  }
                : {}),
            }}
          >
            <text
              role="presentation"
              style={{
                ...textStyle(theme, "bodyStrong"),
                color: theme.colors.foreground,
              }}
            >
              {sections[frame.index]?.title ?? ""}
            </text>
          </div>
        ) : null,
      )}
    </div>
  );

  return (
    <ScrollSurface
      testId={testId}
      label={label}
      style={style}
      onScrollChange={onScrollChange}
      onLayout={onLayout}
      className={cn("relative", className)}
      chrome={(metrics) =>
        headerLayer(pinnedHeaders(heights, metrics.offsetY, header))
      }
    >
      {sections.map((section, index) => (
        <div
          key={section.title}
          testId={`pinned-section-${index}`}
          role="group"
          aria-label={section.title}
          onLayout={noteHeight(index)}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* The title is painted in the layer; this reserves its row. */}
          <div
            testId={`pinned-space-${index}`}
            style={{ height: header, flexShrink: 0 }}
          />
          <div>{section.children}</div>
        </div>
      ))}
    </ScrollSurface>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const pinnedListMeta = {
  name: "Pinned list",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the runtime paints no position: sticky, so a header is a layer repositioned from the measured offset rather than a sticky child",
    "the region is vertical only, and an arrow key moves it by the primitives' row height",
    "a header is one line and reserves headerHeight: a wrapped title is clipped rather than made taller",
    "sections are keyed by title, and a section inserted mid-list keeps stale heights until its own layout reports",
  ],
  docs: "docs/pinned-list.mdx",
  example: "examples/pinned-list.example.tsx",
  testFile: "src/behaviour/pinned-list.test.tsx",
} as const;
