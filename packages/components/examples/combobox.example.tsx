/**
 * Combobox example: assigning a reviewer and labelling a task.
 *
 * The single picker closes on select and shows one name; the multi picker stays
 * open and reports an ordered array; the project picker offers a create row for
 * a name that does not exist yet. All three use the same option shape and the
 * same ranking from `combobox/logic.ts`.
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

const labels: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar", description: "Scheduling" },
  { value: "camera", label: "Camera", description: "Hardware" },
  { value: "vacation", label: "Vacation", description: "Time off" },
  { value: "desk", label: "Desk booking", description: "Workspace" },
];

const initialProjects: ReadonlyArray<ComboboxOption> = [
  { value: "design-system", label: "Design system" },
  { value: "documentation", label: "Documentation" },
];

/** One picker composed from the parts; all three cards use the same shape. */
const Picker = ({
  label,
  multiple,
  options,
  onValueChange,
  onCreate,
}: {
  readonly label: string;
  readonly multiple?: boolean;
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly onValueChange: (value: ComboboxSelection) => void;
  readonly onCreate?: (query: string) => void;
}) => (
  <Combobox
    multiple={multiple}
    options={options}
    onValueChange={onValueChange}
    onCreate={onCreate}
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
  const [chosen, setChosen] = useState<ReadonlyArray<string>>([]);
  const [project, setProject] = useState<string | null>(null);
  const [projects, setProjects] =
    useState<ReadonlyArray<ComboboxOption>>(initialProjects);

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
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Try “ca”: Calendar, Camera, then Vacation — prefix matches first. Type
          a project that is not listed to create it: {project ?? "none"}.
        </text>
      </div>
    </Card>
  );
};
