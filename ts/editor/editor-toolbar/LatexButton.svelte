<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import { getRange, getSelection } from "@tslib/cross-browser";
    import * as tr from "@tslib/ftl";
    import { getPlatformString } from "@tslib/shortcuts";
    import { wrapInternal } from "@tslib/wrap";
    import { FrameEnd, FrameStart } from "editable/frame-handle";

    import DropdownItem from "../../components/DropdownItem.svelte";
    import IconButton from "../../components/IconButton.svelte";
    import Popover from "../../components/Popover.svelte";
    import Shortcut from "../../components/Shortcut.svelte";
    import WithFloating from "../../components/WithFloating.svelte";
    import { mathjaxConfig } from "../../editable/mathjax-element";
    import { context as noteEditorContext } from "../NoteEditor.svelte";
    import type { RichTextInputAPI } from "../rich-text-input";
    import { editingInputIsRichText } from "../rich-text-input";
    import { functionIcon } from "./icons";

    const { focusedInput } = noteEditorContext.get();
    $: richTextAPI = $focusedInput as RichTextInputAPI;

    async function surround(front: string, back: string): Promise<void> {
        const element = await richTextAPI.element;
        if (front.startsWith("<anki-mathjax")) {
            const selection = getSelection(element)!;
            const range = getRange(selection)!;
            const maybeFrame = range.commonAncestorContainer.parentElement;
            if (
                range.collapsed &&
                maybeFrame?.tagName.toLowerCase() === FrameStart.tagName
            ) {
                console.log(maybeFrame)
                range.setEndBefore(maybeFrame);
            }
        }
        wrapInternal(element, front, back, false);
    }

    async function wrapWithMathjax({
        block = false,
        prefix = "",
        suffix = "",
    }: {
        block?: boolean;
        prefix?: string;
        suffix?: string;
    } = {}): Promise<void> {
        const selection = getSelection(await richTextAPI.element)!;
        const range = getRange(selection)!;
        console.log(
            range.startContainer,
            range.startOffset,
            range.endContainer,
            range.endOffset,
            range.commonAncestorContainer,
            range.commonAncestorContainer.parentElement,
            range.commonAncestorContainer.parentNode,
        );

        // convert &nbsp; to normal space
        const text = selection.toString().replace(/\u00A0/g, " ");

        const tmpl = document.createElement("template");
        // tmpl.innerHTML = `${front}${text}${back}`;
        const attrs = [
            prefix ? `focusonmount="0,${prefix.length}"` : "focusonmount",
            block ? `block="true"` : null,
        ]
            .filter(Boolean)
            .join(" ");
        tmpl.innerHTML = `<div></div><anki-mathjax ${attrs}>${prefix}${text}${suffix}</anki-mathjax>`;

        // just in case the caret is positioned just before/after another <anki-mathjax>
        const maybeFrame = range.commonAncestorContainer.parentElement;
        if (maybeFrame?.tagName.toLowerCase() === FrameStart.tagName) {
            // maybeFrame.before(spacer);
            // range.setEndBefore(spacer);
            // range.setEndBefore(maybeFrame);
            maybeFrame.before(tmpl.content);
            return;
        } else if (maybeFrame?.tagName.toLowerCase() === FrameEnd.tagName) {
            // console.log(range.startOffset, range.endOffset, range.collapsed);
            // range.setStartAfter(maybeFrame);
            // range.collapse(true);
            // console.log(range.startOffset, range.endOffset, range.collapsed);
            maybeFrame.after(tmpl.content);
            return;
        }
        // await new Promise((r) => setTimeout(r, 500));

        // selection.deleteFromDocument();

        // document.execCommand("inserthtml", false, tmpl.innerHTML);

        range.deleteContents();
        // const dummy = document.createTextNode(" ");
        // range.insertNode(dummy);
        // selection.collapseToEnd();
        range.insertNode(tmpl.content);
        // document.execCommand("inserthtml", false, tmpl.innerHTML);
        // selection.removeAllRanges();
        // selection.addRange(range);
        selection.collapseToEnd();
    }

    function onMathjaxInline(): void {
        if (mathjaxConfig.enabled) {
            // wrapWithMathjax("<anki-mathjax focusonmount>", "</anki-mathjax>");
            // wrapWithMathjax();
            surround("<anki-mathjax focusonmount>", "</anki-mathjax>");
        } else {
            surround("\\(", "\\)");
        }
    }

    function onMathjaxBlock(): void {
        if (mathjaxConfig.enabled) {
            // wrapWithMathjax(
            //     '<anki-mathjax block="true" focusonmount>',
            //     "</anki-matjax>",
            // );
            // wrapWithMathjax({ block: true });
            surround('<anki-mathjax block="true" focusonmount>', "</anki-matjax>");
        } else {
            surround("\\[", "\\]");
        }
    }

    function onMathjaxChemistry(): void {
        if (mathjaxConfig.enabled) {
            // wrapWithMathjax(
            //     '<anki-mathjax focusonmount="0,4">\\ce{',
            //     "}</anki-mathjax>",
            // );
            // wrapWithMathjax({ prefix: "\\ce{", suffix: "}" });
            surround('<anki-mathjax focusonmount="0,4">\\ce{', "}</anki-mathjax>");
        } else {
            surround("\\(\\ce{", "}\\)");
        }
    }

    function onLatex(): void {
        surround("[latex]", "[/latex]");
    }

    function onLatexEquation(): void {
        surround("[$]", "[/$]");
    }

    function onLatexMathEnv(): void {
        surround("[$$]", "[/$$]");
    }

    type LatexItem = [() => void, string, string];

    const dropdownItems: LatexItem[] = [
        [onMathjaxInline, "Control+M, M", tr.editingMathjaxInline()],
        [onMathjaxBlock, "Control+M, E", tr.editingMathjaxBlock()],
        [onMathjaxChemistry, "Control+M, C", tr.editingMathjaxChemistry()],
        [onLatex, "Control+T, T", tr.editingLatex()],
        [onLatexEquation, "Control+T, E", tr.editingLatexEquation()],
        [onLatexMathEnv, "Control+T, M", tr.editingLatexMathEnv()],
    ];

    $: disabled = !$focusedInput || !editingInputIsRichText($focusedInput);

    let showFloating = false;
    $: if (disabled) {
        showFloating = false;
    }
</script>

<WithFloating
    show={showFloating}
    closeOnInsideClick
    inline
    on:close={() => (showFloating = false)}
>
    <IconButton
        slot="reference"
        {disabled}
        on:click={() => (showFloating = !showFloating)}
    >
        {@html functionIcon}
    </IconButton>

    <Popover slot="floating" --popover-padding-inline="0">
        {#each dropdownItems as [callback, keyCombination, label]}
            <DropdownItem on:click={() => setTimeout(callback, 100)}>
                <span>{label}</span>
                <span class="ms-auto ps-2 shortcut"
                    >{getPlatformString(keyCombination)}</span
                >
            </DropdownItem>
        {/each}
    </Popover>
</WithFloating>

{#each dropdownItems as [callback, keyCombination]}
    <Shortcut {keyCombination} on:action={callback} />
{/each}

<style lang="scss">
    .shortcut {
        font: Verdana;
    }
</style>
