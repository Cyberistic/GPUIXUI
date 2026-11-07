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
