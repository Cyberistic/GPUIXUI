import { useReducer } from "react";
import { BlockIcon } from "./block-icons";
import { RailToggle } from "./sidebar-rail";

/**
 * File manager block — `/docs/blocks/file-manager`.
 *
 * A three-pane browser: a folder tree, a folder of image tiles and the selected
 * file's facts. Like every block, `FileManagerRender` reproduces the native
 * geometry in the browser; `fileManagerSource` is the `@gpuixui/*` recipe a
 * consumer copies.
 *
 * The state lives in `fileManagerReducer`, so the preview's two promises — a
 * tile select repaints the information pane, and a view button changes the
 * layout — are table-tested without a DOM.
 */

export type FileView = "eye" | "list" | "grid" | "columns";

export const fileFolders = [
  "Books",
  "Code",
  "Documents",
  "Icons",
  "Music",
  "Pictures",
] as const;

export type FileFolder = (typeof fileFolders)[number];

/** The tree's root; it has no files of its own. */
export type FileLocation = "My files" | FileFolder;

export interface ManagedFile {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly size: string;
  readonly tone: number;
}

const carDriving: ManagedFile = {
  id: "car-driving.jpg",
  name: "car-driving.jpg",
  type: "JPG",
  size: "442.4 kb",
  tone: 1,
};

/** The Pictures folder, in the order the grid lays it out. */
export const managedFiles: ReadonlyArray<ManagedFile> = [
  {
    id: "cadillac.jpg",
    name: "cadillac.jpg",
    type: "JPG",
    size: "512.8 kb",
    tone: 0,
  },
  carDriving,
  {
    id: "city-traffic.jpg",
    name: "city-traffic.jpg",
    type: "JPG",
    size: "386.1 kb",
    tone: 2,
  },
  {
    id: "copenhagen.jpg",
    name: "copenhagen.jpg",
    type: "JPG",
    size: "604.2 kb",
    tone: 3,
  },
  {
    id: "evening-street.jpg",
    name: "evening-street.jpg",
    type: "JPG",
    size: "298.7 kb",
    tone: 4,
  },
  {
    id: "florence.jpg",
    name: "florence.jpg",
    type: "JPG",
    size: "731.5 kb",
    tone: 0,
  },
  {
    id: "ice-cream.jpg",
    name: "ice-cream.jpg",
    type: "JPG",
    size: "254.9 kb",
    tone: 2,
  },
  {
    id: "old-city.jpg",
    name: "old-city.jpg",
    type: "JPG",
    size: "817.3 kb",
    tone: 3,
  },
  {
    id: "red-car.jpg",
    name: "red-car.jpg",
    type: "JPG",
    size: "469.6 kb",
    tone: 4,
  },
];

export interface FileManagerState {
  readonly location: FileLocation;
  readonly selected: string;
  readonly view: FileView;
  readonly railCollapsed: boolean;
}

export const initialFileManagerState: FileManagerState = {
  location: "Pictures",
  selected: carDriving.id,
  view: "grid",
  railCollapsed: false,
};

export type FileManagerAction =
  | { readonly type: "select-file"; readonly id: string }
  | { readonly type: "select-location"; readonly location: FileLocation }
  | { readonly type: "select-view"; readonly view: FileView }
  | { readonly type: "toggle-rail" };

export const fileManagerReducer = (
  state: FileManagerState,
  action: FileManagerAction,
): FileManagerState => {
  if (action.type === "select-file") {
    return { ...state, selected: action.id };
  }
  if (action.type === "select-location") {
    return { ...state, location: action.location };
  }
  if (action.type === "toggle-rail") {
    return { ...state, railCollapsed: !state.railCollapsed };
  }
  return { ...state, view: action.view };
};

/** The file the information pane describes; `carDriving` is always present. */
export const selectedFile = (state: FileManagerState): ManagedFile =>
  managedFiles.find((file) => file.id === state.selected) ?? carDriving;

const viewButtons: ReadonlyArray<{
  readonly view: FileView;
  readonly icon: "eye" | "list" | "grid" | "columns";
  readonly label: string;
}> = [
  { view: "eye", icon: "eye", label: "Large thumbnails" },
  { view: "list", icon: "list", label: "List" },
  { view: "grid", icon: "grid", label: "Grid" },
  { view: "columns", icon: "columns", label: "Columns" },
];

const facts = (file: ManagedFile) => [
  { label: "Type", value: file.type },
  { label: "Size", value: file.size },
  { label: "Date", value: "Fri, 07 March 2025, 09:10" },
  { label: "Contrast", value: "2" },
  { label: "ExifFDPointer", value: "26" },
];

