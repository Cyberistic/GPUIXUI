import { createFileRoute } from "@tanstack/react-router";
import { registryContentType } from "@/lib/registry";
import { registryIndex } from "@/lib/registry-data";

/**
 * `/registry.json`, the shadcn registry index.
 *
 * Generated from the component pages and sources at build time
 * (`registry-source.ts`) and prerendered with the site, so the file a registry
 * reader fetches is the one the build wrote.
 */
export const Route = createFileRoute("/registry.json")({
  server: {
    handlers: {
      GET: () =>
        new Response(registryIndex, {
          headers: { "content-type": registryContentType },
        }),
    },
  },
});
