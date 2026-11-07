import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactNode } from "react";

export interface PinnedListSection {
  readonly title: string;
  readonly children?: ReactNode;
}

const isSection = (entry: unknown): entry is PinnedListSection => {
  if (typeof entry !== "object" || entry === null || !("title" in entry)) {
    return false;
  }
  const title = entry.title;
  return typeof title === "string" && title.trim().length > 0;
};

export const sectionsOf = (
  value: ReadonlyArray<PinnedListSection> | null | undefined,
): ReadonlyArray<PinnedListSection> => {
  const list = Option.getOrElse(
    Option.filter(Option.fromNullishOr(value), (entries): boolean =>
      Arr.isArray(entries),
    ),
    () => [],
  );
  return Arr.filter(list, isSection);
};

export interface PinnedSectionHeight {
  readonly top: number;
  readonly height: number;
}

export interface PinnedHeaderFrame {
  readonly index: number;

  readonly top: number;

  readonly pinned: boolean;

  readonly visible: boolean;
}

export const pinnedHeaderHeight = 32;

export const headerHeightOf = (height: Option.Option<number>): number =>
  Option.getOrElse(
    Option.map(
      Option.filter(height, (value) => Number.isFinite(value) && value > 0),
      Math.round,
    ),
    () => pinnedHeaderHeight,
  );

const measurable = (height: number): number =>
  Number.isFinite(height) && height > 0 ? height : 0;

const tenth = (value: number): number => Math.round(value * 10) / 10;

export const sectionBands = (
  heights: ReadonlyArray<number>,
): ReadonlyArray<PinnedSectionHeight> =>
  Arr.mapAccum(heights, 0, (top, height) => {
    const safe = measurable(height);
    return [top + safe, { top, height: safe }];
  })[1];

export const pinnedHeaders = (
  heights: ReadonlyArray<number>,
  offsetY: number,
  headerHeight: number,
): ReadonlyArray<PinnedHeaderFrame> => {
  const header = headerHeightOf(Option.some(headerHeight));
  const offset = Number.isFinite(offsetY) ? Math.min(0, offsetY) : 0;
  return Arr.map(sectionBands(heights), ({ top, height }, index) => {
    const natural = top + offset;
    const bottom = top + height + offset;
    const painted = Math.min(Math.max(natural, 0), bottom - header);
    return {
      index,
      top: tenth(painted),
      pinned: natural < 0,
      visible: height > 0 && painted + header > 0,
    };
  });
};
