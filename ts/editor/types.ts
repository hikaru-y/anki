// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

// export type EditorOptions = {
//     fieldsCollapsed: boolean[];
//     fieldStates: {
//         richTextsHidden: boolean[];
//         plainTextsHidden: boolean[];
//         plainTextDefaults: boolean[];
//     };
// };

// export type SessionOptions = {
//     [key: number]: EditorOptions;
// };

export type Note = {
    contents: string[];
    nid: number;
    tags: string[];
};

export type Notetype = {
    mid: number;
};

export type FieldData = {
    name: string;
    fontFamily: string;
    fontSize: number;
    direction: "ltr" | "rtl";
    plainTextByDefault: boolean;
    description: string;
    collapsedByDefault: boolean;
    state: FieldSessionState;
};

export type FieldsOpts = {
    collapsedByDefault: boolean[];
    plainTextsByDefault: boolean[];
    descriptions: string[];
    directions: ("ltr" | "rtl")[];
    fieldNames: string[];
    fontFamilies: string[];
    fontSizes: number[];
};

// export type ObservedFieldsData = Pick<FieldsData, "defaultFieldsCollapsed" | "defaultPlainTexts" | "fieldNames">;

// export type ObservedFieldsDataByNotetype = {
//     [key: number]: ObservedFieldsData;
// };

export type FieldsState = {
    fieldsCollapsed: boolean[];
    plainTextsHidden: boolean[];
    richTextsHidden: boolean[];
};

type FieldSessionState = {
    fieldCollapsed: boolean;
    plainTextHidden: boolean;
    richTextHidden: boolean;
};

// export type FieldSessionState = NoExtraProperties<_FieldSessionState>;

export type FieldsStateByNotetype = {
    [key: number]: FieldsState;
};

export type EditorOpts = {
    closeHTMLTags: boolean;
    mathjaxEnabled: boolean;
    shrinkImages: boolean;
    symbolsEnabled: boolean;
};

export type EditorState = {
    colorButtons: [string, string];
    fieldToFocus: number | null;
    tagsCollapsed: boolean;
};

export type ObservedFieldsData = {
    fieldNames: string[];
    collapsedByDefault: boolean[];
    plainTextsByDefault: boolean[];
};

type SessionState = {
    fieldsState?: FieldsState;
    observedFieldsData?: ObservedFieldsData;
};

// export type StateByNotetype = {
//     [key: number]: SessionState;
// };

export type StateByNotetype = {
    [key: number]: FieldsState;
};

export type ObservedFieldsDataByNotetype = {
    [key: number]: ObservedFieldsData;
};
