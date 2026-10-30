import { createFileRoute } from "@tanstack/react-router";
import { registryContentType } from "@/lib/registry";
import { hasRegistryItem, registryItemJson } from "@/lib/registry-data";

/**
 * `/<name>.json`, one shadcn registry item.
 *
 * The registry is flat, as the directory format asks: every item sits at the
 * site root beside `registry.json`. An unknown name is a 404 rather than an
 * empty document, so a mistyped install command fails where a reader can see it.
 */
export const Route = createFileRoute("/{$name}.json")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const json = hasRegistryItem(params.name)
          ? await registryItemJson(params.name)
          : undefined;
        return json === undefined
          ? new Response("Not found", { status: 404 })
          : new Response(json, {
              headers: { "content-type": registryContentType },
            });
      },
    },
  },
});
