/**
 * Browser preview for the Pinned list page.
 *
 * The native scroll box holds each section header at the viewport top while its
 * rows scroll under it; the preview reproduces the same pinned headers.
 */

/**
 * Enough rows to scroll past a header.
 *
 * A pinned header only reads as pinned when a reader can scroll a section's
 * rows under it, so the list is deliberately taller than its box: three
 * sections of three rows fit the frame and proved nothing.
 */
const sections = [
  {
    title: "Account",
    rows: ["Name", "Email", "Timezone", "Language", "Date format"],
  },
  {
    title: "Notifications",
    rows: [
      "Build failures",
      "Weekly digest",
      "Releases",
      "Mentions",
      "Review requests",
    ],
  },
  {
    title: "Danger zone",
    rows: [
      "Delete workspace",
      "Transfer ownership",
      "Rotate the API token",
      "Export everything",
      "Archive the project",
    ],
  },
];

export function PinnedListDemo() {
  return (
    <div aria-label="Settings" className="gx-pinnedlist">
      {sections.map((section) => (
        <div className="gx-pinnedlist-section" key={section.title}>
          <div className="gx-pinnedlist-header">{section.title}</div>
          {section.rows.map((row) => (
            <div className="gx-pinnedlist-row" key={row}>
              {row}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const pinnedListDemoSource = `import { PinnedList } from "@gpuixui/components/pinned-list";

<PinnedList
  aria-label="Settings"
  style={{ height: 360 }}
  sections={[
    { title: "Account", children: <AccountRows /> },
    { title: "Notifications", children: <NotificationRows /> },
    { title: "Danger zone", children: <DangerRows /> },
  ]}
/>;`;
