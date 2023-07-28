<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script context="module" lang="ts">
    import { writable } from "svelte/store";

    export let closeMathjaxEditor: (() => void) | null = null;

    const closeSignalStore = writable<symbol>(Symbol(), (set) => {
        closeMathjaxEditor = () => set(Symbol());
        return () => (closeMathjaxEditor = null);
    });
</script>

<script lang="ts">
    import { standardKeymap } from "@codemirror/commands";
    import { StreamLanguage } from "@codemirror/language";
    import { stex } from "@codemirror/legacy-modes/mode/stex";
    import type { Command, EditorView, KeyBinding } from "@codemirror/view";
    import * as tr from "@tslib/ftl";
    import { getPlatformString } from "@tslib/shortcuts";
    import { createEventDispatcher, onMount } from "svelte";
    import type { Writable } from "svelte/store";

    import { pageTheme } from "../../sveltelib/theme";
    import CodeMirror from "../CodeMirror.svelte";

    export let code: Writable<string>;
    export let acceptShortcut: string;
    export let newlineShortcut: string;

    /* These are not reactive, but only operate on initialization */
    export let position: number | undefined = undefined;
    export let selectAll: boolean;

    const dispatch = createEventDispatcher<{
        close: void;
        moveoutstart: void;
        moveoutend: void;
    }>();

    $: $closeSignalStore, dispatch("close");

    let codeMirror: CodeMirror | undefined;

    const langExtension = StreamLanguage.define(stex);

    function arrowLeftCommand(view: EditorView): boolean {
        if (
            view.state.selection.main.anchor === 0 &&
            view.state.selection.main.anchor === view.state.selection.main.head
        ) {
            dispatch("moveoutstart");
            return true;
        } else {
            return false;
        }
    }

    function arrowRightCommand(view: EditorView): boolean {
        if (
            view.state.selection.main.anchor === view.state.doc.length &&
            view.state.selection.main.anchor === view.state.selection.main.head
        ) {
            dispatch("moveoutend");
            return true;
        } else {
            return false;
        }
    }

    const keyBindings: KeyBinding[] = [
        // TODO: Need to migrate https://github.com/ankitects/anki/pull/2237 to
        // work with CM6, but the following won't work. Maybe we should look for
        // a way to solve https://github.com/ankitects/anki/issues/2300.
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
            run: arrowLeftCommand,
        },
        {
            key: "ArrowRight",
            run: arrowRightCommand,
        },
        {
            mac: "Cmd-b",
            run: arrowLeftCommand,
        },
        {
            mac: "Cmd-f",
            run: arrowRightCommand,
        },
        ...standardKeymap,
    ];
    const placeholderText = tr.editingMathjaxPlaceholder({
        accept: getPlatformString(acceptShortcut),
        newline: getPlatformString(newlineShortcut),
    });

    onMount(async () => {
        if (position) {
            codeMirror!.setCaretPosition(position);
        } else if (selectAll) {
            codeMirror!.selectAll();
        } else {
            codeMirror!.focus();
        }
    });
</script>

<div class="mathjax-editor" class:light-theme={!$pageTheme.isDark}>
    <CodeMirror
        hidden={false}
        {code}
        {langExtension}
        {keyBindings}
        {placeholderText}
        editorAttributes={{ class: "mathjax-editor" }}
        bind:this={codeMirror}
        on:change={({ detail: mathjaxText }) => code.set(mathjaxText)}
        on:blur
    />
</div>

<slot {codeMirror} />

<style lang="scss">
    .mathjax-editor {
        margin: 0 1px;
        overflow: hidden;

        :global(.CodeMirror) {
            max-width: 100ch;
            min-width: 14rem;
            margin-bottom: 0.25rem;
        }

        &.light-theme :global(.CodeMirror) {
            border-width: 1px 0;
            border-style: solid;
            border-color: var(--border);
        }

        :global(.CodeMirror-placeholder) {
            font-family: sans-serif;
            font-size: 55%;
            text-align: center;
            color: var(--fg-subtle);
        }
    }
</style>
