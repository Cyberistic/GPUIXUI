import { useTheme } from "fumadocs-ui/provider/base";

/**
 * The mode a press should produce. next-themes reports `resolvedTheme` as
 * `"light"` or `"dark"`; an unresolved store (`undefined` during hydration)
 * becomes dark, so the first press always changes what the reader sees.
 */
export const nextTheme = (resolved: string | undefined): "light" | "dark" =>
  resolved === "dark" ? "light" : "dark";

/**
 * The phone-width mode switch for the home layout (plan 519). Fumadocs'
 * `HomeLayout` hides its own `[data-theme-toggle]` below `lg`; this control is
 * `lg:hidden`, so exactly one of the two is displayed at any width. It reads the
 * same next-themes store `RootProvider` configures, and its glyph follows the
 * `dark` class through CSS, so the server and client markup agree.
 */
export function CompactThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle Theme"
      data-compact-theme-toggle=""
      onClick={() => setTheme(nextTheme(resolvedTheme))}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-fd-border text-fd-muted-foreground transition-colors hover:text-fd-foreground lg:hidden"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 dark:hidden"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hidden size-4 dark:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
