# ONLYOFFICE Docs Community with edit hooks for the mobile web editors (Signofile build)

This repository is the **Corresponding Source of a modified version** of ONLYOFFICE Docs Community, published under the
GNU Affero General Public License v3 (see `LICENSE`). It contains only our modification: a Dockerfile and a patch set.
The base is the unmodified ONLYOFFICE source and the official `onlyoffice/documentserver` image.

Status: work in progress. The Word editor is done and tested; the Spreadsheet and Presentation editors are not yet.

## What and why
The official Community package ships the three mobile web editors (Word, Cell, Slide) with editing switched off:
`apps/<editor>/mobile/src/lib/patch.jsx` is a 23-line stub in the open-source package (edit feature off, empty toolbar and
context-menu hooks), and the mobile editor shows "you can open documents for viewing only". The Edit and Add screens
themselves are in the public source (`controller/edit`, `view/edit`, `controller/add`, `view/add`, the stores). This build compiles
the mobile apps from the public `ONLYOFFICE/web-apps` tag with our own hook module in place of the stub, plus a small patch,
and overlays only the resulting js bundles on the official image. sdkjs, the server and everything else are the official build.

## This is a modified version
- Base: unmodified `web-apps` tag `v10.0.0.169` and the official image `onlyoffice/documentserver:10.0.0`.
- Changes: (1) `patches/documenteditor/patch.jsx`, our hook module for the Word mobile editor; (2)
  `patches/common/01-no-logo-and-legal-notice.patch`: no ONLYOFFICE logo in the mobile navbar, and a modified-version notice with
  this source link in the About screen.
- The copyright banner at the top of every `app.js` is kept (as in the official package) with an added line that says the
  build is modified. All licence headers in the source files are kept. The About screen keeps the original "Powered by"
  publisher block (Appropriate Legal Notices, AGPL section 5) and adds: modified version, based on ONLYOFFICE Docs,
  (c) Ascensio System SIA, GNU AGPL v3, and the link to this repository.
- Marked as modified: version `10.0.0.169-signofile1` in the About screen and the bundle banner, the file
  `/var/www/onlyoffice/documentserver/SIGNOFILE-MODIFIED.txt` and image labels.
- No trademark rights are granted by the licence. This build does not show the ONLYOFFICE logo and is not sold or branded as ONLYOFFICE.

## Layout
- `Dockerfile` multi-stage build: node 22 builds the mobile bundles from the public tag, the final stage overlays them on the official image.
- `patches/common/*.patch` unified patches applied with `git apply`.
- `patches/<editor>/patch.jsx` hook modules: `documenteditor` done; `spreadsheeteditor` and `presentationeditor` not written yet.

## Build
    docker build -t signofile/documentserver:10.0.0-signofile1 \
      --build-arg EDITORS="word" --build-arg BUILD_SUFFIX=-signofile1 .
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

## Tested so far (Word, version 10.0.0.169-signofile1)
In a phone-size session (iPhone viewport and user agent): no "viewing only" dialog, no ONLYOFFICE logo; after tapping the floating
edit button the Add, Edit, Undo and Redo buttons work; text typed into the document and bold set from the Edit sheet are saved
(the saved docx contains the text, in bold). The Edit sheet shows the Text and Paragraph tabs; the Add sheet lists table, shape,
comment, image, link, page number, break, table of contents, footnote and drawing. Desktop editors are unchanged.

## Not done
- Spreadsheet and Presentation hook modules.
- Edit-mode context menu items (the default view-mode menu with copy, cut, paste, comment and link items is used), comment editing controllers, chart-style hook (the chart pages fetch their own previews).
- ONLYOFFICE sells mobile web editing as a commercial feature. Whether to use this build is a business and licensing decision for whoever runs it.

## Licence
GNU AGPL v3 (`LICENSE`). The files we replace or add carry the original Ascensio System SIA licence header. See the headers for the additional terms of the original files.
