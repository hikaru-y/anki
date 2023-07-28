// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { standardKeymap } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { StreamLanguage } from "@codemirror/language";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import type { Extension } from "@codemirror/state";
import { Compartment } from "@codemirror/state";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import type { KeyBinding } from "@codemirror/view";
import { EditorView, gutter, keymap, placeholder } from "@codemirror/view";
import * as tr from "@tslib/ftl";
import { getPlatformString } from "@tslib/shortcuts";
import type { EventDispatcher } from "svelte";

const baseTheme = EditorView.baseTheme({
    "&": {
        color: "var(--fg)",
        backgroundColor: "var(--canvas-code)",
    },
    "&.cm-focused": {
        outline: "none",
    },
    ".cm-content": {
        padding: "8px 2px",
    },
    ".cm-gutters": {
        backgroundColor: "var(--canvas-code)",
        width: "12px",
        borderRight: "1px solid var(--fg-faint)",
    },
    "&.mathjax-editor": {
        marginBottom: "0.5rem",
        maxWidth: "100ch",
        minWidth: "30ch",
        borderWidth: "1px 0",
        borderStyle: "solid",
        borderColor: "var(--border-subtle)",
    },
    "&dark.mathjax-editor": {
        borderColor: "var(--fg-subtle)",
    },
    "&.mathjax-editor .cm-placeholder": {
        fontFamily: "sans-serif",
        fontSize: "small",
        verticalAlign: "middle",
    },
});

export const lightTheme = [
    baseTheme,
    syntaxHighlighting(defaultHighlightStyle),
];

export const darkTheme = [
    EditorView.darkTheme.of(true),
    baseTheme,
    syntaxHighlighting(oneDarkHighlightStyle),
];

type HtmlConfig = Parameters<typeof html>[0];

export function plainTextInputExtensionsAndCompartment(
    { closeHTMLTags }: { closeHTMLTags: boolean },
): {
    extensions: Extension[];
    compartment: {
        htmlCompartment: Compartment;
        htmlConfig: HtmlConfig;
    };
} {
    const htmlCompartment = new Compartment();
    const htmlConfig: HtmlConfig = {
        autoCloseTags: closeHTMLTags,
        matchClosingTags: true,
    };
    const keyBindings = [...standardKeymap];
    return {
        extensions: [
            htmlCompartment.of(html(htmlConfig)),
            keymap.of(keyBindings),
            gutter({}),
        ],
        compartment: { htmlCompartment, htmlConfig },
    };
}

export function mathjaxEditorExtensions(
    { acceptShortcut, newlineShortcut, dispatch }: {
        acceptShortcut: string;
        newlineShortcut: string;
        dispatch: EventDispatcher<{
            close: void;
            moveoutstart: void;
            moveoutend: void;
        }>;
    },
): Extension[] {
    const keyBindings: KeyBinding[] = [
        // TODO: Need to migrate https://github.com/ankitects/anki/pull/2237 to
        // work with CM6, but the following won't work as expected. Maybe we should
        // look for a way to solve https://github.com/ankitects/anki/issues/2300.
        // {
        //     key: "Escape",
        //     run: () => {
        //         dispatch("close");
        //         return true;
        //     },
        // },
        {
            key: "Enter",
            run: () => {
                dispatch("moveoutend");
                return true;
            },
        },
        {
            key: "ArrowLeft",
            run: (view) => {
                if (
                    view.state.selection.main.anchor === 0
                    && view.state.selection.main.anchor === view.state.selection.main.head
                ) {
                    dispatch("moveoutstart");
                    return true;
                } else {
                    return false;
                }
            },
        },
        {
            key: "ArrowRight",
            run: (view) => {
                if (
                    view.state.selection.main.anchor === view.state.doc.length
                    && view.state.selection.main.anchor === view.state.selection.main.head
                ) {
                    dispatch("moveoutend");
                    return true;
                } else {
                    return false;
                }
            },
        },
        ...standardKeymap,
    ];
    const placeholderText = tr.editingMathjaxPlaceholder({
        accept: getPlatformString(acceptShortcut),
        newline: getPlatformString(newlineShortcut),
    });
    return [
        StreamLanguage.define(stex),
        keymap.of(keyBindings),

        placeholder(placeholderText),
    ];
}
