// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

export type FieldStore = {
    content: string;
    /**
     * If true, subscribers need to sync from content regardless of whether
     * they are focused or not.
     */
    force?: boolean;
};

export type EditorOptions = {
    fieldsCollapsed: boolean[];
    fieldStates: {
        richTextsHidden: boolean[];
        plainTextsHidden: boolean[];
        plainTextDefaults: boolean[];
    };
    modTimeOfNotetype: number;
};

export type SessionOptions = {
    [key: number]: EditorOptions;
};

export type NotetypeIdAndModTime = {
    id: number;
    modTime: number;
};
