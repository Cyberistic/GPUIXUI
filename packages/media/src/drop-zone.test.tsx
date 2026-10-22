/**
 * `DropZone` — the drop payload, the pointer highlight, the pick action.
 *
 * The bug guarded: `onFileDrop` hands the zone absolute paths, and the zone must
 * report them to `onDrop` as `{ files }` with a basename each, never as the raw
 * path array. The negative controls are the disabled zone (which must refuse a
 * drop) and the resting vs. hovered border (the highlight is a real, distinct
 * state).
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { renderDropZone, type DropPayload } from "./drop-zone.js";
import {
  elementHandler,
  findByTestId,
  hostHandler,
  hostStyleString,
  expectSome,
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
});
