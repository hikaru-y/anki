<!--
    Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import { history, historyKeymap } from "@codemirror/commands";
    import type { Extension } from "@codemirror/state";
    import { Compartment } from "@codemirror/state";
    import type { KeyBinding } from "@codemirror/view";
    import { EditorView, gutter, keymap, placeholder } from "@codemirror/view";
    import { createEventDispatcher, onDestroy } from "svelte";
    import type { Writable } from "svelte/store";

    import { pageTheme } from "../sveltelib/theme";
    import { CodeMirrorManager, darkTheme, lightTheme } from "./code-mirror";

    export let code: Writable<string>;
    export let langExtension: Extension;
    export let keyBindings: KeyBinding[];
    export let withGutter = false;
    export let domListener = false;
    export let placeholderText: string | undefined = undefined;
    export let editorAttrs:
        | Parameters<typeof EditorView.editorAttributes.of>[0]
        | undefined = undefined;

    const dispatch = createEventDispatcher<{
        change: string;
        focusin: void;
        focusout: void;
    }>();

    const themeCompartment = new Compartment();

    function switchThemes(dark: boolean): void {
        codeMirror.maybeDispatch({
            effects: themeCompartment.reconfigure(dark ? darkTheme : lightTheme),
        });
    }

    $: switchThemes($pageTheme.isDark);

    const updateListenerExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            dispatch("change", update.state.doc.toString());
        }
    });

    function extensions(): Extension[] {
        const exts = [
            langExtension,
            keymap.of([...keyBindings, ...historyKeymap]),
            updateListenerExtension,
            EditorView.lineWrapping,
            themeCompartment.of($pageTheme.isDark ? darkTheme : lightTheme),
            history(),
        ];

        if (withGutter) {
            exts.push(gutter({}));
        }
        if (domListener) {
            exts.push(
                EditorView.domEventHandlers({
                    focusin: () => dispatch("focusin"),
                    focusout: () => dispatch("focusout"),
                }),
            );
        }
        if (placeholderText) {
            exts.push(placeholder(placeholderText));
        }
        if (editorAttrs) {
            exts.push(EditorView.editorAttributes.of(editorAttrs));
        }

        return exts;
    }

    export const codeMirror = new CodeMirrorManager({
        doc: $code,
        extensions: extensions(),
    });

    onDestroy(() => codeMirror.cleanup());
</script>

<div class="code-mirror" use:codeMirror.container.resolve />
