import { useRef } from "react";
import { platformTypes, type PlatformName } from "@gpuixui/tokens";
import { isPlatformName, platformNames } from "./platform";
import { movePlatform } from "./platform-toggle-logic";
import { usePlatform } from "./platform-provider";

/**
 * Switches the docs between the library's platform styles. One choice, so it is
 * one radio group: a roving tab stop, arrows that move and apply, and the
 * provider keeping the URL and storage in step (plan 509). The control is part
 * of the documentation shell, so it is ordinary HTML styled with the docs' own
 * tokens.
 *
 * Below `sm` the four labels do not fit beside search and the menu, so the same
 * choice renders as a native `<select>` and leaves room for the compact theme
 * switch. Both controls call the one `setPlatform`; `isPlatformName` decodes the
 * select's string at the boundary (plan 519).
 */
export function PlatformToggle() {
  const { platform, setPlatform } = usePlatform();
  const options = useRef(new Map<PlatformName, HTMLButtonElement>());

  const move = (next: PlatformName): void => {
    setPlatform(next);
    options.current.get(next)?.focus();
  };

  return (
    <>
      <select
        aria-label="Platform style"
        data-platform-select=""
        value={platform}
        onChange={(event) => {
          const value = event.target.value;
          if (isPlatformName(value)) setPlatform(value);
        }}
        className="h-8 max-w-36 shrink-0 rounded-md border border-fd-border bg-fd-muted px-2 text-xs text-fd-foreground sm:hidden"
      >
        {platformNames.map((name) => (
          <option key={name} value={name}>
            {platformTypes[name].label}
          </option>
        ))}
      </select>
      <div
        role="radiogroup"
        aria-label="Platform style"
        data-platform-toggle=""
        className="hidden w-fit shrink-0 items-center gap-0.5 rounded-md border border-fd-border bg-fd-muted p-0.5 text-xs sm:flex"
      >
        {platformNames.map((name) => {
          const checked = platform === name;
          return (
            <button
              key={name}
              ref={(element) => {
                if (element === null) options.current.delete(name);
                else options.current.set(name, element);
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => setPlatform(name)}
              onKeyDown={(event) => {
                const next = movePlatform(platform, event.key);
                if (next === undefined) return;
                event.preventDefault();
                move(next);
              }}
              className={`rounded px-2 py-1 transition-colors ${
                checked
                  ? "bg-fd-primary text-fd-primary-foreground"
                  : "text-fd-muted-foreground hover:text-fd-foreground"
              }`}
            >
              {platformTypes[name].label}
            </button>
          );
        })}
      </div>
    </>
  );
}
