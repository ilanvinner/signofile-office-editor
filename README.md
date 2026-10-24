# ONLYOFFICE Docs Community with edit hooks for the mobile web editors and no header logo in the desktop editors (Signofile build)

This repository is the **Corresponding Source of a modified version** of ONLYOFFICE Docs Community, published under the
GNU Affero General Public License v3 (see `LICENSE`). It contains only our modification: a Dockerfile and a patch set.
The base is the unmodified ONLYOFFICE source and the official `onlyoffice/documentserver` image.

Status: work in progress. The Word, Spreadsheet and Presentation mobile editors each have their hook module and a phone-size edit-and-save test (see "Tested so far").

## What and why
The official Community package ships the three mobile web editors (Word, Cell, Slide) with editing switched off:
`apps/<editor>/mobile/src/lib/patch.jsx` is a 23-line stub in the open-source package (edit feature off, empty toolbar and
context-menu hooks), and the mobile editor shows "you can open documents for viewing only". The Edit and Add screens
themselves are in the public source (`controller/edit`, `view/edit`, `controller/add`, `view/add`, the stores). This build compiles
the mobile apps from the public `ONLYOFFICE/web-apps` tag with our own hook module in place of the stub, plus a small patch,
and overlays only the resulting js bundles on the official image. sdkjs, the server and everything else are the official build.

## This is a modified version
- Base: unmodified `web-apps` tag `v10.0.0.169` and the official image `onlyoffice/documentserver:10.0.0`.
- Changes: (0) `patches/desktop/01-no-header-logo-and-modified-notice.patch` (2026-10-24): in the desktop editors (Word, Spreadsheet, Presentation share these two files) the ONLYOFFICE logo is not shown in the editor header, and the About panel gets a notice that this is a modified version, with the dates of the modifications and the link to this source; the About panel still shows the original ONLYOFFICE logo, the publisher block and the version. (1) `patches/<editor>/patch.jsx`, our hook modules for the Word, Spreadsheet (Cell) and Presentation (Slide) mobile editors; (2)
  `patches/common/01-no-logo-and-legal-notice.patch`: no ONLYOFFICE logo in the mobile navbar, and a modified-version notice with
  this source link in the About screen.
- The copyright banner at the top of every `app.js` is kept (as in the official package) with an added line that says the
  build is modified. All licence headers in the source files are kept. The About screen keeps the original "Powered by"
  publisher block (Appropriate Legal Notices, AGPL section 5) and adds: modified version, based on ONLYOFFICE Docs,
  (c) Ascensio System SIA, GNU AGPL v3, and the link to this repository.
- Marked as modified: version `10.0.0.169-signofile1` in the About screen and the bundle banner, the file
  `/var/www/onlyoffice/documentserver/SIGNOFILE-MODIFIED.txt` and image labels.
- No trademark rights are granted by the licence (Additional Terms, section 4). This build does not show the ONLYOFFICE logo in the editor header and is not sold or branded as ONLYOFFICE; the About panel identifies ONLYOFFICE (Ascensio System SIA) as the original developer, says this is a modified version, lists the dates of the modifications (2026-10-23 mobile edit hooks, 2026-10-24 header logo) and links this source, as the Additional Terms (sections 1 to 3) require. `LICENSE` is the upstream file including those Additional Terms.

## Layout
- `patches/desktop/*.patch` unified patches (`patch -p1`) for two source files of the official image, `apps/common/main/lib/view/Header.js` and `About.js`; the Dockerfile applies them to the official image's copies of those files (they carry the package's filled-in placeholders) and replaces them, deleting their stale `.gz`.
- `Dockerfile` multi-stage build: node 22 builds the mobile bundles from the public tag, the final stage overlays them on the official image.
- `patches/common/*.patch` unified patches applied with `git apply`.
- `patches/<editor>/patch.jsx` hook modules for `documenteditor`, `spreadsheeteditor` and `presentationeditor`.

## Build
    docker build -t signofile/documentserver:10.0.0-signofile1 \
      --build-arg EDITORS="word cell slide" --build-arg BUILD_SUFFIX=-signofile1 .
Build args: `WEBAPPS_TAG`, `PRODUCT_VERSION`, `BUILD_NUMBER` (must match the official image), `BUILD_SUFFIX`, `SOURCE_URL`
(the link shown in About), `PATCHES` (`ours` or `stub`), `EDITORS` (words: `word cell slide`), `DS_IMAGE`.

Parity check of the toolchain: build with `--target out --build-arg PATCHES=stub --build-arg EDITORS=word --output type=local,dest=./out`
and compare `out/documenteditor/js/app.js` with the official image's
`/var/www/onlyoffice/documentserver/web-apps/apps/documenteditor/mobile/dist/js/app.js`: they are identical after the official
copyright banner. Check this again for each new version before trusting a rebuild.

