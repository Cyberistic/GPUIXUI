/**
 * Browser preview for the ToggleGroup page.
 *
 * A toggle group is a toolbar of related modes with one tab stop. The preview
 * shows a single-mode and a multiple-mode group, reusing the shared button
 * chrome. The Code tab shows the native usage.
 */

import { useState } from "react";

const formats = ["Bold", "Italic", "Underline"] as const;
const views = ["List", "Grid"] as const;

export const ToggleGroupDemo = () => {
  const [selected, setSelected] = useState<ReadonlyArray<string>>(["Bold"]);
  const [view, setView] = useState("List");

  return (
    <div className="gx-demo gx-demo-column gx-tgroup-scene">
      <p className="gx-demo-label">Multiple · formatting</p>
      <div className="gx-tgroup" role="group" aria-label="Formatting">
        {formats.map((format) => {
          const pressed = selected.includes(format);
          return (
            <button
              aria-pressed={pressed}
              className="gx-btn gx-toggle"
              data-pressed={pressed ? "" : undefined}
              key={format}
              onClick={() =>
                setSelected((current) =>
                  current.includes(format)
                    ? current.filter((item) => item !== format)
                    : [...current, format],
                )
              }
              type="button"
            >
              {format}
            </button>
          );
        })}
      </div>
      <p className="gx-demo-label">Single · view</p>
      <div className="gx-tgroup" role="group" aria-label="View">
        {views.map((option) => (
          <button
            aria-pressed={view === option}
            className="gx-btn gx-toggle"
            data-pressed={view === option ? "" : undefined}
            key={option}
            onClick={() => setView(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

const toggleGroupDemoSource = `import { ToggleGroup } from "@gpuixui/primitives";

<ToggleGroup
  type="multiple"
  label="Formatting"
  value={formats}
  onValueChange={setFormats}
  options={[
    { value: "bold", label: "Bold" },
    { value: "italic", label: "Italic" },
    { value: "underline", label: "Underline" },
  ]}
/>;

// type="single" keeps at most one pressed value.
<ToggleGroup
  type="single"
  label="View"
  value={view}
  onValueChange={setView}
  options={[{ value: "list", label: "List" }, { value: "grid", label: "Grid" }]}
/>;`;

export { toggleGroupDemoSource };
