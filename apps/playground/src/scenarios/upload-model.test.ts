/**
 * Guards the file-upload queue rules (plan `388`).
 *
 * The bugs these catch: a second row for the same path, a rejected type or an
 * oversized file slipping into the queue, a click guard that swallows the real
 * click after a drop (measured wrong in plan 388), progress regressing after a
 * cancel, a retry that keeps the old fill, an unknown size counted as zero
 * bytes, and a summary that ignores a row.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  ACCEPTED,
  MAX_BYTES,
  act,
  actionLabel,
  addFiles,
  cancel,
  clickZone,
  complete,
  extensionOf,
  fail,
  fileNameOf,
  findFile,
  formatBytes,
  initial,
  isAccepted,
  noteDrop,
  retry,
  setProgress,
  start,
  summary,
} from "./upload-model.js";
import type { DroppedFile } from "./upload-model.js";

const report: DroppedFile = {
  path: "/tmp/report.png",
  bytes: Option.some(2_048),
};
const data: DroppedFile = {
  path: "/tmp/data.csv",
  bytes: Option.some(1_536_000),
};

const queued = addFiles(initial, [report, data]);
const one = { ...queued, files: Arr.take(queued.files, 1) };

describe("fileNameOf", () => {
  it("keeps the last segment of a path", () => {
    expect(fileNameOf("/tmp/dir/report.png")).toBe("report.png");
    expect(fileNameOf("report.png")).toBe("report.png");
    expect(fileNameOf("/tmp/archive/")).toBe("archive");
  });

  it("falls back to the path when it has no segment", () => {
    expect(fileNameOf("/")).toBe("/");
  });
});

describe("extensionOf", () => {
  it("is the last dot after the last slash, lower-cased", () => {
    expect(extensionOf("/tmp/notes.TXT")).toBe(".txt");
    expect(extensionOf("/tmp/a.tar.gz")).toBe(".gz");
    expect(extensionOf("/tmp/README")).toBe("");
  });

  it("accepts only the declared extensions, case-insensitively", () => {
    expect(Arr.contains(ACCEPTED, extensionOf("/tmp/a.png"))).toBe(true);
    expect(isAccepted("/tmp/a.PNG")).toBe(true);
    expect(isAccepted("/tmp/a.exe")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("uses the 1024 base and one decimal below ten", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2_048)).toBe("2.0 KB");
    expect(formatBytes(15_360)).toBe("15 KB");
    expect(formatBytes(3_400_000)).toBe("3.2 MB");
  });
});

describe("addFiles", () => {
  it("maps a dropped path and keeps an unknown size unknown", () => {
    expect(Arr.map(queued.files, (file) => file.name)).toEqual([
      "report.png",
      "data.csv",
    ]);
    expect(Option.isSome(queued.files[0]?.bytes ?? Option.none())).toBe(true);
    const unstatted = addFiles(queued, [
      { path: "/tmp/notes.txt", bytes: Option.none() },
    ]);
    expect(Option.isNone(unstatted.files[2]?.bytes ?? Option.some(0))).toBe(
      true,
    );
  });

  it("refuses a duplicate path and counts it", () => {
    const twice = addFiles(queued, [report]);
    expect(Arr.length(twice.files)).toBe(2);
    expect(twice.duplicates).toBe(1);
    expect(twice.last).toBe("duplicate");
  });

  it("refuses a type and an oversized known file before adding them", () => {
    const refused = addFiles(queued, [
      { path: "/tmp/tool.exe", bytes: Option.some(10) },
      { path: "/tmp/huge.png", bytes: Option.some(MAX_BYTES + 1) },
    ]);
    expect(Arr.length(refused.files)).toBe(2);
    expect(refused.rejected).toEqual(["tool.exe: type", "huge.png: size"]);
    expect(refused.last).toBe("rejected");
  });

  it("dedupes inside one batch", () => {
    const batch = addFiles(initial, [report, report]);
    expect(Arr.length(batch.files)).toBe(1);
    expect(batch.duplicates).toBe(1);
  });
});

describe("clickZone", () => {
  it("opens the picker for a click after a drop", () => {
    const dropped = noteDrop(initial);
    const clicked = clickZone(dropped);
    expect(clicked.clicks).toBe(1);
    expect(clicked.picker).toBe(1);
    expect(clicked.last).toBe("picker");
  });

  it("counts every click and event independently", () => {
    const twice = clickZone(clickZone(noteDrop(initial)));
    expect(twice.clicks).toBe(2);
    expect(twice.picker).toBe(2);
    expect(twice.events).toBe(1);
  });
});

describe("progress", () => {
  it("clamps a progress report and refuses a settled row", () => {
    const uploading = start(queued, 0);
    expect(setProgress(uploading, 0, 140).files[0]?.progress).toBe(100);
    expect(setProgress(uploading, 0, -20).files[0]?.progress).toBe(0);

    const done = complete(start(uploading, 0), 0);
    expect(setProgress(done, 0, 40).files[0]?.progress).toBe(100);
  });

  it("freezes the fill on cancel and resets it on retry", () => {
    const uploading = start(queued, 0);
    const canceled = cancel(setProgress(uploading, 0, 40), 0);
    expect(canceled.files[0]?.status).toBe("canceled");
    expect(canceled.files[0]?.progress).toBe(40);

    const retried = retry(canceled, 0);
    expect(retried.files[0]?.status).toBe("queued");
    expect(retried.files[0]?.progress).toBe(0);
  });

  it("keeps progress on failure and recovers on retry", () => {
    const failed = fail(setProgress(start(queued, 1), 1, 60), 1);
    expect(failed.files[1]?.status).toBe("error");
    expect(failed.files[1]?.progress).toBe(60);

    const retried = retry(failed, 1);
    expect(retried.files[1]?.status).toBe("queued");
    expect(retried.files[1]?.progress).toBe(0);
  });
});

describe("summary", () => {
  it("counts a canceled row's frozen progress and only known bytes", () => {
    const done = complete(start(queued, 0), 0);
    const canceled = cancel(setProgress(start(done, 1), 1, 40), 1);
    const footer = summary(canceled);
    expect(footer.total).toBe(2);
    expect(footer.done).toBe(1);
    expect(footer.bytes).toBe(2_048 + 1_536_000);
    expect(footer.percent).toBe(70);
  });

  it("is empty for an empty queue", () => {
    expect(summary(initial)).toEqual({
      total: 0,
      done: 0,
      bytes: 0,
      percent: 0,
    });
  });
});

describe("findFile and act", () => {
  it("finds a row by id and reports absence", () => {
    expect(Option.map(findFile(queued, 1), (file) => file.name)).toEqual(
      Option.some("data.csv"),
    );
    expect(Option.isNone(findFile(queued, 99))).toBe(true);
    expect(one.files[0]?.id).toBe(0);
  });

  it("runs the row's single action", () => {
    expect(act(queued, 0).files[0]?.status).toBe("uploading");
    expect(act(act(queued, 0), 0).files[0]?.status).toBe("canceled");
    expect(act(act(act(queued, 0), 0), 0).files[0]?.status).toBe("queued");
  });

  it("shows no action on a done row", () => {
    const done = complete(start(queued, 0), 0);
    expect(Option.flatMap(findFile(done, 0), actionLabel)).toEqual(
      Option.none(),
    );
    expect(
      Option.getOrElse(
        Option.flatMap(findFile(queued, 0), actionLabel),
        () => "none",
      ),
    ).toBe("Start");
  });
});
