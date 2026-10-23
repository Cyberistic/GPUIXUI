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
  type UploadQueue,
} from "@gpuixui/media/upload/queue";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Match } from "effect";
import { useEffect, useState } from "react";

/**
 * Browser preview for the FileUpload page.
 *
 * The native queue is a pure state machine and the transfer is the caller's, so
 * the preview plays the caller: it seeds the queue with the three states a
 * reader needs to see (`uploading`, `done`, `error`), advances the transfer
 * through the package's own `reportProgress`/`complete`, retries through
 * `start` and drops through `remove`. Nothing here invents a lifecycle the
 * package does not have.
 */

/** The files the preview queues, with the states it opens on. */
export const UPLOAD_FILES: ReadonlyArray<UploadFile> = [
  { id: "screenshot", name: "screenshot.png" },
  { id: "report", name: "report.pdf" },
  { id: "notes", name: "release-notes.md" },
];

/** A step of the simulated transfer: one tick asks for this much more. */
export const UPLOAD_STEP = 0.2;

const tokenOf = (state: UploadQueue, id: string): Option.Option<number> =>
  Option.map(findItem(state, id), (item) => item.token);

const at = (
  state: UploadQueue,
  id: string,
  token: number,
  progress: number,
): UploadQueue => reportProgress(state, id, token, progress);

/** The three states the page opens on, built through the queue's own API. */
export const initialQueue = (): UploadQueue => {
  const seeded = enqueue(emptyQueue, UPLOAD_FILES);
  const uploading = start(seeded, "screenshot");
  const reported = Option.match(tokenOf(uploading, "screenshot"), {
    onNone: () => uploading,
    onSome: (token) => at(uploading, "screenshot", token, 0.6),
  });
  const failing = start(reported, "report");
  const errored = Option.match(tokenOf(failing, "report"), {
    onNone: () => failing,
    onSome: (token) => fail(failing, "report", token),
  });
  const finishing = start(errored, "notes");
  return Option.match(tokenOf(finishing, "notes"), {
    onNone: () => finishing,
    onSome: (token) => complete(finishing, "notes", token),
  });
};

/** One transfer tick: every uploading file advances, and a full one completes. */
export const advanceUploads = (
  state: UploadQueue,
  step: number = UPLOAD_STEP,
): UploadQueue => {
  if (!Arr.some(state.items, (item) => item.status === "uploading")) {
    return state;
  }
  return Arr.reduce(state.items, state, (queue, item) => {
    if (item.status !== "uploading") return queue;
    const next = item.progress + step;
    return next >= 1
      ? complete(queue, item.id, item.token)
      : reportProgress(queue, item.id, item.token, next);
  });
};

/** The next file a "queue another" press adds, so the preview stays alive. */
const BATCH: UploadFile = { id: "batch", name: "batch-2026-10-24.zip" };

export const EXTRA_FILES: ReadonlyArray<UploadFile> = [
  BATCH,
  { id: "cover", name: "cover-art.png" },
];

const glyph = (status: string): string =>
  Match.value(status).pipe(
    Match.when("done", () => "✓"),
    Match.when("error", () => "!"),
    Match.when("uploading", () => "↑"),
    Match.orElse(() => "•"),
  );

export const FileUploadDemo = () => {
  const [queue, setQueue] = useState(initialQueue);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    const tick = setInterval(
      () => setQueue((current) => advanceUploads(current)),
      200,
    );
    return () => clearInterval(tick);
  }, []);

  const next = Option.getOrElse(
    Arr.get(EXTRA_FILES, added % EXTRA_FILES.length),
    () => BATCH,
  );

  return (
    <div className="gx-demo-column gx-upload-demo">
      <div aria-label="Upload files" className="gx-upload" role="group">
        {queue.items.map((item) => (
          <div className="gx-upload-row" key={item.id}>
            <div className="gx-upload-line">
              <span
                aria-hidden="true"
                className="gx-upload-glyph"
                data-status={item.status}
              >
                {glyph(item.status)}
              </span>
              <span className="gx-upload-name">{item.name}</span>
              {item.status === "error" ? (
                <button
                  className="gx-btn gx-btn-secondary gx-btn-sm"
                  onClick={() =>
                    Option.match(findItem(queue, item.id), {
                      onNone: () => undefined,
                      onSome: (held) =>
                        setQueue((current) => start(current, held.id)),
                    })
                  }
                  type="button"
                >
                  Retry
                </button>
              ) : null}
              <button
                aria-label={`Remove ${item.name}`}
                className="gx-upload-remove"
                onClick={() => setQueue((current) => remove(current, item.id))}
                type="button"
              >
                ×
              </button>
            </div>
            {item.status === "uploading" ? (
              <span
                aria-label={`Uploading ${item.name}`}
                aria-valuetext={`${Math.round(item.progress * 100)}%`}
                className="gx-meter"
                role="progressbar"
              >
                <span className="gx-meter-track">
                  <span
                    className="gx-meter-fill"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <button
        className="gx-btn gx-btn-outline gx-btn-sm"
        onClick={() => {
          setQueue((current) =>
            start(
              enqueue(current, [
                { id: `${next.id}-${added}`, name: next.name },
              ]),
              `${next.id}-${added}`,
            ),
          );
          setAdded((count) => count + 1);
        }}
        type="button"
      >
        Queue another file
      </button>
    </div>
  );
};

export const fileUploadDemoSource = `import { FileUpload, type UploadFunction } from "@gpuixui/media";

const upload: UploadFunction = async (file, onProgress) => {
  await transfer(file.path, (fraction) => onProgress(fraction));
};

<FileUpload
  upload={upload}
  files={files}
  onRemoveFile={(id) => setFiles(files.filter((file) => file.id !== id))}
/>;`;
