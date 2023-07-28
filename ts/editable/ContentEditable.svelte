<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import { isComposing } from "../sveltelib/composition";
    import { mathjaxOverlayActive } from "../editor/mathjax-overlay/MathjaxOverlay.svelte";
    import { context as editingAreaContext } from "../editor/EditingArea.svelte";
    import {
        adjustInputFragment,
        ankiEditableToStored,
    } from "../editor/rich-text-input/transform";
    import { storedToUndecorated } from "../editor/plain-text-input/transform";
    import type { ActionReturn } from "svelte/action";

    import { updateAllState } from "../components/WithState.svelte";
    import actionList from "../sveltelib/action-list";
    import type { SetupInputHandlerAction } from "../sveltelib/input-handler";
    import { fixRTLKeyboardNav, preventBuiltinShortcuts } from "./content-editable";

    export let resolve: (editable: HTMLElement) => void;
    export let inputHandlers: SetupInputHandlerAction[];

    const inputHandlerAction = actionList(inputHandlers);
    const { fieldStore } = editingAreaContext.get();
    const observerConfig: MutationObserverInit = {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
    };
    const range = document.createRange();
    const tmpl = document.createElement("template");

    let focused = false;

    /**
     * Updates fieldStore when the contenteditable element has focus or an overlay
     * on a Mathjax element within it is active.
     */
    function syncToFieldStore(editable: HTMLElement): ActionReturn {
        const observer = new MutationObserver((mutationList) => {
            const attr = "data-overlay-active";
            for (const mutation of mutationList) {
                if ((focused || $mathjaxOverlayActive) && !$isComposing) {
                    fieldStore.set({
                        content: ankiEditableToStored(editable),
                    });
                }
            }
        });
        observer.observe(editable, observerConfig);
        return { destroy: () => observer.disconnect() };
    }

    function editableToStoredWhenCompositionSessionFinished(
        editable: HTMLElement,
    ): ActionReturn {
        const unsubscribe = isComposing.subscribe((composing) => {
            if (!composing) {
                fieldStore.set({
                    content: ankiEditableToStored(editable),
                });
            }
        });
        return { destroy: () => unsubscribe() };
    }

    function updateEditable(
        editable: HTMLElement,
        html: string,
        restoreCaret: boolean | undefined,
    ): void {
        let caretPosition: number | undefined;
        if (restoreCaret) {
            caretPosition = getCaretPosition(editable);
            console.log("caretPosition", caretPosition);
        }
        html = storedToUndecorated(html);
        tmpl.innerHTML = html;
        adjustInputFragment(tmpl.content);
        // range.selectNodeContents(editable as Node);
        // range.deleteContents();
        // range.insertNode(tmpl.content);
        editable.replaceChildren(tmpl.content);
        if (restoreCaret && caretPosition) {
            setCaretPosition(editable, caretPosition);
        }
    }

    function getCaretPosition(element: HTMLElement): number {
        let caretOffset = 0;
        const sel = element.getRootNode().getSelection();

        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }

        return caretOffset;
    }

    function isValidStartOffset(startNode: Node, startOffset: number): boolean {
        // テキストノードであることを確認
        if (startNode.nodeType !== Node.TEXT_NODE) {
            return false;
        }

        // startOffsetが0以上かつstartNodeの子要素の数以下であることを確認
        if (startOffset >= 0 && startOffset <= startNode.length) {
            return true;
        }

        return false;
    }

    function setCaretPosition(element: HTMLElement, offset: number) {
        const range = document.createRange();
        const sel = element.getRootNode().getSelection();
        let currentNode: Node | undefined;
        let currentNodeOffset = 0;

        for (const node of element.childNodes) {
            // const nodeLength = node.textContent?.length ?? 0;
            if (node instanceof Text) {
                const nodeLength = node.length;
                if (
                    currentNodeOffset + nodeLength >= offset &&
                    currentNodeOffset <= nodeLength
                ) {
                    currentNode = node;
                    break;
                }

                currentNodeOffset += nodeLength;
            }

            // if (currentNodeOffset + nodeLength >= offset) {
            //     currentNode = node;
            //     break;
            // }

            // currentNodeOffset += nodeLength;
        }

        if (currentNode) {
            range.setStart(currentNode, offset - currentNodeOffset);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
        } else {
            range.selectNodeContents(element);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }

    /**
     * Updates <anki-editable> when the contenteditable element has no focus or
     * when loading new note.
     */
    function syncFromFieldStore(editable: HTMLElement): ActionReturn {
        // const unsubscribe = fieldStore.subscribe(({ content, forceUpdate }) => {
        //     if (forceUpdate || (!focused && !$mathjaxOverlayActive)) {
        //         updateEditable(editable, content);
        //     }
        // });
        // return { destroy: () => unsubscribe() };
        return {
            destroy: fieldStore.subscribe(({ content, forceUpdate, restoreCaret }) => {
                if (forceUpdate || (!focused && !$mathjaxOverlayActive)) {
                    console.log("@@@@");
                    updateEditable(editable, content, restoreCaret);
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
    use:editableToStoredWhenCompositionSessionFinished
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
