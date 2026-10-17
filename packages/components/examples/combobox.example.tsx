/**
 * Combobox example: assigning a reviewer and labelling a task.
 *
 * The single picker closes on select and shows one name; the multi picker stays
 * open and reports an ordered array. Both use the same option shape and the same
 * ranking from `combobox/logic.ts`.
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

/** One picker composed from the parts; both cards use the same shape. */
const Picker = ({
  label,
  multiple,
  options,
  onValueChange,
}: {
  readonly label: string;
  readonly multiple?: boolean;
  readonly options: ReadonlyArray<ComboboxOption>;
  readonly onValueChange: (value: ComboboxSelection) => void;
}) => (
  <Combobox
    multiple={multiple}
    options={options}
    onValueChange={onValueChange}
  >
    <ComboboxTrigger label={label} />
    <ComboboxContent>
      <ComboboxInput label={`Search ${label.toLowerCase()}`} />
      <ComboboxList label={label} />
      <ComboboxEmpty />
    </ComboboxContent>
  </Combobox>
);

/** Two comboboxes: one value, then several. */
export const ComboboxExample = () => {
  const theme = useTheme();
  const [reviewer, setReviewer] = useState<string | null>(null);
  const [chosen, setChosen] = useState<ReadonlyArray<string>>([]);

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
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Try “ca”: Calendar, Camera, then Vacation — prefix matches first.
        </text>
      </div>
    </Card>
  );
};
