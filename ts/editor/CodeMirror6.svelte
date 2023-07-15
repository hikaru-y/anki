<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import { EditorState, Compartment, Prec } from "@codemirror/state";
    import type { EditorStateConfig, StateEffect } from "@codemirror/state";
    import { EditorView, keymap, placeholder, gutter } from "@codemirror/view";
    import type { KeyBinding } from "@codemirror/view";
    import { standardKeymap } from "@codemirror/commands";
    import type { Extension } from "@codemirror/state";
    import { directionKey } from "@tslib/context-keys";
    import { promiseWithResolver } from "@tslib/promise";
    import { createEventDispatcher, getContext, onDestroy, onMount } from "svelte";
    import type { Writable } from "svelte/store";
    import { pageTheme } from "../sveltelib/theme";
    import { context as editingAreaContext } from "./EditingArea.svelte";
    import { oneDark, oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
    import { html } from "@codemirror/lang-html";
    import { stex } from "@codemirror/legacy-modes/mode/stex";
    import {
        syntaxHighlighting,
        defaultHighlightStyle,
        StreamLanguage,
    } from "@codemirror/language";

    // export let configuration: CodeMirrorLib.EditorConfiguration;
    export let hidden = true;
    /** plain text input: field content; mathjax editor: TeX code*/
    export let initialValue: string;
    export let langExtension: Extension;
    export let keyBindings: KeyBinding[];
    export let placeholderText: string | undefined = undefined;
    export let gutterEnabled = true;
    // export let viewResolver:
    //     | ReturnType<typeof promiseWithResolver<EditorView>>[1]
    //     | undefined = undefined;

    // const direction = getContext<Writable<"ltr" | "rtl">>(directionKey);
    const dispatch = createEventDispatcher<{ change: string }>();
    let container: HTMLDivElement | undefined;
    let view: EditorView | undefined;
    let themeCompartment = new Compartment();
    let viewReady = false;

    const [viewPromise, viewResolve] = promiseWithResolver<EditorView>();

    $: if (!hidden && !view && container) {
        // view = createView(container);
        // viewResolver?.(view);
        viewResolve(createView(container));
        viewReady = true;
    }

    // function langExtension(): Extension {
    //     if (mode === "mathjax-editor") {
    //         return StreamLanguage.define(stex);
    //     } else {
    //         // mode === "plain-text-input"
    //         return html({ matchClosingTags: true });
    //     }
    // }

    const updateListenerExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            dispatch("change", update.state.doc.toString());
        }
    });

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
        // "&dark .cm-gutters": {
        //     backgroundColor: "red",
        // },
    });

    const lightTheme = [
        baseTheme,
        // EditorView.theme({
        //     "&": {
        //         color: "var(--fg)",
        //         backgroundColor: "var(--canvas-code)",
        //     },
        // }),
        syntaxHighlighting(defaultHighlightStyle),
    ];

    const darkTheme = [
        EditorView.darkTheme.of(true),
        baseTheme,
        syntaxHighlighting(oneDarkHighlightStyle),
    ];

    function switchThemes(isDark: boolean): void {
        view?.dispatch({
            effects: themeCompartment.reconfigure(isDark ? darkTheme : lightTheme),
        });
    }

    $: switchThemes($pageTheme.isDark);

    const plainTextInputKeyBindings: KeyBinding[] = [...standardKeymap];

    const mathjaxEditorKeyBindings: KeyBinding[] = [
        { key: "Enter", run: () => false },
        {
            key: "F12",
            run: () => {
                console.log("F12");
                return true;
            },
        },
        ...standardKeymap,
    ];

    const extensions: Extension[] = [
        EditorView.lineWrapping,
        keymap.of(keyBindings),
        updateListenerExtension,
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

    function createView(parent: HTMLDivElement): EditorView {
        return new EditorView({
            state: EditorState.create({ doc: initialValue, extensions }),
            parent,
        }); // これでparentに指定したDOMにCodeMirrorをマウント
    }

    export function maybeGetView(): EditorView | undefined {
        return view;
    }

    async function getView(): Promise<EditorView | undefined> {
        if (!hidden || viewReady) {
            return await viewPromise;
        }
    }

    export async function setValue(html: string): Promise<void> {
        const view = await getView();
        view?.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: html },
        });
    }

    export async function focus(): Promise<void> {
        const view = await getView();
        if (view) {
            // https://discuss.codemirror.net/t/how-to-autofocus-in-cm6/2966
            while (!view.hasFocus) {
                view.focus();
                await new Promise(requestAnimationFrame);
            }
        }
    }

    export async function blur(): Promise<void> {
        const view = await getView();
        view?.contentDOM.blur();
    }

    export async function setCaretPosition(position?: number): Promise<void> {
        const view = await getView();
        await focus();
        view?.dispatch({
            selection: {
                anchor: position ?? 0,
            },
        });
    }

    export async function moveCaretToEnd(): Promise<void> {
        const view = await getView();
        setCaretPosition(view?.state.doc.length);
    }

    export async function selectAll(): Promise<void> {
        const view = await getView();
        await focus();
        view?.dispatch({
            selection: {
                anchor: 0,
                head: view.state.doc.length,
            },
        });
    }

    onDestroy(async () => (await getView())?.destroy());

    // const [editorPromise, resolve] = promiseWithResolver<CodeMirrorLib.Editor>();

    // let apiPartial: Partial<CodeMirrorAPI>;
    // export { apiPartial as api };

    // Object.assign(apiPartial, {
    //     editor: editorPromise,
    //     setOption,
    // });

    // onMount(async () => {
    //     const editor = await editorPromise;
    //     setupCodeMirror(editor, code);
    //     editor.on("change", () => dispatch("change", editor.getValue()));
    //     editor.on("focus", (codeMirror, event) =>
    //         dispatch("focus", { codeMirror, event }),
    //     );
    //     editor.on("blur", (codeMirror, event) =>
    //         dispatch("blur", { codeMirror, event }),
    //     );
    //     editor.on("keydown", (codeMirror, event) => {
    //         if (event.code === "Tab") {
    //             dispatch("tab", { codeMirror, event });
    //         }
    //     });
    // });
</script>

<div class="code-mirror" bind:this={container} />

<style lang="scss">
    .code-mirror {
        // :global(.cm-editor) {
        //     padding: 4px 2px;
        // }

        // :global(.cm-gutter) {
        //     width: 10px;
        //     border-right: 1px solid #ddd;
        // }
        // height: 100%;

        // :global(.CodeMirror) {
        //     height: auto;
        // }

        // :global(.CodeMirror-wrap pre) {
        //     word-break: break-word;
        // }
    }
</style>
