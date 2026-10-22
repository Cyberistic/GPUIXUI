/**
 * Browser previews for the Timeline page.
 *
 * The shipped timeline is a read-only rail: it paints the status the app passes
 * and stops the connector at the last direct child. The preview cannot mount it
 * (the library renders through GPUix), so it mirrors the contract with HTML and
 * says so: the dot takes the fill `dotFill` names per status, the connector is a
 * real 1px element that the last event does not paint, and the statuses are the
 * app's — the run's cursor is marked onto each event before the rail holds it.
 *
 * The rules live in `timeline-preview.ts` so a test can fail on them; this file
 * only renders them. The Code tab always shows the native usage.
 */

import { useState } from "react";
import {
  advance,
  DEPLOY_STEPS,
  describe,
  finish,
  lastIndex,
  plan,
  reset,
  type TimelineEvent,
} from "./timeline-preview";

/** One event: its dot and connector on the rail, its words beside them. */
const Event = ({
  event,
  last,
}: {
  readonly event: TimelineEvent;
  readonly last: boolean;
}) => (
  <li
    className="gx-timeline-item"
    data-last={last ? "" : undefined}
    data-status={event.status}
  >
    <div className="gx-timeline-rail">
      <span className="gx-timeline-dot" />
      {/* The rail stops with the last event: no connector is painted after it. */}
      {last ? null : <span className="gx-timeline-connector" />}
    </div>
    <div className="gx-timeline-content">
      {event.timestamp === undefined ? null : (
        <span className="gx-timeline-time">{event.timestamp}</span>
      )}
      <span className="gx-timeline-title">{event.title}</span>
      <span className="gx-timeline-description">{event.description}</span>
    </div>
  </li>
);

/** The rail alone, for both previews. */
const Rail = ({
  events,
  label,
}: {
  readonly events: ReadonlyArray<TimelineEvent>;
  readonly label: string;
}) => (
  <ol aria-label={label} className="gx-timeline">
    {events.map((event, index) => (
      <Event
        event={event}
        key={event.title}
        last={index === events.length - 1}
      />
    ))}
  </ol>
);

/** A deploy run: the app marks each event as the cursor passes it. */
export const TimelineWorkflow = () => {
  const [cursor, setCursor] = useState(0);
  const events = plan(cursor);
  const finished = cursor > lastIndex();

  return (
    <div className="gx-demo gx-demo-column gx-timeline-scene">
      <p className="gx-demo-label">Release Aurora</p>
      <div className="gx-timeline-card">
        <p className="gx-timeline-title-line">Release Aurora</p>
        <p className="gx-timeline-lede">
          Four planned steps. The app owns the cursor and marks every event; the
          rail only paints what it is handed.
        </p>
        <Rail events={events} label="Release Aurora" />
        <div className="gx-timeline-actions">
          <button
            className="gx-btn gx-btn-primary"
            disabled={finished}
            onClick={() => setCursor(advance(cursor))}
            type="button"
          >
            {finished ? "Finished" : "Promote"}
          </button>
          <button
            className="gx-btn gx-btn-outline"
            disabled={finished}
            onClick={() => setCursor(finish())}
            type="button"
          >
            Finish run
          </button>
          <button
            className="gx-btn gx-btn-ghost"
            onClick={() => setCursor(reset())}
            type="button"
          >
            Reset
          </button>
        </div>
        <p className="gx-timeline-readout" role="status">
          {describe(cursor)}
        </p>
        <p className="gx-timeline-note">
          Promote moves the cursor one step; the current event is the one the
          run waits on, and nothing after it carries a time. The last event
          never paints a connector, and the app marks the whole history complete
          by moving the cursor past the last step &mdash; the component has no
          idea that happened.
        </p>
      </div>
    </div>
  );
};

/** One labelled rail, for the states preview. */
const StateGroup = ({
  cursor,
  label,
}: {
  readonly cursor: number;
  readonly label: string;
}) => (
  <div className="gx-timeline-state">
    <p className="gx-timeline-state-label">{label}</p>
    <Rail events={plan(cursor)} label={label} />
  </div>
);

/** The three marks, the cursor past the end, and a single event's rail. */
export const TimelineStates = () => (
  <div className="gx-demo gx-demo-column gx-timeline-scene">
    <StateGroup cursor={1} label="Cursor 1 — tests current, deploy upcoming" />
    <StateGroup cursor={3} label="Cursor 3 — the last event is current" />
    <StateGroup
      cursor={DEPLOY_STEPS.length}
      label="Cursor past the end — every event complete, no current"
    />
    <div className="gx-timeline-state">
      <p className="gx-timeline-state-label">
        One event — it is the whole rail, so no connector
      </p>
      <Rail
        events={[
          {
            title: "Build started",
            description: "release/aurora at 4c1a9fd",
            timestamp: "09:41",
            status: "complete",
          },
        ]}
        label="One event"
      />
    </div>
    <p className="gx-timeline-note">
      Every status is passed: the same four steps can be marked by a cursor, by
      a failed build or by hand. An upcoming event&rsquo;s dot takes the muted
      <em> text </em>role rather than the muted surface fill, which measured
      1.06:1 on the page &mdash; a dot nobody could see.
    </p>
  </div>
);

export const timelineWorkflowSource = `import { useState } from "react";
import { Timeline, TimelineItem } from "@gpuixui/components";

const steps = [
  { title: "Build started", timestamp: "09:41" },
  { title: "Tests passed", timestamp: "09:44" },
  { title: "Deploying to production", timestamp: "09:52" },
  { title: "Smoke checks" },
];

export const ReleaseRun = () => {
  // The cursor is the app's. The component has none: it paints the status
  // each event is handed.
  const [cursor, setCursor] = useState(0);
  const statusOf = (index: number) =>
    index < cursor ? "complete" : index === cursor ? "current" : "upcoming";

  return (
    <>
      <Timeline label="Release Aurora">
        {steps.map((step, index) => (
          <TimelineItem
            description={\`Step \${index + 1} of \${steps.length}\`}
            key={step.title}
            status={statusOf(index)}
            timestamp={step.timestamp}
            title={step.title}
          />
        ))}
      </Timeline>
      <button onClick={() => setCursor(cursor + 1)} type="button">
        Promote
      </button>
    </>
  );
};`;

export const timelineStatesSource = `import { Timeline, TimelineItem } from "@gpuixui/components";

<>
  {/* Every status is passed; a history has no index to count from. */}
  <Timeline label="Release Aurora">
    <TimelineItem status="complete" timestamp="09:41" title="Build started" />
    <TimelineItem status="current" timestamp="09:52" title="Deploying" />
    <TimelineItem status="upcoming" title="Smoke checks" />
  </Timeline>
  {/* The last direct child paints no connector, so the rail stops there. */}
  <Timeline label="One event">
    <TimelineItem status="complete" title="Build started" />
  </Timeline>
</>;`;
