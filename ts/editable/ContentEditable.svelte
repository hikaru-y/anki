<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script context="module" lang="ts">
    import { writable } from "svelte/store";

    export const pretendingEditableHasFocus = writable(false);
</script>

<script lang="ts">
    import type { ActionReturn } from "svelte/action";

    import { updateAllState } from "../components/WithState.svelte";
    import { context as editingAreaContext } from "../editor/EditingArea.svelte";
    import { storedToUndecorated } from "../editor/plain-text-input/transform";
    import {
        adjustInputFragment,
        editableToStored,
    } from "../editor/rich-text-input/transform";
    import actionList from "../sveltelib/action-list";
    import type { SetupInputHandlerAction } from "../sveltelib/input-handler";
    import { fixRTLKeyboardNav, preventBuiltinShortcuts } from "./content-editable";

    export let resolve: (editable: HTMLElement) => void;
    export let inputHandlers: SetupInputHandlerAction[];

    const inputHandlerAction = actionList(inputHandlers);
    const { fieldStore } = editingAreaContext.get();
    const tmpl = document.createElement("template");
    const range = document.createRange();
    let focused = false;

    function syncToFieldStore(editable: HTMLElement): ActionReturn<void> {
        const observer = new MutationObserver(() => {
            if (focused || $pretendingEditableHasFocus) {
                fieldStore.set({
                    content: editableToStored(editable),
                });
            }
        });
        observer.observe(editable, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
        });
        return { destroy: () => observer.disconnect() };
    }

    function storedToEditable(editable: HTMLElement, html: string): void {
        // NOTE: Setting the innerHTML of <anki-editable> to the passed string does not
        // work because it does not activate custom elements (e.g. MathJax element).
        tmpl.innerHTML = storedToUndecorated(html);
        adjustInputFragment(tmpl.content);
        // TODO: Use replaceChildren() once available. (requires Chromium 86+)
        range.selectNodeContents(editable as Node);
        range.deleteContents();
        range.insertNode(tmpl.content);
    }

    function syncFromFieldStore(editable: HTMLElement): ActionReturn<void> {
        return {
            destroy: fieldStore.subscribe(({ content, noteLoaded }) => {
                if (noteLoaded || (!focused && !$pretendingEditableHasFocus)) {
                    storedToEditable(editable, content);
                }
            }),
        };
    }
</script>

<anki-editable
    contenteditable="true"
    role="textbox"
    tabindex="0"
    use:resolve
    use:preventBuiltinShortcuts
    use:fixRTLKeyboardNav
    use:inputHandlerAction={{}}
    use:syncToFieldStore
    use:syncFromFieldStore
    on:focus
    on:blur
    on:click={updateAllState}
    on:keyup={updateAllState}
    on:focusin={() => (focused = true)}
    on:focusout={() => (focused = false)}
/>

<style lang="scss">
    anki-editable {
        display: block;
        position: relative;

        overflow: auto;
        overflow-wrap: anywhere;
        /* fallback for iOS */
        word-break: break-word;

        &:focus {
            outline: none;
        }
    }

    /* editable-base.scss contains styling targeting user HTML */
</style>
