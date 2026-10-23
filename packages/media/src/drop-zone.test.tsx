/**
 * `DropZone` — the drop payload, the pointer highlight, the pick action.
 *
 * The bug guarded: `onFileDrop` hands the zone absolute paths, and the zone must
 * report them to `onDrop` as `{ files }` with a basename each, never as the raw
 * path array. A zone disabled while the pointer was over it also kept
 * advertising a drop: the paint read the hover flag regardless of `disabled` and
 * the leave handler was gated on `!disabled`, so the flag survived a pointer
 * that left during the disabled window. The negative controls are the disabled
 * zone (which must refuse a drop) and the resting vs. hovered border (the
 * highlight is a real, distinct state). A blank label or pick label reads as
 * its documented default, so neither the group nor the fallback route is left
 * unnamed.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { renderDropZone, type DropPayload } from "./drop-zone.js";
import {
  elementHandler,
  elementProp,
  findByTestId,
  hostHandler,
  hostStyleString,
  expectSome,
  textElements,
} from "./testing/element.js";

const noop = (): void => undefined;

const surface = (hovered: boolean) => ({
  hovered,
  onEnter: noop,
  onLeave: noop,
});

describe("DropZone", () => {
  it("reports the dropped paths as { files } with basenames", () => {
    let dropped: DropPayload | undefined;
    const root = renderDropZone(
      {
        label: "Drop files",
        onDrop: (payload) => {
          dropped = payload;
        },
      },
      lightTheme,
      surface(false),
    );
    const handler = expectSome(hostHandler(root, "onFileDrop"));
    handler({
      paths: ["/tmp/alpha.txt", "/tmp/beta.png"],
      elementId: 1,
      eventType: "fileDrop",
    });
    expect(dropped).toStrictEqual({
      files: [
        { path: "/tmp/alpha.txt", name: "alpha.txt" },
        { path: "/tmp/beta.png", name: "beta.png" },
      ],
    });
  });

  it("reads a Windows path's own name, not the whole path", () => {
    let dropped: DropPayload | undefined;
    const root = renderDropZone(
      {
        label: "Drop files",
        onDrop: (payload) => {
          dropped = payload;
        },
      },
      lightTheme,
      surface(false),
    );
    const handler = expectSome(hostHandler(root, "onFileDrop"));
    handler({
      paths: ["C:\\Users\\ada\\notes.txt", "C:\\Users\\ada\\photos\\"],
      elementId: 1,
      eventType: "fileDrop",
    });
    expect(dropped).toStrictEqual({
      files: [
        { path: "C:\\Users\\ada\\notes.txt", name: "notes.txt" },
        { path: "C:\\Users\\ada\\photos\\", name: "photos" },
      ],
    });
  });

  it("highlights the zone while the pointer is over it", () => {
    const resting = renderDropZone(
      { label: "Drop files", onDrop: noop },
      lightTheme,
      surface(false),
    );
    const hovered = renderDropZone(
      { label: "Drop files", onDrop: noop },
      lightTheme,
      surface(true),
    );
    expect(hostStyleString(resting, "borderColor")).toStrictEqual(
      Option.some(lightTheme.colors.borderStrong),
    );
    expect(hostStyleString(hovered, "borderColor")).toStrictEqual(
      Option.some(lightTheme.colors.ring),
    );
  });

  it("routes the pick action to the caller's picker", () => {
    let picked = false;
    const root = renderDropZone(
      {
        label: "Drop files",
        onDrop: noop,
        onPick: () => {
          picked = true;
        },
      },
      lightTheme,
      surface(false),
    );
    expectSome(
      elementHandler(
        expectSome(findByTestId(root, "drop-zone-pick")),
        "onActivate",
      ),
    )({});
    expect(picked).toBe(true);
  });

  it("reads a blank zone label as the documented default", () => {
    // The label is both the visible headline and the group's accessible name,
    // so a blank i18n row painted an empty line and published an unnamed group.
    const blank = renderDropZone(
      { label: "  ", onDrop: noop },
      lightTheme,
      surface(false),
    );
    expect(elementProp(blank, "aria-label")).toEqual(Option.some("Drop files"));
    expect(
      Arr.map(textElements(blank), (line) => elementProp(line, "children")),
    ).toEqual([Option.some("Drop files")]);
  });

  it("reads a blank pick label as the documented default", () => {
    // The pick label came from a copy table, so an empty string reached the
    // action's text and left the one reliable route on a drop-less host unnamed.
    const root = renderDropZone(
      {
        label: "Drop files",
        onDrop: noop,
        onPick: noop,
        pickLabel: "   ",
      },
      lightTheme,
      surface(false),
    );
    expect(
      expectSome(
        elementProp(
          expectSome(findByTestId(root, "drop-zone-pick")),
          "children",
        ),
      ),
    ).toBe("Choose files");
  });

  it("refuses a drop while disabled", () => {
    let dropped = false;
    const root = renderDropZone(
      {
        label: "Drop files",
        onDrop: () => {
          dropped = true;
        },
        disabled: true,
      },
      lightTheme,
      surface(false),
    );
    expectSome(hostHandler(root, "onFileDrop"))({
      paths: ["/tmp/a.txt"],
      elementId: 1,
      eventType: "fileDrop",
    });
    expect(dropped).toBe(false);
  });

  it("paints a disabled zone at rest even while the hover flag is set", () => {
    const disabled = renderDropZone(
      { label: "Drop files", onDrop: noop, disabled: true },
      lightTheme,
      surface(true),
    );
    expect(hostStyleString(disabled, "borderColor")).toStrictEqual(
      Option.some(lightTheme.colors.borderStrong),
    );
    expect(hostStyleString(disabled, "backgroundColor")).toStrictEqual(
      Option.some(lightTheme.colors.muted),
    );
    // The negative control: the same flag on an enabled zone is the highlight.
    const enabled = renderDropZone(
      { label: "Drop files", onDrop: noop },
      lightTheme,
      surface(true),
    );
    expect(hostStyleString(enabled, "backgroundColor")).toStrictEqual(
      Option.some(lightTheme.colors.accent),
    );
  });

  it("clears a hover that ends while the zone is disabled", () => {
    const entered = vi.fn();
    const left = vi.fn();
    const root = renderDropZone(
      { label: "Drop files", onDrop: noop, disabled: true },
      lightTheme,
      { hovered: false, onEnter: entered, onLeave: left },
    );
    expectSome(hostHandler(root, "onMouseEnter"))({
      elementId: 1,
      eventType: "mouseEnter",
    });
    expectSome(hostHandler(root, "onMouseLeave"))({
      elementId: 1,
      eventType: "mouseLeave",
    });
    expect(entered).not.toHaveBeenCalled();
    expect(left).toHaveBeenCalledTimes(1);
  });

  it("paints no description line for a description that arrived blank", () => {
    // The bug guarded: `description === undefined` covered only an absent prop,
    // so a description an i18n table never filled laid out a full blank line
    // under the zone's label (a run of spaces is 16px on the pinned runtime),
    // while the wizard's step description already read a blank as absence.
    Arr.forEach(["", "   ", "\t\n"], (value) => {
      const root = renderDropZone(
        { label: "Drop files", onDrop: noop, description: value },
        lightTheme,
        surface(false),
      );
      expect(
        Arr.map(textElements(root), (line) => elementProp(line, "children")),
      ).toStrictEqual([Option.some("Drop files")]);
    });
    // The negative control: a real description is painted exactly as written.
    const described = renderDropZone(
      {
        label: "Drop files",
        onDrop: noop,
        description: "  Up to 2 MB  ",
      },
      lightTheme,
      surface(false),
    );
    expect(
      Arr.map(textElements(described), (line) => elementProp(line, "children")),
    ).toStrictEqual([Option.some("Drop files"), Option.some("  Up to 2 MB  ")]);
  });
});
