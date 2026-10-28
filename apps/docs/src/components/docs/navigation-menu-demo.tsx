import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  NAV_ITEMS,
  applyNavEvent,
  initialNavState,
  navRoving,
  navTimer,
  openLabel,
  type NavEvent,
  type NavRovingKey,
} from "./navigation-menu-preview";

/**
 * Browser previews for the Navigation menu page.
 *
 * The shipped nav keeps exactly one anchored panel open, runs a pointer policy
 * on top of that (rest to open, leave both surfaces to close) and lets an
 * explicit press or key win over a pending hover timer. The workflow below runs
 * the preview's own reducer, and `navigation-menu-preview.test.ts` holds its
 * delays and its rules to `packages/components/src/navigation-menu.tsx`, so the
 * drawing can show the state machine rather than a picture of one.
 *
 * A trigger is a real `<button>` here, as it is in the component. The browser's
 * Enter, Space and arrows are the component's own key contract. The panel is an
 * in-flow `<div role="group">` while the native surface is an anchored layer;
 * that placement is the approximation this page records.
 */

/**
 * The chevron the native trigger paints, in the slot it reserves.
 *
 * shadcn's is lucide's `ChevronDown` with a rotate transition. The runtime has
 * no `transform`, so the component cross-fades `chevron-down` and `chevron-up`
 * in one fixed slot (`internal/flip-mark.tsx`); the drawing does the same, which
 * is also why the trigger cannot resize under the pointer and move its
 * siblings — the bug the character swap (`⌄` -> `⌃`) caused.
 */
const NavChevron = ({ open }: { readonly open: boolean }): ReactNode => (
  <span
    aria-hidden="true"
    className="gx-nav-chevron"
    data-open={open ? "" : undefined}
  >
    <svg
      className="gx-nav-chevron-mark"
      data-mark="down"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
    <svg
      className="gx-nav-chevron-mark"
      data-mark="up"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  </span>
);

/** The key a roving trigger hands to the group, if it is one. */
const rovingKey = (key: string): NavRovingKey | undefined =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End"
    ? key
    : undefined;

