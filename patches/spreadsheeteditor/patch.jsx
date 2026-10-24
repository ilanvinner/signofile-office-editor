/*
 * Copyright (C) Ascensio System SIA, 2009-2026
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation, together with the
 * additional terms provided in the LICENSE file.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA by email at info@onlyoffice.com
 * or by postal mail at 20A-6 Ernesta Birznieka-Upisha Street, Riga,
 * LV-1050, Latvia, European Union.
 *
 * The interactive user interfaces in modified versions of the Program
 * are required to display Appropriate Legal Notices in accordance with
 * Section 5 of the GNU AGPL version 3.
 *
 * No trademark rights are granted under this License.
 *
 * All non-code elements of the Product, including illustrations,
 * icon sets, and technical writing content, are licensed under the
 * Creative Commons Attribution-ShareAlike 4.0 International License:
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * This license applies only to such non-code elements and does not
 * modify or replace the licensing terms applicable to the Program's
 * source code, which remains licensed under the GNU Affero General
 * Public License v3.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Signofile modification: the open-source package ships this module as a stub (edit feature off). This file
 * provides the hooks the public Cell mobile editor already calls (src/controller/Main.jsx, src/view/Toolbar.jsx and the
 * stores), written for this build from the public interfaces. It turns the mobile edit feature on. It contains no code
 * from the commercial ONLYOFFICE edition. This is a modified version of the Program.
 */

import React, { Fragment } from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../../../common/mobile/utils/device';
import SvgIcon from '@common/lib/component/SvgIcon';
import IconPlusIos from '@common-ios-icons/icon-plus.svg?ios';
import IconPlusAndroid from '@common-android-icons/icon-plus.svg';
import IconEditSettingsIos from '@common-ios-icons/icon-edit-settings.svg?ios';
import IconEditSettingsAndroid from '@common-android-icons/icon-edit-settings.svg';
import IconUndoIos from '@common-ios-icons/icon-undo.svg?ios';
import IconUndoAndroid from '@common-android-icons/icon-undo.svg';
import IconRedoIos from '@common-ios-icons/icon-redo.svg?ios';
import IconRedoAndroid from '@common-android-icons/icon-redo.svg';

const icon = (ios, android) => (
    <SvgIcon slot="media" symbolId={(Device.ios ? ios : android).id} className={'icon icon-svg'} />
);

const EditorUIController = () => {
    return null
};

EditorUIController.isSupportEditFeature = () => {
    return true
};

// The Cell toolbar asks for its buttons through `toolbarOptions`.
EditorUIController.toolbarOptions = {
    // undo / redo buttons of the toolbar
    getUndoRedo: ({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) => (
        <Fragment>
            <Link key='undo-link' id='btn-undo' iconOnly href={false} className={disabledUndo ? 'disabled' : ''} onClick={onUndoClick}>
                {icon(IconUndoIos, IconUndoAndroid)}
            </Link>
            <Link key='redo-link' id='btn-redo' iconOnly href={false} className={disabledRedo ? 'disabled' : ''} onClick={onRedoClick}>
                {icon(IconRedoIos, IconRedoAndroid)}
            </Link>
        </Fragment>
    ),
    // the Add and Edit buttons: they open the Add / Edit sheets the app already has
    getEditOptions: ({ disabledEdit, disabledAdd, onEditClick, onAddClick }) => (
        <Fragment>
            <Link key='add-link' id='btn-add' iconOnly href={false} className={disabledAdd ? 'disabled' : ''} onClick={onAddClick}>
                {icon(IconPlusIos, IconPlusAndroid)}
            </Link>
            <Link key='edit-link' id='btn-edit' iconOnly href={false} className={disabledEdit ? 'disabled' : ''} onClick={onEditClick}>
                {icon(IconEditSettingsIos, IconEditSettingsAndroid)}
            </Link>
        </Fragment>
    ),
};

// fonts (the font lists of the text pages and the cell pages)
EditorUIController.initFonts = (props) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorFonts', (fonts, select) => {
        props.storeTextSettings.initEditorFonts(fonts, select);
        props.storeCellSettings.initEditorFonts(fonts, select);
    });
};

