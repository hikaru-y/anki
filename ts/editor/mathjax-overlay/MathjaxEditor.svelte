<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import * as tr from "@tslib/ftl";
    import { noop } from "@tslib/functional";
    import { isArrowLeft, isArrowRight } from "@tslib/keys";
    import { getPlatformString } from "@tslib/shortcuts";
    import type CodeMirrorLib from "codemirror";
    import { functionIcon } from "editor/editor-toolbar/icons";
    import { createEventDispatcher, onMount } from "svelte";
    import type { Writable } from "svelte/store";

    import { pageTheme } from "../../sveltelib/theme";
    import { baseOptions, focusAndSetCaret, latex } from "../code-mirror";
    import type { CodeMirrorAPI } from "../CodeMirror.svelte";
    import CodeMirror from "../CodeMirror.svelte";
    import { saveNowSignal } from "../NoteEditor.svelte";

    export let code: Writable<string>;
    export let acceptShortcut: string;
    export let newlineShortcut: string;

    const configuration = {
        ...Object.assign({}, baseOptions, {
            extraKeys: {
                ...(baseOptions.extraKeys as CodeMirrorLib.KeyMap),
                [acceptShortcut]: noop,
                [newlineShortcut]: noop,
            },
        }),
        placeholder: tr.editingMathjaxPlaceholder({
            accept: getPlatformString(acceptShortcut),
            newline: getPlatformString(newlineShortcut),
        }),
        mode: latex,
    };

    /* These are not reactive, but only operate on initialization */
    export let position: CodeMirrorLib.Position | undefined = undefined;
    export let selectAll: boolean;

    const dispatch = createEventDispatcher();

    let codeMirror = {} as CodeMirrorAPI;

    onMount(async () => {
        const editor = await codeMirror.editor;

        let direction: "start" | "end" | undefined = undefined;

        editor.on(
            "keydown",
            (_instance: CodeMirrorLib.Editor, event: KeyboardEvent): void => {
                if (event.key === "Escape") {
                    dispatch("close");
                    event.stopPropagation();
                } else if (isArrowLeft(event)) {
                    direction = "start";
                } else if (isArrowRight(event)) {
                    direction = "end";
                }
            },
        );

        editor.on(
            "beforeSelectionChange",
            (
                instance: CodeMirrorLib.Editor,
                obj: CodeMirrorLib.EditorSelectionChange,
            ): void => {
                const { anchor } = obj.ranges[0];

                if (anchor["hitSide"]) {
                    if (instance.getValue().length === 0) {
                        if (direction) {
                            dispatch(`moveout${direction}`);
                        }
                    } else if (anchor.line === 0 && anchor.ch === 0) {
                        dispatch("moveoutstart");
                    } else {
                        dispatch("moveoutend");
                    }
                }

                direction = undefined;
            },
        );

        setTimeout(() => {
            focusAndSetCaret(editor, position);

            if (selectAll) {
                editor.execCommand("selectAll");
            }
        });
    });

    /**
     * Prevents MathJax editor from closing when the mouse button is released
     * outside the MathJax editor while selecting text. Calls `stopPropagation()`
     * in the capturing phase to prevent `updateFloating()` in `<WithFloating>`
     * from being triggered.
     */
    function preventClose(event: MouseEvent) {
        if (event.button === 0) {
            document.addEventListener(
                "click",
                (evt) => {
                    if (
                        !(evt.target instanceof HTMLElement) ||
                        !evt.target.closest(".mathjax-editor")
                    ) {
                        evt.stopPropagation();
                    }
                },
                { capture: true, once: true },
            );
        }
    }

    $: $saveNowSignal, dispatch("close");
</script>

<div
    class="mathjax-editor"
    class:light-theme={!$pageTheme.isDark}
    on:mousedown={preventClose}
>
    <CodeMirror
        {code}
        {configuration}
        bind:api={codeMirror}
        on:change={({ detail: mathjaxText }) => code.set(mathjaxText)}
        on:blur
    />
</div>

<slot editor={codeMirror} />

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
