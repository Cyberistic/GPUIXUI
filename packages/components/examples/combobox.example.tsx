/**
 * Combobox example: assigning a reviewer and labelling a task.
 *
 * The single picker's popup is controlled by the example and closes on select;
 * the multi picker stays open and reports an ordered array and groups its
 * labels; the project picker
 * offers a create row for a name that does not exist yet; the directory picker
 * filters its own rows in `onQueryChange`, which is the shape a server-backed
 * search takes. The first three share one option shape and the same ranking from
 * `combobox/logic.ts`.
 */

import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxOption,
  type ComboboxSelection,
} from "../src/combobox.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

const reviewers: ReadonlyArray<ComboboxOption> = [
  { value: "ada", label: "Ada Lovelace", description: "Engineering" },
  { value: "grace", label: "Grace Hopper", description: "Compilers" },
  { value: "alan", label: "Alan Turing", description: "Research" },
];

/** The multi picker groups consecutive options under one heading. */
const labels: ReadonlyArray<ComboboxOption> = [
  {
    value: "calendar",
    label: "Calendar",
    description: "Scheduling",
    group: "Work",
  },
  {
    value: "camera",
    label: "Camera",
    description: "Hardware",
    group: "Work",
  },
  {
    value: "vacation",
    label: "Vacation",
    description: "Time off",
    group: "Personal",
  },
  {
    value: "desk",
    label: "Desk booking",
    description: "Workspace",
    group: "Personal",
  },
];

const initialProjects: ReadonlyArray<ComboboxOption> = [
  { value: "design-system", label: "Design system" },
  { value: "documentation", label: "Documentation" },
];

/** The directory a "remote" picker searches; the caller owns the filtering. */
const directory: ReadonlyArray<ComboboxOption> = [
  { value: "ada", label: "Ada Lovelace", description: "Engineering" },
  { value: "grace", label: "Grace Hopper", description: "Compilers" },
  { value: "alan", label: "Alan Turing", description: "Research" },
];

/**
 * Stand-in for a server search: the component never fetches, and the picker's
 * `debounce` is what keeps this from being called once per keystroke.
 */
const searchDirectory = (query: string): ReadonlyArray<ComboboxOption> => {
  const needle = query.trim().toLowerCase();
  return needle === ""
    ? directory
    : directory.filter((entry) => entry.label.toLowerCase().includes(needle));
};

/** One picker composed from the parts; the first three cards share it. */
const Picker = ({
  label,
  multiple,
  options,
  onValueChange,
  onCreate,
  open,
  onOpenChange,
}: {
  readonly label: string;
  readonly multiple?: boolean;
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly onValueChange: (value: ComboboxSelection) => void;
  readonly onCreate?: (query: string) => void;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}) => (
  <Combobox
    multiple={multiple}
    options={options}
    onValueChange={onValueChange}
    onCreate={onCreate}
    open={open}
    onOpenChange={onOpenChange}
  >
    <ComboboxTrigger label={label} />
    <ComboboxContent>
      <ComboboxInput label={`Search ${label.toLowerCase()}`} />
      <ComboboxList label={label} />
      <ComboboxEmpty />
    </ComboboxContent>
  </Combobox>
);

/** Three comboboxes: one value, several, then one that can create. */
export const ComboboxExample = () => {
  const theme = useTheme();
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [chosen, setChosen] = useState<ReadonlyArray<string>>([]);
  const [project, setProject] = useState<string | null>(null);
  const [projects, setProjects] =
    useState<ReadonlyArray<ComboboxOption>>(initialProjects);
  const [remoteRows, setRemoteRows] =
    useState<ReadonlyArray<ComboboxOption>>(directory);
  const [remote, setRemote] = useState<string | null>(null);

  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Task details</CardTitle>
        <CardDescription>
          Reviewer: {reviewer ?? "none"} · labels:{" "}
          {chosen.length === 0 ? "none" : chosen.join(", ")}
        </CardDescription>
      </CardHeader>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
          paddingTop: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Assign reviewer
          </text>
          <Picker
            label="Assign reviewer"
            options={reviewers}
            open={reviewerOpen}
            onOpenChange={setReviewerOpen}
            onValueChange={(value) =>
              setReviewer(typeof value === "string" ? value : null)
            }
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Labels
          </text>
          <Picker
            label="Labels"
            multiple
            options={labels}
            onValueChange={(value) =>
              setChosen(Array.isArray(value) ? value : [])
            }
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Project
          </text>
          <Picker
            label="Project"
            options={projects}
            onValueChange={(value) =>
              setProject(typeof value === "string" ? value : null)
            }
            onCreate={(query) =>
              setProjects((current) =>
                current.some((option) => option.value === query)
                  ? current
                  : [...current, { value: query, label: query }],
              )
            }
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Remote directory
          </text>
          <Combobox
            options={remoteRows}
            shouldFilter={false}
            debounce={150}
            onQueryChange={(query) => setRemoteRows(searchDirectory(query))}
            onValueChange={(value) =>
              setRemote(typeof value === "string" ? value : null)
            }
          >
            <ComboboxTrigger label="Remote directory" />
            <ComboboxContent>
              <ComboboxInput label="Search the directory" />
              <ComboboxList label="Directory" />
              <ComboboxEmpty />
            </ComboboxContent>
          </Combobox>
        </div>
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The reviewer popup is controlled here: the app owns `open` and
          `onOpenChange` while ranking and selection stay the component's. Try
          “ca”: Calendar and Camera stay under Work while Vacation, a substring
          match, stays under Personal; type “cam” and the Personal heading
          disappears with its last match. Type a project that is not listed to
          create it: {project ?? "none"}. The directory is filtered by this
          example, not the component: swap searchDirectory for a request (
          {remote ?? "none"} selected).
        </text>
      </div>
    </Card>
  );
};
