/** @jsxImportSource @gpuix/react */
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../src/navigation-menu.js";

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