/** The workflow scene: one nav, driven by pointer, press and keys. */
export const NavigationMenuDemo = (): ReactNode => {
  const [state, dispatch] = useReducer(
    applyNavEvent,
    "platform",
    initialNavState,
  );
  const [focus, setFocus] = useState("platform");
  const [last, setLast] = useState("nothing yet");
  const [panelFocusRequest, setPanelFocusRequest] = useState(0);
  const triggers = useRef(new Map<string, HTMLButtonElement | null>());
  const panel = useRef<HTMLDivElement | null>(null);

  const send = (event: NavEvent, note: string): void => {
    dispatch(event);
    setLast(note);
  };

  // One pending transition at a time: the pointer's open, or its close grace.
  useEffect(() => {
    const next = navTimer(state);
    if (next === undefined) return;
    const timer = window.setTimeout(() => dispatch(next.event), next.delay);
    return () => window.clearTimeout(timer);
  }, [state]);

  // ArrowDown opens and moves focus into the panel — not onto its first link.
  useEffect(() => {
    if (panelFocusRequest === 0) return;
    panel.current?.focus();
  }, [panelFocusRequest]);

  const onTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    value: string,
  ): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocus(value);
      setPanelFocusRequest((count) => count + 1);
      send({ type: "open-key", value }, `ArrowDown opened ${value}`);
      return;
    }

    const key = rovingKey(event.key);
    if (key === undefined) return;
    event.preventDefault();
    const next = navRoving(
      NAV_ITEMS.map((item) => item.value),
      value,
      key,
    );
    if (next === undefined) return;
    setFocus(next);
    triggers.current.get(next)?.focus();
    setLast(`${key} moved focus to ${next}`);
  };

  const onNavKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Escape" || state.open === null) return;
    event.preventDefault();
    const closing = state.open;
    send({ type: "escape" }, `Escape closed ${closing}`);
    setFocus(closing);
    triggers.current.get(closing)?.focus();
  };

  return (
    <div className="gx-demo-navigation">
      <div className="gx-nav-scene">
        <div className="gx-nav-head">
          <p className="gx-nav-title">Product</p>
          <p className="gx-nav-subtitle">One panel at a time</p>
        </div>
        <nav
          aria-label="Product"
          className="gx-nav-bar"
          onKeyDown={onNavKeyDown}
        >
          <div className="gx-nav-list" role="list">
            {NAV_ITEMS.map((item) => {
              const expanded = state.open === item.value;
              return (
                <div className="gx-nav-item" key={item.value} role="listitem">
                  <button
                    aria-expanded={expanded}
                    className="gx-nav-trigger"
                    data-open={expanded ? "" : undefined}
                    onClick={() =>
                      send(
                        { type: "press", value: item.value },
                        `pressed ${item.label}`,
                      )
                    }
                    onKeyDown={(event) => onTriggerKeyDown(event, item.value)}
                    onMouseEnter={() =>
                      send(
                        { type: "hover-enter", value: item.value },
                        `resting on ${item.label}`,
                      )
                    }
                    onMouseLeave={() =>
                      send(
                        { type: "hover-leave", value: item.value },
                        `left ${item.label}`,
                      )
                    }
                    ref={(node) => {
                      triggers.current.set(item.value, node);
                    }}
                    tabIndex={focus === item.value ? 0 : -1}
                    type="button"
                  >
                    {item.label}
                    <NavChevron open={expanded} />
                  </button>
                  {expanded ? (
                    <div
                      aria-label={item.value}
                      className="gx-nav-content"
                      onMouseEnter={() =>
                        send(
                          { type: "panel-enter" },
                          `pointer entered ${item.label}`,
                        )
                      }
                      onMouseLeave={() =>
                        send(
                          { type: "panel-leave" },
                          `pointer left ${item.label}`,
                        )
                      }
                      ref={panel}
                      role="group"
                      tabIndex={-1}
                    >
                      {item.links.map((link) => (
                        <button
                          className="gx-nav-link"
                          key={link}
                          onClick={() =>
                            send(
                              {
                                type: "link",
                                value: `${link} in ${item.label}`,
                              },
                              `opened ${link} — the panel closed`,
                            )
                          }
                          type="button"
                        >
                          {link}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </nav>
        <div className="gx-nav-controls">
          <button
            className="gx-btn gx-btn-sm gx-btn-secondary"
            onClick={() =>
              send({ type: "outside" }, "a press outside closed it")
            }
            type="button"
          >
            Press outside the nav
          </button>
        </div>
      </div>
      <p aria-live="polite" className="gx-nav-readout" role="status">
        open: {openLabel(state.open)} · focus: {openLabel(focus)} · last: {last}
      </p>
    </div>
  );
};

interface TileProps {
  readonly title: string;
  readonly open: string | null;
  readonly disabled?: ReadonlyArray<string>;
}

/** One state as a still: the panel is in flow here, not anchored. */
const NavTile = ({ title, open, disabled = [] }: TileProps): ReactNode => (
  <div className="gx-nav-tile">
    <p className="gx-nav-tile-title">{title}</p>
    <nav aria-label={title} className="gx-nav-bar">
      <div className="gx-nav-list" role="list">
        {NAV_ITEMS.map((item) => {
          const expanded = open === item.value;
          return (
            <div className="gx-nav-item" key={item.value} role="listitem">
              <button
                aria-expanded={expanded}
                className="gx-nav-trigger"
                data-open={expanded ? "" : undefined}
                disabled={disabled.includes(item.value)}
                type="button"
              >
                {item.label}
                <NavChevron open={expanded} />
              </button>
              {expanded ? (
                <div
                  aria-label={item.value}
                  className="gx-nav-content gx-nav-content-static"
                  role="group"
                >
                  {item.links.map((link) => (
                    <button className="gx-nav-link" key={link} type="button">
                      {link}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  </div>
);

/** The states scene: at rest, one open, a disabled trigger, a populated panel. */
export const NavigationMenuStates = (): ReactNode => (
  <div className="gx-demo-navigation">
    <div className="gx-nav-tiles">
      <NavTile open={null} title="At rest" />
      <NavTile open="platform" title="One open" />
      <NavTile
        disabled={["community"]}
        open={null}
        title="A disabled trigger"
      />
    </div>
  </div>
);

const workflowSource = `import { useState } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@gpuixui/components/navigation-menu";

const ITEMS = [
  { value: "platform", label: "Platform", links: ["Overview", "Runs", "Datasets"] },
  { value: "docs", label: "Docs", links: ["Getting started", "Components", "Theming"] },
];

export const ProductNav = () => {
  const [open, setOpen] = useState<string | null>("platform");

  return (
    <NavigationMenu
      label="Product"
      onValueChange={setOpen}
      openDelay={150}
      value={open}
    >
      <NavigationMenuList>
        {ITEMS.map((item) => (
          <NavigationMenuItem key={item.value} value={item.value}>
            <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
            <NavigationMenuContent>
              {item.links.map((link) => (
                <NavigationMenuLink
                  key={link}
                  onSelect={() => go(link)}
                >
                  {link}
                </NavigationMenuLink>
              ))}
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
};`;

const statesSource = `import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@gpuixui/components/navigation-menu";

// Nothing is open: no value, no default.
<NavigationMenu label="Product">
  <NavigationMenuList>
    <NavigationMenuItem value="platform">
      <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink onSelect={() => go("overview")}>Overview</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>;

// One item open, and a second item that cannot be opened.
<NavigationMenu defaultValue="docs" label="Product">
  <NavigationMenuList>
    <NavigationMenuItem value="docs">
      <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink onSelect={() => go("theming")}>Theming</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
    <NavigationMenuItem value="community">
      <NavigationMenuTrigger disabled>Community</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink onSelect={() => go("changelog")}>Changelog</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>;`;

export { statesSource as navigationMenuStatesSource };
export { workflowSource as navigationMenuDemoSource };
