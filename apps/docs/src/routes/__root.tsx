import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import appCss from "@/styles/app.css?url";
import { PlatformProvider } from "@/platform/platform-provider";
import { SearchFocusRestore } from "@/search/search-focus";
import { siteHead, THEME_COLOR_META } from "@/lib/site-head";

export const Route = createRootRoute({
  head: () => siteHead(appCss),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {THEME_COLOR_META.map((entry) => (
          <meta
            key={entry.media}
            name="theme-color"
            media={entry.media}
            content={entry.content}
          />
        ))}
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <SearchFocusRestore />
          <PlatformProvider>
            <Outlet />
          </PlatformProvider>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
