import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import { demos } from "./demos";

/**
 * The component page preview: a live browser rendering and the native usage
 * side by side, exactly as shadcn/ui pairs Preview and Code.
 */
export function ComponentPreview({ name }: { name: string }) {
  const demo = demos[name];
  if (demo === undefined) {
    throw new Error(`ComponentPreview: no demo named "${name}"`);
  }

  return (
    <div className="gx-component not-prose">
      <Tabs defaultValue="preview" className="gx-component-tabs">
        <div className="gx-component-bar">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="gx-component-panel" value="preview">
          <div className="gx-demo">{demo.render()}</div>
        </TabsContent>
        <TabsContent
          className="gx-component-panel gx-component-code"
          value="code"
        >
          <DynamicCodeBlock lang="tsx" code={demo.source} />
        </TabsContent>
      </Tabs>
      <p className="gx-component-note">
        Browser preview: the geometry, palette and states of the native
        component. The shipped component renders through GPUix, not the DOM.
      </p>
    </div>
  );
}