export interface FileManagerSurfaceProps {
  readonly state: FileManagerState;
  readonly onSelectFile: (id: string) => void;
  readonly onSelectLocation: (location: FileLocation) => void;
  readonly onSelectView: (view: FileView) => void;
  readonly onToggleRail: () => void;
}

/** The browser at a given state; `FileManagerRender` owns the reducer. */
export function FileManagerSurface({
  state,
  onSelectFile,
  onSelectLocation,
  onSelectView,
  onToggleRail,
}: FileManagerSurfaceProps) {
  const file = selectedFile(state);
  const atRoot = state.location === "My files";

  return (
    <div className="gx-fm">
      <header className="gx-fm-top">
        <h3 className="gx-fm-title">Files</h3>
        <label className="gx-fm-search">
          <BlockIcon name="search" size={13} />
          <input
            aria-label="Search files"
            className="gx-fm-search-input"
            placeholder="Search"
            type="search"
          />
        </label>
        <div aria-label="View" className="gx-fm-views" role="group">
          {viewButtons.map((button) => (
            <button
              aria-label={button.label}
              aria-pressed={state.view === button.view}
              className="gx-fm-view"
              data-active={state.view === button.view}
              key={button.view}
              onClick={() => onSelectView(button.view)}
              title={button.label}
              type="button"
            >
              <BlockIcon name={button.icon} size={14} />
            </button>
          ))}
        </div>
      </header>

      <div className="gx-fm-body">
        <aside
          aria-label="Folders"
          className="gx-fm-side"
          data-collapsed={state.railCollapsed}
        >
          <RailToggle
            className="gx-fm-collapse"
            collapsed={state.railCollapsed}
            onToggle={onToggleRail}
          />
          <button
            aria-label="Add new item"
            className="gx-btn gx-btn-primary gx-btn-sm gx-fm-add"
            type="button"
          >
            <BlockIcon name="plus" size={13} />
            <span className="gx-rail-label">Add New</span>
          </button>
          <button
            aria-label="My files"
            className="gx-fm-root"
            data-active={atRoot}
            onClick={() => onSelectLocation("My files")}
            type="button"
          >
            <BlockIcon name="folder" size={14} />
            <span className="gx-rail-label">My files</span>
          </button>
          <nav className="gx-fm-tree">
            {fileFolders.map((folder) => (
              <button
                aria-current={state.location === folder ? "true" : undefined}
                aria-label={folder}
                className="gx-fm-folder"
                data-active={state.location === folder}
                key={folder}
                onClick={() => onSelectLocation(folder)}
                type="button"
              >
                <BlockIcon name="folder" size={14} />
                <span className="gx-rail-label">{folder}</span>
              </button>
            ))}
          </nav>
          <div className="gx-fm-storage gx-rail-label">
            <span className="gx-fm-storage-row">
              <span>Storage</span>
              <span className="gx-fm-storage-value">58.7 GB of 100 GB</span>
            </span>
            <span
              aria-label="Storage used"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={60}
              className="gx-fm-track"
              role="progressbar"
            >
              <span className="gx-fm-fill" />
            </span>
          </div>
        </aside>

        <main className="gx-fm-main">
          <div className="gx-fm-crumbs">
            <button
              className="gx-fm-crumb"
              disabled={atRoot}
              onClick={() => onSelectLocation("My files")}
              type="button"
            >
              My files
            </button>
            {atRoot ? null : (
              <>
                <span aria-hidden="true" className="gx-fm-sep">
                  <BlockIcon name="chevronRight" size={11} />
                </span>
                <span aria-current="page" className="gx-fm-here">
                  {state.location}
                </span>
              </>
            )}
          </div>
          <button
            className="gx-fm-back"
            disabled={atRoot}
            onClick={() => onSelectLocation("My files")}
            type="button"
          >
            Back to parent folder
          </button>

          {atRoot ? (
            <p className="gx-fm-empty">Choose a folder to browse its files.</p>
          ) : (
            <div className="gx-fm-tiles" data-view={state.view}>
              {managedFiles.map((entry) => (
                <div
                  className="gx-fm-tile"
                  data-selected={entry.id === state.selected}
                  key={entry.id}
                >
                  <button
                    aria-pressed={entry.id === state.selected}
                    className="gx-fm-pick"
                    onClick={() => onSelectFile(entry.id)}
                    type="button"
                  >
                    <span className="gx-fm-thumb" data-tone={entry.tone} />
                    <span className="gx-fm-name">{entry.name}</span>
                    <span className="gx-fm-meta">
                      {entry.type} · {entry.size}
                    </span>
                  </button>
                  <button
                    aria-label={`Actions for ${entry.name}`}
                    className="gx-fm-menu"
                    type="button"
                  >
                    …
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside aria-label="File information" className="gx-fm-info">
          <span className="gx-fm-preview" data-tone={file.tone} />
          <div className="gx-fm-info-head">
            <p className="gx-fm-filename">{file.name}</p>
            <button
              aria-label={`Download ${file.name}`}
              className="gx-fm-download"
              type="button"
            >
              <BlockIcon name="download" size={14} />
            </button>
          </div>
          <p className="gx-fm-label">Information</p>
          <dl className="gx-fm-facts">
            {facts(file).map((fact) => (
              <div className="gx-fm-fact" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}

/** The block's preview: the reducer, then the surface at its current state. */
export function FileManagerRender() {
  const [state, dispatch] = useReducer(
    fileManagerReducer,
    initialFileManagerState,
  );

  return (
    <FileManagerSurface
      onSelectFile={(id) => dispatch({ type: "select-file", id })}
      onSelectLocation={(location) =>
        dispatch({ type: "select-location", location })
      }
      onSelectView={(view) => dispatch({ type: "select-view", view })}
      onToggleRail={() => dispatch({ type: "toggle-rail" })}
      state={state}
    />
  );
}

export const fileManagerPackages = [
  "@gpuixui/components",
  "@gpuixui/primitives",
  "@gpuixui/icons",
] as const;

/** The recipe a consumer copies. */
export const fileManagerSource = `import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@gpuixui/components/breadcrumb";
import { SearchInput } from "@gpuixui/components/search-input";
import { Box, Button, Progress, ScrollArea, Stack, Text, useTheme } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";
import { seriesColors } from "@gpuixui/tokens";

const folders = ["Books", "Code", "Documents", "Icons", "Music", "Pictures"];
const files = [
  { name: "cadillac.jpg", size: "512.8 kb" },
  { name: "car-driving.jpg", size: "442.4 kb" },
  { name: "city-traffic.jpg", size: "386.1 kb" },
  // …the rest of Pictures
];

export function FileManagerPage() {
  const series = seriesColors(useTheme());

  return (
    <Stack direction="row" grow style={{ height: 600 }}>
      <Stack direction="column" gap="sm" style={{ width: 200, padding: 12 }}>
        <Button variant="primary">
          <Icon name="plus" /> Add New
        </Button>
        <Text role="label">My files</Text>
        {folders.map((folder) => (
          <Button key={folder} variant={folder === "Pictures" ? "secondary" : "ghost"}>
            <Icon name="folder" /> {folder}
          </Button>
        ))}
        <Stack direction="column" gap="2xs" style={{ marginTop: "auto" }}>
          <Text role="caption" tone="muted">Storage · 58.7 GB of 100 GB</Text>
          <Progress value={60} label="Storage used" />
        </Stack>
      </Stack>

      <Stack direction="column" grow gap="md" style={{ padding: 16 }}>
        <SearchInput placeholder="Search files" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink>My files</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Pictures</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Stack direction="row" gap="md">
          {files.map((file) => (
            <Button key={file.name} variant="ghost" onActivate={() => select(file.name)}>
              <Stack direction="column" gap="2xs" style={{ width: 160 }}>
                {/* A picture is a 4:3 preview surface; the recipe paints the
                    theme's series pairs as the placeholder until a thumbnail loads. */}
                <Box style={{ aspectRatio: "4 / 3", borderRadius: 8, backgroundColor: series[1] }} />
                <Text role="label">{file.name}</Text>
                <Text role="caption" tone="muted">{file.size}</Text>
              </Stack>
            </Button>
          ))}
        </Stack>
      </Stack>

      <Stack direction="column" gap="sm" style={{ width: 320, padding: 16 }}>
        <Text role="h3">{selected.name}</Text>
        <Button variant="outline"><Icon name="download" /> Download</Button>
        <Text role="label">Information</Text>
        {facts.map((fact) => (
          <Stack direction="row" justify="between" key={fact.label}>
            <Text role="caption" tone="muted">{fact.label}</Text>
            <Text role="caption">{fact.value}</Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

// A file's metadata is the app's: type, size, date, contrast and
// ExifFDPointer come from whatever the folder scan returned.`;
