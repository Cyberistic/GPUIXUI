/** @jsxImportSource @gpuix/react */
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
import { accessibleName } from "./name.js";
import {
  complete,
  emptyQueue,
  enqueue,
  fail,
  filesOf,
  findItem,
  remove,
  reportProgress,
  start,
  type UploadFile,
  type UploadItem,
  type UploadQueue,
} from "./upload/queue.js";

export type UploadFunction = (
  file: UploadFile,
  onProgress: (progress: number) => void,
) => Promise<void>;

export interface FileUploadProps extends Omit<Props, "children"> {
  readonly upload: UploadFunction;

  readonly files: ReadonlyArray<UploadFile>;

  readonly onRemoveFile?: (id: string) => void;

  readonly label?: string;

  readonly emptyLabel?: string;

  readonly retryLabel?: string;

  readonly removeLabel?: string;
  readonly className?: string;
}

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

export const renderFileUpload = (
  props: FileUploadProps,
  theme: Theme,
  items: ReadonlyArray<UploadItem>,
  actions: FileUploadActions,
): ReactElement => {
  const {
    label,
    emptyLabel,
    retryLabel,
    removeLabel,
    className,
    style,
    ...rest
  } = props;
  const name = accessibleName(label, "Upload files");
  const empty = accessibleName(emptyLabel, "No files");
  const retry = accessibleName(retryLabel, "Retry");
  const remove = accessibleName(removeLabel, "Remove");

  return (
    <div
      {...rest}
      role="group"
      aria-label={name}
      style={mergeStyles(
        recipeStyle(cn("flex flex-col gap-2", className), theme),
        style,
      )}
    >
      {Arr.match(items, {
        onEmpty: () => (
          <text style={{ color: theme.colors.mutedForeground }}>{empty}</text>
        ),
        onNonEmpty: (rows) =>
          Arr.map(rows, (item) =>
            renderRow(item, theme, actions, retry, remove),
          ),
      })}
    </div>
  );
};

export const FileUpload = (props: FileUploadProps): ReactElement => {
  const theme = useTheme();
  const { upload, files, onRemoveFile } = props;
  const [queue, setQueue] = useState<UploadQueue>(emptyQueue);

  const launch = useCallback(
    (item: UploadItem): void => {
      const attempt = Promise.resolve().then(() =>
        upload({ id: item.id, name: item.name }, (progress) =>
          setQueue((current) =>
            reportProgress(current, item.id, item.token, progress),
          ),
        ),
      );
      attempt.then(
        () => setQueue((current) => complete(current, item.id, item.token)),
        () => setQueue((current) => fail(current, item.id, item.token)),
      );
    },
    [upload],
  );

  useEffect(() => {
    const requested = filesOf(files);
    const retained = Arr.filter(queue.items, (item) =>
      Arr.some(requested, (file) => file.id === item.id),
    );
    const seeded = enqueue(
      { attempts: queue.attempts, items: retained },
      requested,
    );
    const idle = Arr.filter(seeded.items, (item) => item.status === "idle");
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

  return renderFileUpload(props, theme, queue.items, {
    onRetry: retry,
    onRemove: removeFile,
  });
};
