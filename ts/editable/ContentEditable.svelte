<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script context="module" lang="ts">
    export type { ContentEditableAPI } from "./content-editable";
</script>

<script lang="ts">
    import type { Writable } from "svelte/store";

    import { updateAllState } from "../components/WithState.svelte";
    import actionList from "../sveltelib/action-list";
    import type { MirrorAction } from "../sveltelib/dom-mirror";
    import type { SetupInputHandlerAction } from "../sveltelib/input-handler";
    import type { ContentEditableAPI } from "./content-editable";
    import {
        fixRTLKeyboardNav,
        preventBuiltinShortcuts,
        useFocusHandler,
    } from "./content-editable";
    import { context as editingAreaContext } from "../editor/EditingArea.svelte";
    import {
        convertEditableToStoredHtml,
        fragmentToStored,
    } from "editor/rich-text-input/transform";
    import { onDestroy, onMount } from "svelte";
    import { storedToUndecorated } from "editor/plain-text-input/transform";
    import type { Action, ActionReturn } from "svelte/action";

    export let resolve: (editable: HTMLElement) => void;

    export let mirrors: MirrorAction[];
    export let nodes: Writable<DocumentFragment>;

    const { fieldStore } = editingAreaContext.get();
    // const mirrorAction = actionList(mirrors);
    // const mirrorOptions = { store: nodes };
    let editable: HTMLElement | undefined;
    let overlayActive = false;
    // $: console.log("overlayActive", overlayActive);

    export let inputHandlers: SetupInputHandlerAction[];

    const inputHandlerAction = actionList(inputHandlers);

    export let api: Partial<ContentEditableAPI>;

    // const [focusHandler, setupFocusHandling] = useFocusHandler();

    // Object.assign(api, { focusHandler });

    const template = document.createElement("template");

    const config: MutationObserverInit = {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
    };

    function syncWithContentStore(editable: HTMLElement): ActionReturn {
        const observer = new MutationObserver((mutationList) => {
            const attr = "data-overlay-active";
            for (const mutation of mutationList) {
                // console.log(mutation.type, focused, overlayActive);
                if (mutation.type === "attributes" && mutation.attributeName === attr) {
                    overlayActive =
                        (mutation.target as HTMLElement).getAttribute(attr) === "true";
                } else {
                    if (focused || overlayActive) {
                        fieldStore.set({
                            content: convertEditableToStoredHtml(editable),
                        });
                    }
                }
            }
        });
        observer.observe(editable, config);
        return {
            destroy(): void {
                observer.disconnect();
            },
        };
    }

    let focused = false;
    // $: if (editable && focused) {
    //     console.log("observe start");
    //     observer.observe(editable, config);
    // } else {
    //     console.log("observe end");
    //     observer.disconnect();
    // }

    const range = document.createRange();
    const tmpl = document.createElement("template");
    function updateEditable(html: string): void {
        html = storedToUndecorated(html);
        range.selectNodeContents(editable as Node);
        tmpl.innerHTML = html;
        range.deleteContents();
        range.insertNode(tmpl.content);
    }
    const unsubscribeFromContentStore = fieldStore.subscribe(({ content, force }) => {
        if (editable && (force || (!focused && !overlayActive))) {
            updateEditable(content);
        }
    });
    onMount(() => {
        updateEditable($fieldStore.content);
    });
    onDestroy(() => unsubscribeFromContentStore());
</script>

<anki-editable
    contenteditable="true"
    role="textbox"
    tabindex="0"
    use:resolve
    use:preventBuiltinShortcuts
    use:fixRTLKeyboardNav
    use:inputHandlerAction={{}}
    use:syncWithContentStore
    on:focus
    on:blur
    on:click={updateAllState}
    on:keyup={updateAllState}
    on:focusin={() => (focused = true)}
    on:focusout={() => (focused = false)}
    bind:this={editable}
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
