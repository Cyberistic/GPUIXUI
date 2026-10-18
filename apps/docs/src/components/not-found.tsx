import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "fumadocs-core/link";
import { baseOptions } from "@/lib/layout.shared";
import { SkipLink } from "./skip-link";

/**
 * The page body, extracted so the default suite can render it without a
 * FrameworkProvider. `NotFound` below puts it inside `HomeLayout`, which owns
 * the page's single `<main>` landmark.
 */
export function NotFoundBody() {
  return (
    <div
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center"
    >
      <h1 className="text-2xl font-medium">Page not found</h1>
      <p className="text-fd-muted-foreground">
        That page does not exist in the GPUIXUI documentation.
      </p>
      <Link href="/docs" className="text-fd-primary underline">
        Back to the docs
      </Link>
    </div>
  );
}

export function NotFound() {
  return (
    <>
      <SkipLink href="#main-content" />
      <HomeLayout {...baseOptions()}>
        <NotFoundBody />
      </HomeLayout>
    </>
  );
}
