import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { captureCaption } from "./captures";

/**
 * Guards the screenshot sidecar boundary (plan 412). `captures.ts` is plain
 * data in the browser bundle, so nothing there can reject a malformed
 * `provenance.json`; the sidecar is decoded here, at the test boundary, and a
 * bad file fails the suite instead of rendering a caption built from
 * `undefined`.
 */

class CaptureProvenanceFile extends Schema.Class<CaptureProvenanceFile>(
  "CaptureProvenanceFile",
)({
  platform: Schema.NonEmptyString,
  gpuixVersion: Schema.NonEmptyString,
  commit: Schema.NonEmptyString,
  command: Schema.NonEmptyString,
  capturedAt: Schema.NonEmptyString,
  kind: Schema.optional(Schema.Literals(["still", "interaction"])),
}) {}

const decodeSidecar = Schema.decodeUnknownSync(
  Schema.fromJsonString(CaptureProvenanceFile),
);

const appRoot = fileURLToPath(new URL("../../..", import.meta.url));
const screenshotsRoot = join(appRoot, "public", "screenshots");

/** Every `provenance.json` under `public/screenshots` the capture script wrote. */
const sidecars = existsSync(screenshotsRoot)
  ? readdirSync(screenshotsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const sidecar = join(screenshotsRoot, entry.name, "provenance.json");
        return existsSync(sidecar) ? [{ directory: entry.name, sidecar }] : [];
      })
  : [];

const valid = {
  platform: "darwin-x64",
  gpuixVersion: "0.10.0",
  commit: "abc1234",
  command: "nub run playground:capture",
  capturedAt: "2026-10-17T08:00:00.000Z",
};

describe("capture sidecars", () => {
  it("decodes the shape the capture script writes, with no kind for a still", () => {
    const decoded = decodeSidecar(JSON.stringify(valid));
    expect(decoded.platform).toBe("darwin-x64");
    expect(decoded.kind).toBeUndefined();
  });

  it("rejects a sidecar missing a caption field", () => {
    expect(() =>
      decodeSidecar(JSON.stringify({ platform: "darwin-x64" })),
    ).toThrow();
  });

  it("rejects a capture kind the site does not label", () => {
    expect(() =>
      decodeSidecar(JSON.stringify({ ...valid, kind: "video" })),
    ).toThrow();
  });

  it("labels a decoded interaction sidecar as recorded", () => {
    const decoded = decodeSidecar(
      JSON.stringify({ ...valid, kind: "interaction" }),
    );
    expect(captureCaption(decoded)).toBe(
      "Recorded in GPUix — darwin-x64, GPUix 0.10.0, abc1234",
    );
  });

  it("decodes every real sidecar and proves the image the registry lists", () => {
    const malformed = sidecars.flatMap(({ directory, sidecar }) => {
      try {
        decodeSidecar(readFileSync(sidecar, "utf8"));
        return [];
      } catch {
        return [`screenshots/${directory}/provenance.json is malformed`];
      }
    });

    const unproven = components.flatMap((component) =>
      component.screenshots.flatMap((screenshot) => {
        const image = join(appRoot, "public", screenshot);
        const sidecar = join(
          appRoot,
          "public",
          dirname(screenshot),
          "provenance.json",
        );
        return existsSync(image) && existsSync(sidecar)
          ? []
          : [`${component.slug}: ${screenshot} has no image or sidecar`];
      }),
    );

    expect({ malformed, unproven }).toEqual({ malformed: [], unproven: [] });
  });
});
