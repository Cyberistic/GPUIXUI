/**
 * Browser preview for the Toggle group component page.
 *
 * The shipped group is a GPUix host tree, so the preview paints the buttons
 * from the theme bridge and says so. It teaches the two modes: a single group
 * with one live mode, and a multiple group where any number stays on.
 */

import { useState } from "react";

const alignments = ["Left", "Centre", "Right", "Justify"] as const;
const formats = ["Bold", "Italic", "Underline"] as const;

export const ToggleGroupToolbar = () => {
  const [alignment, setAlignment] = useState("Centre");
  const [formatsOn, setFormatsOn] = useState<ReadonlyArray<string>>(["Bold"]);

  return (
    <div className="gx-demo gx-demo-column gx-tgroup-scene">
      <p className="gx-demo-label">Single · alignment</p>
      <div aria-label="Alignment" className="gx-tgroup" role="group">
        {alignments.map((option) => (
          <button
            aria-label={`Align ${option}`}
            aria-pressed={alignment === option}
            className="gx-btn gx-toggle gx-toggle-outline"
            data-pressed={alignment === option ? "" : undefined}
            key={option}
            onClick={() => setAlignment(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <p className="gx-demo-label">Multiple · formatting</p>
      <div aria-label="Formatting" className="gx-tgroup" role="group">
        {formats.map((option) => {
          const pressed = formatsOn.includes(option);
          return (
            <button
              aria-label={option}
              aria-pressed={pressed}
              className="gx-btn gx-toggle"
              data-pressed={pressed ? "" : undefined}
              key={option}
              onClick={() =>
                setFormatsOn((current) =>
                  current.includes(option)
                    ? current.filter((item) => item !== option)
                    : [...current, option],
                )
              }
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
      <p className="gx-demo-label">
        One tab stop per group; the arrow keys walk it without pressing.
      </p>
    </div>
  );
};

const toggleGroupToolbarSource = `import {
  ToggleGroup,
  ToggleGroupItem,
} from "@gpuixui/components/toggle-group";

<ToggleGroup type="single" label="Alignment" defaultValue="centre">
  <ToggleGroupItem value="left" label="Align left">Left</ToggleGroupItem>
  <ToggleGroupItem value="centre" label="Align centre">Centre</ToggleGroupItem>
</ToggleGroup>;

<ToggleGroup type="multiple" label="Formatting" defaultValue={["bold"]}>
  <ToggleGroupItem value="bold" label="Bold">Bold</ToggleGroupItem>
  <ToggleGroupItem value="italic" label="Italic">Italic</ToggleGroupItem>
</ToggleGroup>;`;

export { toggleGroupToolbarSource };
