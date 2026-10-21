import type { ReactNode } from "react";
import {
  eventAbsences,
  eventHandlers,
  eventPayloadGroups,
  eventModifiers,
  windowEventHandlers,
  type EventHandlerRow,
  type EventFieldRow,
} from "@/lib/events";

/**
 * The event tables (plan 635). Every row comes from `src/lib/events.ts`, whose
 * names and event types agree with the installed `@gpuix/native` declarations
 * and dispatcher in both directions; nothing is retyped here.
 */
const Table = ({
  label,
  marker,
  head,
  children,
}: {
  readonly label: string;
  readonly marker: string;
  readonly head: ReadonlyArray<string>;
  readonly children: ReactNode;
}) => (
  <div
    className="my-3 overflow-x-auto"
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    <table className="w-full text-left text-sm" data-event-table={marker}>
      <thead>
        <tr className="border-b border-fd-border text-fd-muted-foreground">
          {head.map((cell) => (
            <th
              key={cell}
              scope="col"
              className="py-2 pr-4 font-medium last:pr-0"
            >
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export function EventHandlerTable() {
  const row = (handler: EventHandlerRow) => (
    <tr
      key={handler.name}
      data-event-handler={handler.name}
      className="border-b border-fd-border align-top last:border-0"
    >
      <td className="py-2 pr-4 font-mono whitespace-nowrap">{handler.name}</td>
      <td className="py-2 pr-4 font-mono whitespace-nowrap">
        {handler.eventType}
      </td>
      <td className="py-2 pr-4">{handler.firesOn}</td>
      <td className="py-2 text-fd-muted-foreground">
        <span className="block">{handler.summary}</span>
        <span className="mt-1 block font-mono text-xs" data-event-carries>
          {handler.carries}
        </span>
      </td>
    </tr>
  );

  return (
    <Table
      label="Every event handler prop and the fields it carries"
      marker="handlers"
      head={["Prop", "Event type", "Fires on", "What it carries"]}
    >
      {eventHandlers.map(row)}
    </Table>
  );
}

export function EventPayloadTables() {
  const row = (field: EventFieldRow) => (
    <tr
      key={field.name}
      data-event-field={field.name}
      className="border-b border-fd-border align-top last:border-0"
    >
      <td className="py-2 pr-4 font-mono whitespace-nowrap">{field.name}</td>
      <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">
        {field.type}
      </td>
      <td className="py-2 pr-4">{field.populatedFor}</td>
      <td className="py-2 text-fd-muted-foreground">{field.summary}</td>
    </tr>
  );

  return (
    <div data-event-payload>
      {eventPayloadGroups.map((group) => (
        <section key={group.id} data-event-group={group.id}>
          <h3 className="mt-5 mb-1 text-base font-medium">{group.title}</h3>
          <p className="mb-2 text-sm text-fd-muted-foreground">{group.note}</p>
          <Table
            label={`${group.title} event payload fields`}
            marker={group.id}
            head={["Field", "Type", "Populated for", "What it means"]}
          >
            {group.rows.map(row)}
          </Table>
        </section>
      ))}
      <section data-event-group="modifiers">
        <h3 className="mt-5 mb-1 text-base font-medium">EventModifiers</h3>
        <p className="mb-2 text-sm text-fd-muted-foreground">
          Read from <code>event.modifiers</code>. Every field is a boolean.
        </p>
        <Table
          label="Event modifier fields"
          marker="modifiers"
          head={["Field", "What it means"]}
        >
          {eventModifiers.map((modifier) => (
            <tr
              key={modifier.name}
              data-event-modifier={modifier.name}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-mono whitespace-nowrap">
                {modifier.name}
              </td>
              <td className="py-2 text-fd-muted-foreground">
                {modifier.summary}
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}

export function WindowEventTable() {
  return (
    <Table
      label="Window-level event handlers, passed to render()"
      marker="window"
      head={["Handler", "Signature", "What it receives"]}
    >
      {windowEventHandlers.map((handler) => (
        <tr
          key={handler.name}
          data-window-event={handler.name}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-mono whitespace-nowrap">
            {handler.name}
          </td>
          <td className="py-2 pr-4 font-mono text-xs">{handler.signature}</td>
          <td className="py-2 text-fd-muted-foreground">{handler.summary}</td>
        </tr>
      ))}
    </Table>
  );
}

export function EventAbsences() {
  return (
    <Table
      label="What the event payload does not carry"
      marker="absences"
      head={["Not in the event", "What to do instead"]}
    >
      {eventAbsences.map((absence) => (
        <tr
          key={absence.subject}
          data-event-absence={absence.subject}
          className="border-b border-fd-border align-top last:border-0"
        >
          <td className="py-2 pr-4 font-medium">{absence.subject}</td>
          <td className="py-2 text-fd-muted-foreground">{absence.statement}</td>
        </tr>
      ))}
    </Table>
  );
}
