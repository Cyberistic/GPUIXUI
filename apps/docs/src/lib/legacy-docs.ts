import { redirect } from "@tanstack/react-router";

/**
 * The 301 a retired `/docs` address answers with.
 *
 * The docs render at the site root, so `/docs` lands on the landing (`splat`
 * empty) and `/docs/<path>` on `/<path>`. The reader's query travels with the
 * redirect, so a `?q=` filter or a live scene survives the move.
 */
export const legacyDocsRedirect = (splat: string, searchStr: string) =>
  redirect({ href: `/${splat}${searchStr}`, statusCode: 301 });
