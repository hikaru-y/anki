// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

type FieldsState = {
    fieldsCollapsed: boolean[];
    plainTextsHidden: boolean[];
    richTextsHidden: boolean[];
};

export type ObservedFieldsOpts = {
    fieldNames: string[];
    collapsedByDefault: boolean[];
    plainTextsByDefault: boolean[];
};

type SessionState = {
    fieldsState?: FieldsState;
    observedFieldsOpts?: ObservedFieldsOpts;
};

export type SessionStateByNotetype = {
    [key: number]: SessionState;
};
