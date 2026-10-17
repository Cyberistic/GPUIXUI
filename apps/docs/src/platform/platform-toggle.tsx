import { platformTypes } from "@gpuixui/tokens";
import { platformNames } from "./platform";
import { usePlatform } from "./platform-provider";

/**
 * Switches the docs between the library's platform styles. The control is part
 * of the documentation shell (a browser app), not the native library, so it is
 * ordinary HTML styled with the docs' own tokens.
 */
export function PlatformToggle() {
  const { platform, setPlatform } = usePlatform();

  return (
    <div
      role="group"
      aria-label="Platform style"
      data-platform-toggle=""
      className="flex items-center gap-0.5 rounded-md border border-fd-border bg-fd-muted p-0.5 text-xs"
    >
      {platformNames.map((name) => {
        const selected = platform === name;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={selected}
            onClick={() => setPlatform(name)}
            className={`rounded px-2 py-1 transition-colors ${
              selected
                ? "bg-fd-primary text-fd-primary-foreground"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            }`}
          >
            {platformTypes[name].label}
          </button>
        );
      })}
    </div>
  );
}
