/**
 * Navigation menu example: a product nav with two panels.
 *
 * One panel is open at a time. Links are buttons because 0.10.0 has no anchor or
 * href; `onSelect` is where the example would navigate.
 */

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../src/navigation-menu.js";

/** A two-item navigation with real panels. */
export const NavigationMenuExample = () => (
  <div style={{ padding: 24 }}>
    <NavigationMenu label="Product">
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink onSelect={() => undefined}>
              Overview
            </NavigationMenuLink>
            <NavigationMenuLink onSelect={() => undefined}>
              Runtime
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="pricing">
          <NavigationMenuTrigger>Pricing</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink onSelect={() => undefined}>
              Plans
            </NavigationMenuLink>
            <NavigationMenuLink onSelect={() => undefined}>
              Enterprise
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
);
