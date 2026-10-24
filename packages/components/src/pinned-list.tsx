/** @jsxImportSource @gpuix/react */
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
 * layer, the painted header and its title all take `pointerEvents: "none"`,
 * because the runtime's hit test stops at the element that paints, so a press
 * on the first row under a held header still reaches the row.
 *
 * Like the scroll readings, the box is `@gpuixui/primitives`' `ScrollArea`
 * viewport: a pinned header must measure the very element that scrolls, and that
 * element is also the keyboard region (`docs/pinned-list.mdx` §Keyboard).
 */

import type { EventPayload, StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { useState } from "react";
import { measuredHeight } from "./internal/measure.js";
import { ScrollSurface } from "./internal/scroll-surface.js";
import { textStyle, useTheme } from "./internal/theme.js";
import {
  headerHeightOf,
  pinnedHeaders,
  sectionsOf,
  type PinnedHeaderFrame,
  type PinnedListSection,
} from "./pinned-list/logic.js";

export type { PinnedListSection } from "./pinned-list/logic.js";

/** {@link PinnedList} props. */
export interface PinnedListProps {
  /** The sections, in scroll order. A value that is not a list — a saved layout's `null` — paints an empty list, and an entry without a text title is not a section. */
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
  sections: storedSections,
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
  const sections = sectionsOf(storedSections);
  const header = headerHeightOf(Option.fromNullishOr(headerHeight));
  const surface = surfaceColor ?? theme.colors.background;
  // One measured height per section, keyed by the section's own title — the key
  // the renderer reorders by. A height held by **position** would stay with the
  // slot when a caller reorders its sections: the section that moved into the
  // slot would be placed with its neighbour's height, and every header below it
  // would pin at an offset no row has.
  const [heights, setHeights] = useState<HashMap.HashMap<string, number>>(
    HashMap.empty(),
  );

  const noteHeight =
    (title: string) =>
    (event: EventPayload): void => {
      Option.match(measuredHeight(event), {
        onNone: () => undefined,
        onSome: (height) =>
          setHeights((current) => HashMap.set(current, title, height)),
      });
    };

  /** The heights in the order the sections are declared now. */
  const bands = Arr.map(sections, (section) =>
    Option.getOrElse(HashMap.get(heights, section.title), () => 0),
  );

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
              // The layer's opt-out does not reach the element that paints: a
              // held header covers the row below it with its own surface, so
              // both it and its text take the opt-out or the row loses the
              // press (`behaviour/pinned-list.test.tsx`).
              pointerEvents: "none",
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
                pointerEvents: "none",
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
        headerLayer(pinnedHeaders(bands, metrics.offsetY, header))
      }
    >
      {sections.map((section, index) => (
        <div
          key={section.title}
          testId={`pinned-section-${index}`}
          role="group"
          aria-label={section.title}
          onLayout={noteHeight(section.title)}
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
    "sections are keyed by title, and each measured height is kept with its title — so reordering the sections keeps every header with its own rows; a section that has not reported yet counts as 0 until its layout arrives",
  ],
  docs: "docs/pinned-list.mdx",
  example: "examples/pinned-list.example.tsx",
  testFile: "src/behaviour/pinned-list.test.tsx",
} as const;
