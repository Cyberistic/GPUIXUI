import { useState } from "react";
import { ReorderableTabs, type ReorderableTab } from "./reorderable-tabs";
import { closedTabs } from "./reorderable-tabs-logic";

const FILES: ReadonlyArray<ReorderableTab> = [
  { id: "page.tsx", label: "page.tsx" },
  { id: "button.tsx", label: "button.tsx" },
  { id: "theme.ts", label: "theme.ts" },
];

export function EditorTabsPreview() {
  const [tabs, setTabs] = useState<ReadonlyArray<ReorderableTab>>(FILES);
  const [active, setActive] = useState<string | null>("page.tsx");
  const [closes, setCloses] = useState(0);

  const close = (id: string): void => {
    const next = closedTabs(tabs, id);
    setTabs(next.tabs);
    setCloses((count) => count + 1);
    if (active === id) setActive(next.active);
  };

  const reset = (): void => {
    setTabs(FILES);
    setActive(FILES[0]?.id ?? null);
    setCloses(0);
  };

  return (
    <div className="gx-editor-tabs not-prose">
      <ReorderableTabs
        active={active}
        className="gx-editor-tabs-rail"
        closeClassName="gx-editor-tabs-close"
        label="Open editor files"
        onActivate={setActive}
        onClose={close}
        onReorder={setTabs}
        tabClassName="gx-editor-tabs-tab"
        tabs={tabs}
      />
      <div className="gx-editor-tabs-panel">
        {active === null ? (
          <p className="gx-editor-tabs-empty">
            Every file is closed. Open one to keep going.
          </p>
        ) : (
          <div className="gx-editor-tabs-line">
            <span>{active}</span>
            <span className="gx-editor-tabs-dim">
              {closes === 0 ? "drag a tab, or Alt + ← / →" : `${closes} closed`}
            </span>
          </div>
        )}
        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={reset}
          type="button"
        >
          Reopen all
        </button>
      </div>
      <p className="gx-editor-tabs-hint">
        Tabs reorder with the pointer and with <kbd>Alt</kbd> + <kbd>←</kbd>/
        <kbd>→</kbd>; <kbd>×</kbd> closes one. A browser preview of the editor
        on the landing page.
      </p>
    </div>
  );
}

export const editorTabsPreviewSource = `import { ReorderableTabs } from "@/components/docs/reorderable-tabs";
import { closedTabs } from "@/components/docs/reorderable-tabs-logic";

const [tabs, setTabs] = useState(openFiles);
const [active, setActive] = useState("page.tsx");

<ReorderableTabs
  active={active}
  label="Open editor files"
  onActivate={setActive}
  onClose={(id) => {
    const next = closedTabs(tabs, id);
    setTabs(next.tabs);
    if (active === id) setActive(next.active);
  }}
  onReorder={setTabs}
  tabs={tabs}
/>;`;
