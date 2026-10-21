/**
 * Accordion example: a five-question FAQ in single, non-collapsible mode.
 *
 * One answer is always visible, so the page never looks empty; pressing the open
 * question again is deliberately a no-op.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../src/accordion.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

const questions: ReadonlyArray<{
  readonly id: string;
  readonly q: string;
  readonly a: string;
}> = [
  {
    id: "what",
    q: "What is GPUix?",
    a: "A native rendering runtime with a React integration. The components here are host elements, not DOM.",
  },
  {
    id: "themes",
    q: "Can I theme it?",
    a: "Yes. Every colour, spacing step and radius comes from a theme; light, dark and high-contrast are included.",
  },
  {
    id: "keyboard",
    q: "Does it work from the keyboard?",
    a: "Tabs, lists, menus and dialogs all move real focus and expose Enter, Space, arrows, Home and End where they apply.",
  },
  {
    id: "docs",
    q: "Where is the documentation?",
    a: "Each component ships a docs page beside its source, and the examples registry feeds the native playground.",
  },
  {
    id: "limits",
    q: "What does GPUix not support?",
    a: "GPUix has no CSS, no aria-current and no transforms. Each component documents the limitation it hits.",
  },
];

/** The FAQ card. */
export const AccordionExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 560 }}>
      <CardHeader>
        <CardTitle>Frequently asked questions</CardTitle>
        <CardDescription>Five answers, one open at a time</CardDescription>
      </CardHeader>
      <div style={{ padding: theme.spacing.lg, paddingTop: 0 }}>
        <Accordion type="single" collapsible={false} defaultValue="what">
          {questions.map((entry) => (
            <AccordionItem key={entry.id} value={entry.id}>
              <AccordionTrigger>{entry.q}</AccordionTrigger>
              <AccordionContent>
                <text style={{ ...textStyle(theme, "body") }}>{entry.a}</text>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Card>
  );
};