## How the integration must be configured
The mobile editor opens read-only and shows a floating edit button; tapping it is what lifts the viewer restriction. Use the
normal config (`type: "mobile"`, `editorConfig.mode: "edit"`, `document.permissions.edit: true`). Do **not** set
`customization.mobile.forceView` to `false`: the app then shows the edit toolbar while the editor core stays read-only (the app
applies the view restriction itself when the document is opened, and only the edit button removes it).

## Re-apply steps for each ONLYOFFICE update
1. Pick the new `web-apps` tag (`git ls-remote --tags https://github.com/ONLYOFFICE/web-apps.git`) that matches the new image's version and build number.
2. Run the parity build with `PATCHES=stub` and the new `PRODUCT_VERSION` / `BUILD_NUMBER`; compare with the new image's `app.js` as above. If they differ, the toolchain changed: fix that first.
3. Check that the hook interface did not change: the stub `src/lib/patch.jsx` and every use of `EditorUIController` in `controller/Main.jsx`, `controller/ContextMenu.jsx`, `view/Toolbar.jsx` and `store/focusObjects.js`.
4. Check that `git apply` still works for the common patches (`page/main.jsx` logo toggle, `lib/view/About.jsx`).
5. Rebuild, run a phone-size edit-and-save test (tap the edit button, type, bold through the Edit sheet, force-save, open the saved file), then bump `BUILD_SUFFIX`.

## Tested so far (version 10.0.0.169-signofile1, phone-size session: iPhone viewport and user agent, headless Chrome)
- Word: no "viewing only" dialog and no ONLYOFFICE logo; after tapping the floating edit button the Add, Edit, Undo and Redo
  buttons work; text typed into the document and bold set from the Edit sheet are saved (the saved docx contains the text, in
  bold). The Edit sheet shows the Text and Paragraph tabs; the Add sheet lists table, shape, comment, image, link, page number, break,
  table of contents, footnote and drawing.
- Presentation: Add, Edit and Undo buttons; the Edit sheet shows the Slide tab (theme, layout, transitions, background, duplicate and
  delete slide); "Duplicate Slide" from the Edit sheet turned a 1-slide file into a saved 2-slide file.
- Spreadsheet: Add, Edit and Undo buttons; the Edit sheet shows the Cell tab (font, bold/italic/underline/strike, text and fill colour,
  text format, border style, number format, cell style); the Add sheet lists the functions, image, comment, sort and filter, link, table
  and drawing; bold set on a selected cell from the Edit sheet is saved (cell A5 bold, A1 not).
- Desktop editors are unchanged.

## Not done
- Edit-mode context menu items (the default view-mode menu with copy, cut, paste, comment and link items is used), comment editing
  controllers, chart-style hooks (the chart pages fetch their own previews), and Cell's formula-bar and cell-text editing flows have
  not been exercised beyond the checks above. Only a small set of edits was tested per editor, not every Edit and Add page.
- ONLYOFFICE sells mobile web editing as a commercial feature. Whether to use this build is a business and licensing decision for whoever runs it.

## Licence
GNU AGPL v3 (`LICENSE`). The files we replace or add carry the original Ascensio System SIA licence header. See the headers for the additional terms of the original files.

## Tested: desktop editors (version 10.0.0.169-signofile2, 2026-10-24)
- Word, desktop size, headless Chrome through our own host page: no ONLYOFFICE logo in the header; typing, forcesave and the callback work (a saved docx contains the typed text); the About panel (left bar, info icon) shows the original ONLYOFFICE logo and publisher block, "Version 10.0.0.169-signofile2", and the modified-version notice with dates and this link.
- Phone-size session: unchanged from signofile1 (the mobile bundles are rebuilt from the same patches).
- Spreadsheet and Presentation use the same two patched files (`apps/common/main/lib/view/Header.js`, `About.js`); they were not opened separately.

## Device pixel ratio cap (2026-10-25, version 10.0.0.169-signofile3)
`patches/common/02-cap-device-pixel-ratio.patch` adds `apps/common/mobile/utils/dprCap.js` as the first import of the Word, Spreadsheet and Presentation **mobile** editors: where the real `window.devicePixelRatio` is above 2 it is reported as 2 (inside the editor frame, before the SDK reads it; a try/catch keeps the real value if the browser refuses). Reason (measured on a ~40-page Word file, iPhone-size emulation at 3x with CPU throttling): the editors draw on canvases whose backing store is cssSize x ratio, and the canvas pixel count was the dominant scroll cost; capping at 2 cut renderer CPU while scrolling by about 45% and the share of long frames from about 3-5% to about 1%. Cost: pages are drawn at 2x and scaled to the screen, so text is slightly softer on 3x screens. No effect on screens at 2x or below, and none on the desktop editors. The About notice lists the dates of all modifications.
Checked on the built image: with the editor frame forced to a 3x ratio before any script runs, the mobile editor reports 2 and its main canvas is 780x1688 for a 390-wide view.
