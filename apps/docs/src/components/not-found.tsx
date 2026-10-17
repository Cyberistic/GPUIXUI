import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "fumadocs-core/link";
import { baseOptions } from "@/lib/layout.shared";

export function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-medium">Page not found</h1>
        <p className="text-fd-muted-foreground">
          That page does not exist in the GPUIXUI documentation.
        </p>
        <Link href="/docs" className="text-fd-primary underline">
          Back to the docs
        </Link>
      </main>
    </HomeLayout>
  );
}
