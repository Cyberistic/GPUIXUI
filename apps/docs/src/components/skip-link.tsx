/**
 * The first tab stop on every page: hidden until focused, then fixed to the
 * top-left over the chrome. `href` is the id of a `tabIndex={-1}` target, so
 * Enter moves focus into the page rather than only changing the hash (plan 496).
 */
export interface SkipLinkProps {
  /** The id of the focusable element the link jumps to, including `#`. */
  readonly href: string;
}

export function SkipLink({ href }: SkipLinkProps) {
  return (
    <a
      href={href}
      data-skip-link=""
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:border-fd-border focus:bg-fd-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-fd-foreground"
    >
      Skip to content
    </a>
  );
}
