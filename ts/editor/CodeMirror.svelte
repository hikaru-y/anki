<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import { history, historyKeymap } from "@codemirror/commands";
    import type { EditorStateConfig, Extension } from "@codemirror/state";
    import { Compartment, EditorState } from "@codemirror/state";
    import type { KeyBinding } from "@codemirror/view";
    import { EditorView, gutter, keymap, placeholder } from "@codemirror/view";
    import { promiseWithResolver } from "@tslib/promise";
    import { createEventDispatcher, onDestroy } from "svelte";
    import type { Writable } from "svelte/store";

    import { pageTheme } from "../sveltelib/theme";
    import { darkTheme, lightTheme } from "./code-mirror";

    export let code: Writable<string>;
    export let hidden = true;
    export let langExtension: Extension;
    export let keyBindings: KeyBinding[];
    export let gutterEnabled = false;
    export let placeholderText: string | undefined = undefined;
    export let editorAttributes:
        | Parameters<typeof EditorView.editorAttributes.of>[0]
        | undefined = undefined;

    const dispatch = createEventDispatcher<{
        change: string;
        focusin: void;
        focusout: void;
    }>();
    const [viewPromise, viewResolve] = promiseWithResolver<EditorView>();
    /** Used to dynamically switch themes. */
    const themeCompartment = new Compartment();
    const historyCompartment = new Compartment();

    let container: HTMLDivElement | undefined;
    let editorView: EditorView | undefined;

    // Creates an EditorView instance only once when 'hidden' is set to false
    // for the first time.
    $: if (!hidden && !editorView && container) {
        editorView = createView(container);
        viewResolve(editorView);
    }

    $: if (!hidden && editorView) {
        console.log("reset history", $code, "@@@");
        // editorView?.dispatch({
        //     effects: historyCompartment.reconfigure(history()),
        // });
        editorView.setState(EditorState.create(newState()));
    }

    function newState(): EditorStateConfig {
        return {
            doc: $code,
            extensions: [
                langExtension,
                keymap.of([...keyBindings, ...historyKeymap]),
                updateListenerExtension,
                domEventHandlersExtension,
                EditorView.lineWrapping,
                themeCompartment.of($pageTheme.isDark ? darkTheme : lightTheme),
                extraExtensions(),
                history(),
            ],
        };
    }

    function createView(parent: HTMLDivElement): EditorView {
        return new EditorView({
            state: EditorState.create({
                doc: $code,
                extensions: [
                    langExtension,
                    keymap.of([...keyBindings, ...historyKeymap]),
                    updateListenerExtension,
                    domEventHandlersExtension,
                    EditorView.lineWrapping,
                    themeCompartment.of($pageTheme.isDark ? darkTheme : lightTheme),
                    extraExtensions(),
                    history(),
                ],
            }),
            parent,
        });
    }

    function extraExtensions(): Extension[] {
        const extensions: Extension[] = [];
        if (gutterEnabled) {
            extensions.push(gutter({}));
        }
        if (placeholderText) {
            extensions.push(placeholder(placeholderText));
        }
        if (editorAttributes) {
            extensions.push(EditorView.editorAttributes.of(editorAttributes));
        }
        return extensions;
    }

    function switchThemes(dark: boolean): void {
        editorView?.dispatch({
            effects: themeCompartment.reconfigure(dark ? darkTheme : lightTheme),
        });
    }

    $: switchThemes($pageTheme.isDark);

    const updateListenerExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            dispatch("change", update.state.doc.toString());
        }
    });

    const domEventHandlersExtension = EditorView.domEventHandlers({
        focusin: () => dispatch("focusin"),
        focusout: () => dispatch("focusout"),
    });

    export async function setValue(value: string): Promise<void> {
        const view = await viewPromise;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
        });
    }

    export async function focus(): Promise<void> {
        const view = await viewPromise;
        // https://discuss.codemirror.net/t/how-to-autofocus-in-cm6/2966
        while (!view.hasFocus) {
            view.focus();
            await new Promise(requestAnimationFrame);
        }
    }

    export async function blur(): Promise<void> {
        const view = await viewPromise;
        // https://discuss.codemirror.net/t/code-mirror-6-has-focus-what-about-blur/4071
        view.contentDOM.blur();
    }

    export async function setCaretPosition(position?: number): Promise<void> {
        const view = await viewPromise;
        await focus();
        view.dispatch({
            selection: {
                anchor: position ?? 0,
                head: position ?? 0,
            },
        });
    }

    export async function moveCaretToEnd(): Promise<void> {
        const view = await viewPromise;
        setCaretPosition(view.state.doc.length);
    }

    export async function selectAll(): Promise<void> {
        const view = await viewPromise;
        await focus();
        view.dispatch({
            selection: {
                anchor: 0,
                head: view.state.doc.length,
            },
        });
    }

    export async function getSelection(): Promise<string> {
        const view = await viewPromise;
        return view.state.sliceDoc(
            view.state.selection.main.from,
            view.state.selection.main.to,
        );
    }

    export async function replaceSelection(text: string): Promise<void> {
        const view = await viewPromise;
        view.dispatch(view.state.replaceSelection(text));
    }

    export function maybeGetView(): EditorView | undefined {
        return editorView;
    }

    onDestroy(() => editorView?.destroy());
</script>

<div class="code-mirror" bind:this={container} />
