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
