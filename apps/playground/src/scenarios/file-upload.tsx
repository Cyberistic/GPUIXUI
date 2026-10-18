/**
 * `file-upload` — a file-upload queue over real file drops (plan `388`).
 *
 * A drop carries absolute paths and nothing else. This probe records what that
 * means for a drop zone: a drop reaches the nearest handler once, a handled
 * zone receives no trailing click (so a click guard is harmful — it swallows
 * the next real click), and a row's progress/cancel/retry is model state rather
 * than a host behaviour.
 *
 * The OS picker (`promptForPaths`) is deliberately not called: it blocks on the
 * platform panel and this suite has no automation verb for it. The probe stops
 * at "the zone requested the picker once", which is the app boundary.
 *
 * Measured 2026-10-18: a drop goes to the **nearest** handler once — a child
 * without a handler lets the zone's handler run, while a child with its own
 * handler receives the drop alone. That is the opposite of `hover`, which is
 * per element (plan `335`), and it means one zone handler covers plain content
 * but a nested drop target must add the file itself.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Props } from "@gpuix/react";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";
import { node, read, readoutField, treeOf } from "./probes.js";
import {
  act,
  actionLabel,
  addFiles,
  clickZone,
  complete,
  fail,
  findFile,
  formatBytes,
  initial,
  noteDrop,
  retry,
  setProgress,
  summary,
} from "./upload-model.js";
import type { DroppedFile, UploadFile, UploadState } from "./upload-model.js";

const TRACK = 240;
const STEP = 20;

/** The app's `stat` boundary: only these two paths have a known size. */
const SIZES: Readonly<Record<string, number>> = {
  "/tmp/report.png": 2_048,
  "/tmp/data.csv": 1_536_000,
};

const bytesFor = (path: string): Option.Option<number> =>
  Option.fromNullishOr(SIZES[path]);

const dropped = (path: string): DroppedFile => ({
  path,
  bytes: bytesFor(path),
});

const sizeText = (file: UploadFile): string =>
  Option.match(file.bytes, {
    onNone: () => "size=unknown",
    onSome: (bytes) => formatBytes(bytes),
  });