// cell styles (Edit > Cell > Cell styles)
EditorUIController.initEditorStyles = (storeCellSettings) => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onInitEditorStyles', (styles) => {
        const list = [];
        (styles || []).forEach((style) => list.push({ name: style.asc_getName(), image: style.asc_getImage() }));
        storeCellSettings.initCellStyles(list);
    });
};

// What is selected. A graphic object (shape, image, chart) is `focusOn = obj` and its kinds are in the stores' `objects`;
// a cell range is `focusOn = cell` and its tabs come from `getSelections()` of this interface, built from the cell info.
class FocusObjectsInterface {
    constructor(store) {
        this.store = store;
    }

    get stack() {
        return this.store._focusObjects || [];
    }

    kindOf(object) {
        const types = Asc.c_oAscTypeSelectElement;
        switch (object.get_ObjectType()) {
            case types.Paragraph: return 'paragraph';
            case types.Table: return 'table';
            case types.Hyperlink: return 'link';
            case types.Image: {
                const value = object.get_ObjectValue();
                if (value && value.get_ChartProperties && value.get_ChartProperties()) return 'chart';
                if (value && value.get_ShapeProperties && value.get_ShapeProperties()) return 'shape';
                return 'image';
            }
            default: return null;
        }
    }

    topValue(kind) {
        const stack = this.stack;
        for (let i = stack.length - 1; i >= 0; i--) {
            if (this.kindOf(stack[i]) === kind) return stack[i].get_ObjectValue();
        }
        return null;
    }

    getSelections() {
        const info = this.store._cellInfo;
        if (!info) return [];
        const selections = [];
        const types = Asc.c_oAscSelectionType;
        switch (info.asc_getSelectionType()) {
            case types.RangeCells:
            case types.RangeRow:
            case types.RangeCol:
            case types.RangeMax:
                selections.push('cell');
                break;
            case types.RangeImage:
                selections.push('image');
                break;
            case types.RangeShape:
                selections.push('shape');
                break;
            case types.RangeChart:
                selections.push('chart');
                break;
            case types.RangeShapeText:
            case types.RangeChartText:
                selections.push('text');
                break;
            default:
                break;
        }
        if (info.asc_getHyperlink && info.asc_getHyperlink()) selections.push('hyperlink');
        return selections;
    }

    getShapeObject() { return this.topValue('shape'); }
    getImageObject() { return this.topValue('image'); }
    getChartObject() { return this.topValue('chart'); }
    getTableObject() { return this.topValue('table'); }
    getParagraphObject() { return this.topValue('paragraph'); }
}

// the selection of cells: the cell info feeds the focus store and the cell / text settings
EditorUIController.initCellInfo = (props) => {
    const api = Common.EditorApi.get();
    const { storeFocusObjects, storeCellSettings, storeTextSettings } = props;
    storeFocusObjects.intf = new FocusObjectsInterface(storeFocusObjects);
    const objectTypes = [
        Asc.c_oAscSelectionType.RangeImage,
        Asc.c_oAscSelectionType.RangeShape,
        Asc.c_oAscSelectionType.RangeChart,
        Asc.c_oAscSelectionType.RangeShapeText,
        Asc.c_oAscSelectionType.RangeChartText,
    ];
    api.asc_registerCallback('asc_onSelectionChanged', (cellInfo) => {
        if (!cellInfo) return;
        storeFocusObjects.resetCellInfo(cellInfo);
        storeFocusObjects.setIsLocked(cellInfo);
        storeCellSettings.initCellSettings(cellInfo);
        storeTextSettings.initTextSettings(cellInfo);
        const isObject = objectTypes.indexOf(cellInfo.asc_getSelectionType()) > -1;
        // the Cell SDK has no focus-object event: the properties of the selected graphic objects are asked for here
        storeFocusObjects.resetFocusObjects(isObject ? api.asc_getGraphicObjectProps() || [] : []);
        storeFocusObjects.changeFocus(isObject);
    });
};

// theme colours for the colour pickers
EditorUIController.initThemeColors = () => {
    const api = Common.EditorApi.get();
    api.asc_registerCallback('asc_onSendThemeColors', (colors, standartColors) => {
        Common.Utils.ThemeColor.setColors(colors, standartColors);
    });
};

export default EditorUIController;
