/** @jsxImportSource @gpuix/react */
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { useState } from "react";
import { measuredHeight } from "./internal/measure.js";
import { ScrollSurface } from "./internal/scroll-surface.js";
import { nameOf } from "./internal/text.js";
import { textStyle, useTheme } from "./internal/theme.js";
import {
  headerHeightOf,
  pinnedHeaders,
  sectionsOf,
  type PinnedHeaderFrame,
  type PinnedListSection,
} from "./pinned-list/logic.js";

export type { PinnedListSection } from "./pinned-list/logic.js";

export interface PinnedListProps {
  readonly sections: ReadonlyArray<PinnedListSection>;

  readonly testId?: string;

  readonly "aria-label"?: string;

  readonly style?: StyleDesc;

  readonly onScrollChange?: (event: EventPayload) => void;

  readonly onLayout?: (event: EventPayload) => void;

  readonly headerHeight?: number;

  readonly surfaceColor?: string;

  readonly className?: string;
}

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
      label={nameOf(label)}
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
          {}
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
