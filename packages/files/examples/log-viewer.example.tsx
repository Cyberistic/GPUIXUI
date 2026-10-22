/**
 * A log viewer over a stream of lines: filter by level, follow the tail, and
 * read each line in its level's tint.
 *
 * The toolbar composes the level filter and the follow-tail toggle; the list is
 * `@gpuixui/data`'s `VirtualList`, bottom-anchored and following appends until
 * the reader scrolls up.
 */

import { useState } from "react";
import { LogViewer, type LogLevel } from "../src/index.js";

const lines = [
  "info server started",
  "debug binding to :8080",
  "info request completed in 12ms",
  "warn slow query: took 240ms",
  "debug cache miss on /assets/logo.png",
  "error connection refused to database",
  "info retrying in 1s",
  "trace cache hit on /assets/logo.png",
  "info request completed in 8ms",
  "warn memory pressure at 82%",
  "error unhandled rejection in worker",
  "debug heartbeat sent",
];

/** The viewer and the filter/follow state it edits. */
export const LogViewerExample = () => {
  const [levels, setLevels] = useState<ReadonlyArray<LogLevel>>([
    "error",
    "warn",
    "info",
    "debug",
    "trace",
  ]);
  const [follow, setFollow] = useState(true);

  return (
    <div style={{ width: 520 }}>
      <LogViewer
        height={240}
        lines={lines}
        enabledLevels={levels}
        onEnabledLevelsChange={setLevels}
        followTail={follow}
        onFollowTailChange={setFollow}
      />
    </div>
  );
};
