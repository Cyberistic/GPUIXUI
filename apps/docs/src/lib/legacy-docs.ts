import { redirect } from "@tanstack/react-router";

export const legacyDocsRedirect = (splat: string, searchStr: string) =>
  redirect({ href: `/${splat}${searchStr}`, statusCode: 301 });
