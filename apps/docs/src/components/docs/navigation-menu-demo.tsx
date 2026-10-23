/**
 * Browser preview for the Navigation menu page.
 *
 * The shipped nav opens exactly one anchored panel at a time: triggers form a
 * roving group, Enter/Space or ArrowDown opens, Escape closes and returns focus,
 * and a hover rests open after a delay. 0.11.0 has no anchor element, so a link
 * is a button with `onSelect`. The preview reproduces the one-panel contract —
 * opening a trigger closes its sibling — and the panel's full-width rows.
 */

import { useState } from "react";

const items = [
  {
    value: "platform",
    label: "Platform",
    links: ["Overview", "Runs", "Datasets"],
  },
  {
    value: "docs",
    label: "Docs",
    links: ["Getting started", "Components", "Theming"],
  },
  {
    value: "community",
    label: "Community",
    links: ["Changelog", "Discussions"],
  },
] as const;

export function NavigationMenuDemo() {
  const [open, setOpen] = useState<string | null>("platform");

  return (
    <div className="gx-nav">
      <nav aria-label="Product" className="gx-nav-bar">
        <div className="gx-nav-list" role="list">
          {items.map((item) => {
            const expanded = open === item.value;
            return (
              <div className="gx-nav-item" key={item.value} role="listitem">
                <button
                  aria-expanded={expanded}
                  className="gx-nav-trigger"
                  data-open={expanded ? "" : undefined}
                  onClick={() => setOpen(expanded ? null : item.value)}
                  type="button"
                >
                  {item.label}
                  <span aria-hidden="true" className="gx-nav-caret">
                    {expanded ? "⌃" : "⌄"}
                  </span>
                </button>
                {expanded ? (
                  <div
                    aria-label={item.label}
                    className="gx-nav-content"
                    role="group"
                  >
                    {item.links.map((link) => (
                      <button
                        className="gx-nav-link"
                        key={link}
                        onClick={() => setOpen(null)}
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
      <p className="gx-nav-note">
        One panel is open at a time; choosing a link closes it. ArrowDown opens
        and focuses the panel surface, not the first link, and a link is a
        button — 0.11.0 has no anchor element.
      </p>
    </div>
  );
}

export const navigationMenuDemoSource = `import { useState } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@gpuixui/components";

export const ProductNav = () => {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <NavigationMenu label="Product" value={open} onValueChange={setOpen}>
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink onSelect={() => go("overview")}>Overview</NavigationMenuLink>
            <NavigationMenuLink onSelect={() => go("runs")}>Runs</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};`;
