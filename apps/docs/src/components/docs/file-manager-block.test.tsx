import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FileManagerRender,
  FileManagerSurface,
  type FileManagerState,
  fileManagerReducer,
  initialFileManagerState,
  managedFiles,
  selectedFile,
} from "./file-manager-block";

/**
 * The file manager block's rendered states.
 *
 * A browser preview can lose a pane or paint the wrong selection without any
 * build failing, and the right rail is the only place a reader sees what a tile
 * select did. These cases hold the markup to the block's two promises: the
 * three panes and all nine Pictures files are present, and the information rail
 * describes the state's selected file — not the default one.
 */

const noop = () => {};

const render = (state: FileManagerState): string =>
  renderToStaticMarkup(
    <FileManagerSurface
      onSelectFile={noop}
      onSelectLocation={noop}
      onSelectView={noop}
      onToggleRail={noop}
      state={state}
    />,
  );

/** The markup from the first element carrying `marker` to the next close. */
const from = (markup: string, marker: string, close = "</aside>"): string => {
  const start = markup.indexOf(marker);
  return start === -1 ? "" : markup.slice(start, markup.indexOf(close, start));
};

const initial = render(initialFileManagerState);

describe("the file manager preview", () => {
  it("renders the three panes and every file in Pictures", () => {
    expect(initial).toContain('class="gx-fm-side"');
    expect(initial).toContain('class="gx-fm-main"');
    expect(initial).toContain('class="gx-fm-info"');
    expect(initial.match(/class="gx-fm-tile"/g)).toHaveLength(
      managedFiles.length,
    );
    expect(initial).toContain("Pictures");
    expect(initial).toContain("Back to parent folder");
  });

  it("marks one tile selected, and it is the file the rail describes", () => {
    const selectedAt = initial.indexOf('data-selected="true"');
    expect(selectedAt).toBeGreaterThan(-1);
    const tile = initial.slice(
      selectedAt,
      initial.indexOf("</div>", selectedAt),
    );
    expect(tile).toContain("car-driving.jpg");
    expect(initial.match(/data-selected="true"/g)).toHaveLength(1);
  });

  it("describes the selected file's type, size, date and EXIF facts", () => {
    const info = from(initial, 'class="gx-fm-info"');
    expect(info).toContain("car-driving.jpg");
    expect(info).toContain(">Type<");
    expect(info).toContain(">Size<");
    expect(info).toContain("442.4 kb");
    expect(info).toContain("Fri, 07 March 2025, 09:10");
    expect(info).toContain("Contrast");
    expect(info).toContain("ExifFDPointer");
    expect(info).toContain("Download car-driving.jpg");
  });

  it("shows the grid active in the view group", () => {
    expect(initial).toContain('data-view="grid"');
    const views = from(initial, 'class="gx-fm-views"', "</div>");
    expect(views).toContain('aria-label="Grid" aria-pressed="true"');
    expect(views.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("paints the storage meter at sixty percent", () => {
    expect(initial).toContain('role="progressbar"');
    expect(initial).toContain('aria-valuenow="60"');
  });

  it("repaints the information rail when another file is selected", () => {
    const redCar = render({
      ...initialFileManagerState,
      selected: "red-car.jpg",
    });
    const info = from(redCar, 'class="gx-fm-info"');
    expect(info).toContain("red-car.jpg");
    expect(info).toContain("469.6 kb");
    expect(info).not.toContain("442.4 kb");
    expect(
      selectedFile({ ...initialFileManagerState, selected: "red-car.jpg" })
        .size,
    ).toBe("469.6 kb");
  });

  it("switches the tile layout to a list", () => {
    const list = render({ ...initialFileManagerState, view: "list" });
    expect(list).toContain('data-view="list"');
    expect(list.match(/class="gx-fm-tile"/g)).toHaveLength(managedFiles.length);
    expect(list).toContain('aria-label="List" aria-pressed="true"');
  });

  it("moves the breadcrumb with the tree and empties the root", () => {
    const code = render({ ...initialFileManagerState, location: "Code" });
    const crumbs = from(code, 'class="gx-fm-crumbs"', "</div>");
    expect(crumbs).toContain("My files");
    expect(crumbs).toContain("Code");

    const root = render({ ...initialFileManagerState, location: "My files" });
    expect(root).toContain("Choose a folder to browse its files.");
    expect(root.match(/class="gx-fm-tile"/g)).toBeNull();
    const back = from(root, 'class="gx-fm-back"', "</button>");
    expect(back).toContain("disabled");
  });
});

describe("fileManagerReducer", () => {
  it("keeps the other panes when one state changes", () => {
    const selected = fileManagerReducer(initialFileManagerState, {
      type: "select-file",
      id: "florence.jpg",
    });
    expect(selected.selected).toBe("florence.jpg");
    expect(selected.location).toBe("Pictures");

    expect(
      fileManagerReducer(initialFileManagerState, {
        type: "select-view",
        view: "columns",
      }).view,
    ).toBe("columns");
    expect(
      fileManagerReducer(initialFileManagerState, {
        type: "select-location",
        location: "Music",
      }).location,
    ).toBe("Music");
  });

  it("falls back to the selected Pictures file when an id is unknown", () => {
    expect(
      selectedFile({ ...initialFileManagerState, selected: "nope.jpg" }).id,
    ).toBe("car-driving.jpg");
  });

  it("collapses the folder tree to icons and expands it again", () => {
    const collapsed = fileManagerReducer(initialFileManagerState, {
      type: "toggle-rail",
    });
    const markup = render(collapsed);

    expect(collapsed.railCollapsed).toBe(true);
    expect(markup).toContain('data-collapsed="true"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Expand sidebar"');
    expect(markup).toContain('aria-label="Pictures"');
    expect(markup).toContain('class="gx-rail-label">Pictures</span>');
  });
});

describe("the file manager block registration", () => {
  it("renders interactively from its own state", () => {
    expect(renderToStaticMarkup(<FileManagerRender />)).toContain("gx-fm-tile");
  });
});
