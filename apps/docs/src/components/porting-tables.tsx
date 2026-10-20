import { Link } from "fumadocs-core/link";
import type { ReactNode } from "react";
import { bySlug } from "@/component-meta/registry";
import { roadmapTargets } from "@/lib/roadmap.generated";
import {
  portedComponents,
  portedConcepts,
  unportedComponents,
} from "@/lib/porting";

const scroll = "my-3 overflow-x-auto";
const table = "w-full text-left text-sm";
const head = "border-b border-fd-border text-fd-muted-foreground";
const bodyRow = "border-b border-fd-border align-top last:border-0";
const cell = "py-2 pr-4";
const link = "font-medium hover:underline";

const Region = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => (
  <div className={scroll} role="region" aria-label={label} tabIndex={0}>
    {children}
  </div>
);

/**
 * The shadcn/ui component mapping (plan 611). Every row resolves through the
 * registry, so the table cannot point at a component that was renamed or
 * removed; the guard in `porting-page.test.tsx` compares it with `bySlug`.
 */
export function PortingComponents() {
  return (
    <Region label="shadcn/ui components and their counterparts here">
      <table className={table} data-porting-components>
        <thead>
          <tr className={head}>
            <th className={cell}>shadcn/ui</th>
            <th className={cell}>Here</th>
            <th className="py-2">What differs</th>
          </tr>
        </thead>
        <tbody>
          {portedComponents.map((component) => {
            const record = bySlug.get(component.slug);
            return (
              <tr
                key={component.shadcn}
                data-porting-from={component.shadcn}
                className={bodyRow}
              >
                <td className={`${cell} font-medium`}>{component.shadcn}</td>
                <td className={cell}>
                  <Link
                    href={`/docs/components/${component.slug}`}
                    className={link}
                  >
                    {record?.title ?? component.slug}
                  </Link>
                </td>
                <td className="py-2 text-fd-muted-foreground">
                  {component.note}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Region>
  );
}

/**
 * The React idioms that do not survive the move (plan 611). Each row names the
 * file that proves the replacement and the page that explains it; both are
 * resolved by the guard.
 */
export function PortingConcepts() {
  return (
    <Region label="shadcn/ui idioms and what replaces them here">
      <table className={table} data-porting-concepts>
        <thead>
          <tr className={head}>
            <th className={cell}>You may type</th>
            <th className={cell}>In shadcn/ui</th>
            <th className={cell}>Here</th>
            <th className="py-2">Explained by</th>
          </tr>
        </thead>
        <tbody>
          {portedConcepts.map((concept) => (
            <tr
              key={concept.concept}
              data-porting-concept={concept.concept}
              className={bodyRow}
            >
              <td className={`${cell} font-medium`}>{concept.concept}</td>
              <td className={`${cell} text-fd-muted-foreground`}>
                {concept.shadcn}
              </td>
              <td className={`${cell} text-fd-muted-foreground`}>
                {concept.here}
              </td>
              <td className="py-2">
                <Link href={concept.href} className={link}>
                  {concept.href}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Region>
  );
}

/**
 * The components with no counterpart yet (plan 611). A row names a real Tier
 * 3–5 target and shows its inventory status, so the table cannot call a
 * delivered component missing; `porting-page.test.tsx` fails when the target
 * ships or its status changes.
 */
export function PortingGaps() {
  return (
    <Region label="shadcn/ui components with no counterpart yet">
      <table className={table} data-porting-gaps>
        <thead>
          <tr className={head}>
            <th className={cell}>shadcn/ui</th>
            <th className={cell}>Roadmap target</th>
            <th className={cell}>Status</th>
            <th className="py-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {unportedComponents.map((component) => {
            const target = roadmapTargets.find(
              (entry) => entry.name === component.roadmap,
            );
            return (
              <tr
                key={component.shadcn}
                data-porting-gap={component.shadcn}
                className={bodyRow}
              >
                <td className={`${cell} font-medium`}>{component.shadcn}</td>
                <td className={cell}>
                  <Link href="/docs/roadmap" className={link}>
                    {component.roadmap}
                  </Link>
                </td>
                <td className={`${cell} text-fd-muted-foreground`}>
                  {target?.status ?? "unrecorded"}
                </td>
                <td className="py-2 text-fd-muted-foreground">
                  {component.note}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Region>
  );
}
