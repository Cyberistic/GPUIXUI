/**
 * `FileUpload`: a queue of files, each with a lifecycle, progress, retry and
 * remove.
 *
 * The component owns only the queue and the state machine (`upload/queue.ts`);
 * the transfer is the caller's `upload(file, onProgress)`, which resolves on
 * success and rejects on failure. Files are added through the controlled `files`
 * prop and auto-started; an errored file retries, and a remove drops the file
 * and cancels its attempt — a late progress or completion report for the removed
 * file's token is a no-op, so nothing can resurrect a removed row.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { Progress } from "@gpuixui/primitives";
import { Button, IconButton } from "@gpuixui/primitives/button";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { recipeStyle, useTheme, type Theme } from "./internal.js";
import {
  complete,
  emptyQueue,
  enqueue,
  fail,
  findItem,
  remove,
  reportProgress,
  start,
  type UploadFile,
  type UploadItem,
  type UploadQueue,
} from "./upload/queue.js";

/** The caller's transfer: resolve on success, reject on failure. */
export type UploadFunction = (
  file: UploadFile,
  onProgress: (progress: number) => void,
) => Promise<void>;

/** {@link FileUpload} props. */
export interface FileUploadProps extends Omit<Props, "children"> {
  /** The transfer, called once per file with a `0…1` progress reporter. */
  readonly upload: UploadFunction;
  /** The files to upload. Adding a new id starts it; removing drops it. */
  readonly files: ReadonlyArray<UploadFile>;
  /** Called when the reader removes a row, so the caller drops it from `files`. */
  readonly onRemoveFile?: (id: string) => void;
  /** The list's accessible name. Default `"Upload files"`. */
  readonly label?: string;
  /** Shown when `files` is empty. Default `"No files"`. */
  readonly emptyLabel?: string;
  /** The retry action's label. Default `"Retry"`. */
  readonly retryLabel?: string;
  /** The remove action's name prefix. Default `"Remove"`. */
  readonly removeLabel?: string;
  readonly className?: string;
}

/** The actions each row's controls call. */
export interface FileUploadActions {
  readonly onRetry: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

const percent = (progress: number): number => Math.round(progress * 100);

const statusGlyph = (item: UploadItem, theme: Theme): ReactElement | null =>
  Match.value(item.status).pipe(
    Match.when("idle", () => (
      <Icon name="file" color={theme.colors.mutedForeground} />
    )),
    Match.when("uploading", () => null),
    Match.when("done", () => (
      <Icon name="check" color={theme.colors.success} />
    )),
    Match.when("error", () => (
      <Icon name="error" color={theme.colors.destructive} />
    )),
    Match.exhaustive,
  );

const renderRow = (
  item: UploadItem,
  theme: Theme,
  actions: FileUploadActions,
  retryLabel: string,
  removeLabel: string,
): ReactElement => (
  <div
    key={item.id}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
      }}
    >
      {statusGlyph(item, theme)}
      <text style={{ flexGrow: 1, color: theme.colors.foreground }}>
        {item.name}
      </text>
      {item.status === "error" ? (
        <Button
          variant="secondary"
          size="sm"
          testId={`upload-retry-${item.id}`}
          onActivate={() => actions.onRetry(item.id)}
        >
          {retryLabel}
        </Button>
      ) : null}
      <IconButton
        label={`${removeLabel} ${item.name}`}
        testId={`upload-remove-${item.id}`}
        onActivate={() => actions.onRemove(item.id)}
        icon={<Icon name="trash" color={theme.colors.mutedForeground} />}
      />
    </div>
    {item.status === "uploading" ? (
      <Progress
        value={percent(item.progress)}
        label={`Uploading ${item.name}`}
      />
    ) : null}
  </div>
);

/** The element `FileUpload` renders. Pure in its arguments. */
export const renderFileUpload = (
  props: FileUploadProps,
  theme: Theme,
  items: ReadonlyArray<UploadItem>,
  actions: FileUploadActions,
): ReactElement => {
  const {
    label = "Upload files",
    emptyLabel = "No files",
    retryLabel = "Retry",
    removeLabel = "Remove",
    className,
    style,
    ...rest
  } = props;

  return (
    <div
      {...rest}
      role="group"
      aria-label={label}
      style={mergeStyles(
        recipeStyle(cn("flex flex-col gap-2", className), theme),
        style,
      )}
    >
      {Arr.match(items, {
        onEmpty: () => (
          <text style={{ color: theme.colors.mutedForeground }}>
            {emptyLabel}
          </text>
        ),
        onNonEmpty: (rows) =>
          Arr.map(rows, (item) =>
            renderRow(item, theme, actions, retryLabel, removeLabel),
          ),
      })}
    </div>
  );
};

/** A file queue that owns the lifecycle; the transfer is the caller's. */
export const FileUpload = (props: FileUploadProps): ReactElement => {
  const theme = useTheme();
  const { upload, files, onRemoveFile } = props;
  const [queue, setQueue] = useState<UploadQueue>(emptyQueue);

  const launch = useCallback(
    (item: UploadItem): void => {
      upload({ id: item.id, name: item.name }, (progress) =>
        setQueue((current) =>
          reportProgress(current, item.id, item.token, progress),
        ),
      ).then(
        () => setQueue((current) => complete(current, item.id, item.token)),
        () => setQueue((current) => fail(current, item.id, item.token)),
      );
    },
    [upload],
  );

  useEffect(() => {
    const retained = Arr.filter(queue, (item) =>
      Arr.some(files, (file) => file.id === item.id),
    );
    const seeded = enqueue(retained, files);
    const idle = Arr.filter(seeded, (item) => item.status === "idle");
    const started = Arr.reduce(idle, seeded, (state, item) =>
      start(state, item.id),
    );
    setQueue(started);
    Arr.forEach(idle, (item) => {
      Option.match(findItem(started, item.id), {
        onNone: () => undefined,
        onSome: (after) => launch(after),
      });
    });
  }, [files, launch]);

  const retry = (id: string): void => {
    const before = findItem(queue, id);
    const started = start(queue, id);
    setQueue(started);
    Option.match(findItem(started, id), {
      onNone: () => undefined,
      onSome: (after) => {
        if (Option.exists(before, (item) => after.token > item.token)) {
          launch(after);
        }
      },
    });
  };

  const removeFile = (id: string): void => {
    setQueue(remove(queue, id));
    onRemoveFile?.(id);
  };

  return renderFileUpload(props, theme, queue, {
    onRetry: retry,
    onRemove: removeFile,
  });
};
