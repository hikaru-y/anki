// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { EditorStateConfig, TransactionSpec } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { promiseWithResolver } from "@tslib/promise";

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

export class CodeMirrorManager {
    #view: Promise<EditorView> | undefined = undefined;
    #config: EditorStateConfig;
    container: {
        promise: Promise<HTMLDivElement>;
        resolve: (value: HTMLDivElement) => void;
    };

    constructor(config: EditorStateConfig) {
        this.#config = config;
        const [promise, resolve] = promiseWithResolver<HTMLDivElement>();
        this.container = { promise, resolve };
    }

    async #createView(): Promise<EditorView> {
        const parent = await this.container.promise;
        return new Promise((resolve) => {
            const view = new EditorView({
                state: EditorState.create(this.#config),
                parent,
            });
            resolve(view);
        });
    }

    #requireView(): Promise<EditorView> {
        if (!this.#view) {
            this.#view = this.#createView();
        }
        return this.#view;
    }

    async focus(): Promise<void> {
        const view = await this.#requireView();
        // https://discuss.codemirror.net/t/how-to-autofocus-in-cm6/2966
        while (!view.hasFocus) {
            view.focus();
            await new Promise(requestAnimationFrame);
        }
    }

    async blur(): Promise<void> {
        const view = await this.#requireView();
        // https://discuss.codemirror.net/t/code-mirror-6-has-focus-what-about-blur/4071
        view.contentDOM.blur();
    }

    async setValue(value: string): Promise<void> {
        const view = await this.#requireView();
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
        });
    }

    async setCaretPosition(position?: number): Promise<void> {
        const view = await this.#requireView();
        await this.focus();
        view.dispatch({
            selection: {
                anchor: position ?? 0,
                head: position ?? 0,
            },
        });
    }

    async moveCaretToEnd(): Promise<void> {
        const view = await this.#requireView();
        this.setCaretPosition(view.state.doc.length);
    }

    async selectAll(): Promise<void> {
        const view = await this.#requireView();
        await this.focus();
        view.dispatch({
            selection: {
                anchor: 0,
                head: view.state.doc.length,
            },
        });
    }

    async getSelection(): Promise<string> {
        const view = await this.#requireView();
        return view.state.sliceDoc(
            view.state.selection.main.from,
            view.state.selection.main.to,
        );
    }

    async replaceSelection(text: string): Promise<void> {
        const view = await this.#requireView();
        view.dispatch(view.state.replaceSelection(text));
    }

    async maybeContentDOM(): Promise<HTMLElement | null> {
        return this.#view
            ? (await this.#view).contentDOM
            : null;
    }

    async maybeDispatch(specs: TransactionSpec): Promise<void> {
        if (this.#view) {
            (await this.#view).dispatch(specs);
        }
    }

    async cleanup(): Promise<void> {
        if (this.#view) {
            (await this.#view).destroy();
        }
    }
}