const ActionButton = ({
  file,
  onAct,
}: {
  readonly file: UploadFile;
  readonly onAct: () => void;
}) => {
  const theme = useTheme();
  const label = Option.getOrElse(actionLabel(file), () => "");
  return (
    <div
      testId={`upload-action-${file.id}`}
      role="button"
      aria-label={`${label} ${file.name}`}
      tabIndex={0}
      onClick={onAct}
      style={{
        padding: 4,
        borderRadius: theme.radius.sm,
        cursor: "pointer",
        backgroundColor: theme.colors.muted,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <text style={{ fontSize: 11, color: theme.colors.foreground }}>
        {label}
      </text>
    </div>
  );
};

const UploadProbe = () => {
  const theme = useTheme();
  const [state, setState] = useState<UploadState>(initial);
  const [inner, setInner] = useState(0);

  const receive = (paths: ReadonlyArray<string>): void =>
    setState((current) => addFiles(noteDrop(current), Arr.map(paths, dropped)));

  const step = (id: number): void =>
    setState((current) =>
      Option.match(findFile(current, id), {
        onNone: () => current,
        onSome: (file) =>
          file.progress + STEP >= 100
            ? complete(current, id)
            : setProgress(current, id, file.progress + STEP),
      }),
    );

  const zone: Props = {
    testId: "upload-zone",
    role: "button",
    "aria-label": "Drop files or choose",
    tabIndex: 0,
    onClick: () => setState(clickZone),
    onFileDrop: (event) =>
      receive(Option.getOrElse(Option.fromNullishOr(event.paths), () => [])),
  };

  const footer = summary(state);

  return (
    <div
      style={{
        width: 680,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        {...zone}
        style={{
          width: 640,
          height: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: theme.colors.muted,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          cursor: "pointer",
        }}
      >
        <text
          testId="upload-hint"
          style={{ fontSize: 13, color: theme.colors.foreground }}
        >
          Drop files here or click to choose
        </text>
        <div
          testId="upload-inner"
          onFileDrop={() => setInner((count) => count + 1)}
          style={{
            width: 120,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.card,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
            inner target
          </text>
        </div>
      </div>

      <div
        testId="upload-summary"
        role="status"
        aria-label="Upload summary"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <text style={{ fontSize: 12, color: theme.colors.foreground }}>
          {`${footer.total} files · ${footer.done} done · ${formatBytes(footer.bytes)} · ${footer.percent}%`}
        </text>
      </div>

      <Readout testId="upload-rejected">
        {Arr.length(state.rejected) === 0
          ? ""
          : `rejected: ${Arr.join(state.rejected, ", ")}`}
      </Readout>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {Arr.map(state.files, (file) => (
          <div
            key={file.id}
            testId={`upload-row-${file.id}`}
            style={{
              width: 640,
              height: 52,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 6,
              backgroundColor: theme.colors.card,
              borderWidth: theme.borderWidth.thin,
              borderColor:
                file.status === "error"
                  ? theme.colors.destructive
                  : theme.colors.border,
              borderRadius: theme.radius.sm,
            }}
          >
            <div
              style={{ width: 190, display: "flex", flexDirection: "column" }}
            >
              <text
                testId={`upload-name-${file.id}`}
                style={{ fontSize: 12, color: theme.colors.foreground }}
              >
                {file.name}
              </text>
              <text
                testId={`upload-size-${file.id}`}
                style={{ fontSize: 10, color: theme.colors.mutedForeground }}
              >
                {sizeText(file)}
              </text>
            </div>
            <text
              testId={`upload-status-${file.id}`}
              style={{
                width: 64,
                fontSize: 11,
                color: theme.colors.mutedForeground,
              }}
            >
              {file.status}
            </text>
            <div
              testId={`upload-track-${file.id}`}
              style={{
                width: TRACK,
                height: 6,
                borderRadius: 3,
                overflow: "hidden",
                backgroundColor: theme.colors.muted,
              }}
            >
              <div
                testId={`upload-fill-${file.id}`}
                style={{
                  width: (TRACK * file.progress) / 100,
                  height: 6,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </div>
            <div
              style={{ width: 56, display: "flex", justifyContent: "flex-end" }}
            >
              {file.status === "done" ? null : (
                <ActionButton
                  file={file}
                  onAct={() => setState((current) => act(current, file.id))}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Pressable testId="upload-step-0" onClick={() => step(0)}>
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            step 0
          </text>
        </Pressable>
        <Pressable testId="upload-step-1" onClick={() => step(1)}>
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            step 1
          </text>
        </Pressable>
        <Pressable
          testId="upload-fail-1"
          onClick={() => setState((current) => fail(current, 1))}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            fail 1
          </text>
        </Pressable>
        <Pressable
          testId="upload-retry-1"
          onClick={() => setState((current) => retry(current, 1))}
        >
          <text style={{ fontSize: 11, color: theme.colors.foreground }}>
            retry 1
          </text>
        </Pressable>
      </div>

      <Readout testId="upload-state">
        {`files=${footer.total} events=${state.events} clicks=${state.clicks} picker=${state.picker} dup=${state.duplicates} inner=${inner} last=${state.last}`}
      </Readout>
    </div>
  );
};

const stateOf = (ctx: Smoke.SmokeContext, key: string): string =>
  Option.getOrElse(readoutField(ctx, "upload-state", key), () => "missing");

const boundsOf = (ctx: Smoke.SmokeContext, testId: string) =>
  Option.fromNullishOr(ctx.host.bounds(testId));

const fillWidth = (ctx: Smoke.SmokeContext, id: number): number =>
  Option.getOrElse(
    Option.map(boundsOf(ctx, `upload-fill-${id}`), (bounds) => bounds.width),
    () => -1,
  );

export const fileUploadScenario: PlaygroundScenario = {
  id: "file-upload",
  title: "File upload: drop, progress, cancel, retry and the picker bound",
  capability: "upload",
  view: () => <UploadProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      // A real drop adds both paths; the runtime then delivers a click.
      ctx.host.fileDrop("upload-zone", ["/tmp/report.png", "/tmp/data.csv"]);
      yield* ctx.expectEqual(
        "the drop queued two files",
        stateOf(ctx, "files"),
        "2",
      );
      yield* ctx.expectEqual(
        "the drop is one event",
        stateOf(ctx, "events"),
        "1",
      );
      yield* ctx.expectEqual(
        "the drop carried two new paths and no duplicate",
        stateOf(ctx, "dup"),
        "0",
      );
      yield* ctx.expectEqual(
        "a drop does not request the picker",
        stateOf(ctx, "picker"),
        "0",
      );
      yield* ctx.expectEqual(
        "a drop on a handling zone delivers no click",
        stateOf(ctx, "clicks"),
        "0",
      );
      yield* ctx.expectContains(
        "the first row paints its name",
        read(ctx, "upload-name-0"),
        "report.png",
      );
      yield* ctx.expectContains(
        "the known size paints",
        read(ctx, "upload-size-0"),
        "2.0 KB",
      );
      yield* ctx.expectEqual(
        "a new row starts queued",
        read(ctx, "upload-status-0"),
        "queued",
      );

      // A real click on the zone's own surface opens the picker once.
      const zoneBounds = yield* ctx.expectSome(
        "the drop zone paints",
        boundsOf(ctx, "upload-zone"),
      );
      ctx.host.clickWindow(zoneBounds.x + 16, zoneBounds.y + 16);
      yield* ctx.expectEqual(
        "the real click reached the zone",
        stateOf(ctx, "clicks"),
        "1",
      );
      yield* ctx.expectEqual(
        "a real click opens the picker",
        stateOf(ctx, "picker"),
        "1",
      );
      ctx.host.clickWindow(zoneBounds.x + 16, zoneBounds.y + 16);
      yield* ctx.expectEqual(
        "the next click opens it again",
        stateOf(ctx, "picker"),
        "2",
      );

      // Duplicate, unknown size and a refused type.
      ctx.host.fileDrop("upload-zone", ["/tmp/report.png"]);
      yield* ctx.expectEqual(
        "a duplicate is not a row",
        stateOf(ctx, "files"),
        "2",
      );
      yield* ctx.expectEqual(
        "the duplicate event is refused",
        stateOf(ctx, "dup"),
        "1",
      );

      ctx.host.fileDrop("upload-zone", ["/tmp/notes.txt"]);
      yield* ctx.expectEqual(
        "an accepted path is a row",
        stateOf(ctx, "files"),
        "3",
      );
      yield* ctx.expectEqual(
        "an unstatted path has no size",
        read(ctx, "upload-size-2"),
        "size=unknown",
      );

      ctx.host.fileDrop("upload-zone", ["/tmp/tool.exe"]);
      yield* ctx.expectEqual(
        "a refused type adds no row",
        stateOf(ctx, "files"),
        "3",
      );
      yield* ctx.expectContains(
        "the refusal is painted",
        read(ctx, "upload-rejected"),
        "tool.exe: type",
      );

      // Row 0: 20% steps, then complete at 100%.
      ctx.host.click("upload-action-0");
      yield* ctx.expectEqual(
        "the action starts the row",
        read(ctx, "upload-status-0"),
        "uploading",
      );
      ctx.host.click("upload-step-0");
      yield* ctx.expectNear(
        "a 20% fill is 48 px of 240",
        fillWidth(ctx, 0),
        48,
        1,
      );
      ctx.host.click("upload-step-0");
      ctx.host.click("upload-step-0");
      ctx.host.click("upload-step-0");
      ctx.host.click("upload-step-0");
      yield* ctx.expectEqual(
        "the fifth step completes the row",
        read(ctx, "upload-status-0"),
        "done",
      );
      yield* ctx.expectNear(
        "a done row fills the track",
        fillWidth(ctx, 0),
        240,
        1,
      );
      yield* ctx.expectEqual(
        "a done row has no action",
        Option.isNone(boundsOf(ctx, "upload-action-0")),
        true,
      );

      // Row 1: 40%, cancel, frozen fill, retry, fail, retry.
      ctx.host.click("upload-action-1");
      ctx.host.click("upload-step-1");
      ctx.host.click("upload-step-1");
      yield* ctx.expectNear("a 40% fill is 96 px", fillWidth(ctx, 1), 96, 1);
      ctx.host.click("upload-action-1");
      yield* ctx.expectEqual(
        "cancel marks the row",
        read(ctx, "upload-status-1"),
        "canceled",
      );
      yield* ctx.expectNear(
        "cancel freezes the fill",
        fillWidth(ctx, 1),
        96,
        1,
      );

      ctx.host.click("upload-action-1");
      yield* ctx.expectEqual(
        "retry requeues the row",
        read(ctx, "upload-status-1"),
        "queued",
      );
      yield* ctx.expectNear("retry resets the fill", fillWidth(ctx, 1), 0, 1);

      ctx.host.click("upload-action-1");
      ctx.host.click("upload-fail-1");
      yield* ctx.expectEqual(
        "a failed row is an error",
        read(ctx, "upload-status-1"),
        "error",
      );
      yield* ctx.expectEqual(
        "an error row paints the destructive border",
        Option.getOrElse(
          Option.flatMap(
            Option.fromNullishOr(ctx.host.paintedStyle("upload-row-1")),
            (style) => style.borderColor,
          ),
          () => "none",
        ),
        palettes.dark.colors.destructive,
      );
      ctx.host.click("upload-action-1");
      yield* ctx.expectEqual(
        "the error row retries",
        read(ctx, "upload-status-1"),
        "queued",
      );

      // The derived footer.
      yield* ctx.expectContains(
        "the summary counts the rows",
        read(ctx, "upload-summary"),
        "3 files",
      );
      yield* ctx.expectContains(
        "the summary counts the done row",
        read(ctx, "upload-summary"),
        "1 done",
      );
      yield* ctx.expectContains(
        "the summary averages the frozen progress",
        read(ctx, "upload-summary"),
        "33%",
      );

      // A drop on the zone's own content: the hint has no handler, the inner
      // target records its own hit. The `events` delta is the bubbling answer.
      const beforeHint = stateOf(ctx, "events");
      ctx.host.fileDrop("upload-hint", ["/tmp/hint.txt"]);
      const afterHint = stateOf(ctx, "events");
      const beforeInner = stateOf(ctx, "events");
      ctx.host.fileDrop("upload-inner", ["/tmp/inner.txt"]);
      const afterInner = stateOf(ctx, "events");
      yield* ctx.expectEqual(
        "the inner target's own handler receives the drop",
        stateOf(ctx, "inner"),
        "1",
      );
      yield* ctx.expectEqual(
        "a drop on a handler-less child bubbles to the zone",
        Number(afterHint) - Number(beforeHint),
        1,
      );
      yield* ctx.expectEqual(
        "a drop on a handled child goes to that child only",
        Number(afterInner) - Number(beforeInner),
        0,
      );

      // Accessibility: the zone is a Button, the footer a Status.
      const tree = yield* treeOf(ctx);
      yield* node(ctx, tree, "Button", "Drop files or choose");
      yield* node(ctx, tree, "Status", "Upload summary");
      yield* node(ctx, tree, "Button", "Start notes.txt");
    }),
};
