import { standardKeymap } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { defaultHighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import type { EditorStateConfig, StateEffect } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { oneDark, oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { EditorView, gutter, keymap, placeholder } from "@codemirror/view";
import type { KeyBinding } from "@codemirror/view";
import { onDestroy } from "svelte";
import type { Action, ActionReturn } from "svelte/action";
import type { Unsubscriber } from "svelte/motion";
import type { Writable } from "svelte/store";
import { pageTheme } from "../sveltelib/theme";

const themeCompartment = new Compartment();

type CodeMirrorParams = {
    langExtension: Extension;
    keyBindings: KeyBinding[];
    placeholderText?: string;
    gutterEnabled: boolean;
    onChange: (value: string) => void;
};

const baseTheme = EditorView.baseTheme({
    "&": {
        color: "var(--fg)",
        backgroundColor: "var(--canvas-code)",
    },
    ".cm-content": {
        padding: "8px 2px",
    },
    ".cm-gutters": {
        backgroundColor: "var(--canvas-code)",
        width: "12px",
        borderRight: "1px solid var(--fg-faint)",
    },
});

const lightTheme = [
    baseTheme,
    syntaxHighlighting(defaultHighlightStyle),
];

const darkTheme = [
    EditorView.darkTheme.of(true),
    baseTheme,
    syntaxHighlighting(oneDarkHighlightStyle),
];

const extensions: Extension[] = [
    EditorView.lineWrapping,
    keymap.of(keyBindings),
    themeCompartment.of($pageTheme.isDark ? darkTheme : lightTheme),
    langExtension,
    // EditorView.domEventHandlers({
    //     dblclick: (event) => {
    //         console.log(event);
    //     },
    // }),
];

if (placeholderText) {
    extensions.push(placeholder(placeholderText));
}

if (gutterEnabled) {
    extensions.push(gutter({}));
}

export class CodeMirrorManager {
    view?: EditorView;
    viewPromise: Promise<EditorView>;
    viewResolve!: (value: EditorView) => void;
    updateListenerExtension: Extension;
    unsubscribe: Unsubscriber;

    constructor({ onChange }: CodeMirrorParams) {
        this.viewPromise = new Promise<EditorView>((resolve) => (this.viewResolve = resolve));
        this.updateListenerExtension = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onChange(update.state.doc.toString());
            }
        });
        this.unsubscribe = pageTheme.subscribe(({ isDark }) => {
            this.view?.dispatch({
                effects: themeCompartment.reconfigure(isDark ? darkTheme : lightTheme),
            });
        });
        onDestroy(() => this.unsubscribe());
    }

    createView(
        { parent, initialValue }: { parent: HTMLElement; initialValue: string },
    ): void {
        const view = new EditorView({
            state: EditorState.create({ doc: initialValue, extensions }),
            parent,
        });
        this.view = view;
        this.viewResolve(view);
    }

    async setValue(value: string): Promise<void> {
        const view = await this.viewPromise;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
        });
    }

    async focus(): Promise<void> {
        const view = await this.viewPromise;
        // https://discuss.codemirror.net/t/how-to-autofocus-in-cm6/2966
        while (!view.hasFocus) {
            view.focus();
            await new Promise(requestAnimationFrame);
        }
    }

    async blur(): Promise<void> {
        const view = await this.viewPromise;
        view.contentDOM.blur();
    }

    async setCaretPosition(position?: number): Promise<void> {
        const view = await this.viewPromise;
        await this.focus();
        view.dispatch({
            selection: {
                anchor: position ?? 0,
            },
        });
    }

    async moveCaretToEnd(): Promise<void> {
        const view = await this.viewPromise;
        this.setCaretPosition(view.state.doc.length);
    }

    async selectAll(): Promise<void> {
        const view = await this.viewPromise;
        await this.focus();
        view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
    }
}

export class DeferredCodeMirror extends Promise<EditorView> {
    private _resolve?: (value: EditorView) => void;
    private initialValue: string;

    constructor({ initialValue }: DeferredCodeMirrorParams) {
        super((resolve) => this._resolve = resolve);
        this.initialValue = initialValue;
    }

    resolve(view: EditorView): void {
        this._resolve?.(view);
    }

    createView(parent: HTMLDivElement): void {
        const view = new EditorView({
            state: EditorState.create({ doc: this.initialValue, extensions }),
            parent,
        });
        this.resolve(view);
    }

    async setValue(html: string): Promise<void> {
        const view = await this;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: html },
        });
    }
}
