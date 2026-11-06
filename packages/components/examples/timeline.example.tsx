/** @jsxImportSource @gpuix/react */
import { Timeline, TimelineItem } from "../src/timeline.js";

export const TimelineExample = () => (
  <Timeline label="Release 2.4.0" style={{ width: 360 }}>
    <TimelineItem title="Build started" timestamp="09:41" status="complete" />
    <TimelineItem
      title="Tests passed"
      description="412 tests, 0 failures"
      timestamp="09:44"
      status="complete"
    />
    <TimelineItem
      title="Deploying to production"
      description="Two of three regions are live"
      timestamp="09:52"
      status="current"
    />
    <TimelineItem title="Smoke checks" timestamp="—" status="upcoming" />
  </Timeline>
);
