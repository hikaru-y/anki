<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script context="module" lang="ts">
    import { registerPackage } from "@tslib/runtime-require";

    import lifecycleHooks from "../../sveltelib/lifecycle-hooks";

    import type { EditingInputAPI, FocusableInputAPI } from "../EditingArea.svelte";

    export interface PlainTextInputAPI extends EditingInputAPI {
        name: "plain-text";
        moveCaretToEnd(): void;
        toggle(): boolean;
    }

    export const parsingInstructions: string[] = [];
    export const closeHTMLTags = writable(true);

    const [lifecycle, instances, setupLifecycleHooks] =
        lifecycleHooks<PlainTextInputAPI>();

    registerPackage("anki/PlainTextInput", {
        lifecycle,
        instances,
    });
</script>

<script lang="ts">
    import { standardKeymap } from "@codemirror/commands";
    import type { EditorView } from "@codemirror/view";
    import { html } from "@codemirror/lang-html";
    import { Compartment } from "@codemirror/state";
    import { singleCallback } from "@tslib/typing";
    import { onDestroy, onMount, tick } from "svelte";
    import { writable } from "svelte/store";

    import { pageTheme } from "../../sveltelib/theme";
    import CodeMirror6 from "../CodeMirror6.svelte";
    import {CodeMirrorManager} from "../codemirror6"
    import { context as editingAreaContext } from "../EditingArea.svelte";
    import { Flag } from "../helpers";
    import { context as noteEditorContext } from "../NoteEditor.svelte";
    import removeProhibitedTags from "./remove-prohibited";
    import { storedToUndecorated, undecoratedToStored } from "./transform";

    export let hidden = false;
    export const focusFlag = new Flag();

    const { focusedInput } = noteEditorContext.get();
    const { editingInputs, fieldStore } = editingAreaContext.get();
    let codeMirror: CodeMirror6 | undefined;

    // const code = writable($content);

    function focus(): void {
        // const editor = await codeMirror.editor;
        // editor.focus();
        // await tick();
        codeMirror?.focus();
    }

    function moveCaretToEnd(): void {
        // const editor = await codeMirror.editor;
        // editor.setCursor(editor.lineCount(), 0);
        codeMirror?.moveCaretToEnd();
    }

    function refocus(): void {
        // const editor = (await codeMirror.editor) as any;
        // editor.display.input.blur();
        codeMirror?.blur();
        // focus();
        moveCaretToEnd();
    }

    function toggle(): boolean {
        hidden = !hidden;
        return hidden;
    }

    async function getInputAPI(target: EventTarget): Promise<FocusableInputAPI | null> {
        // const editor = (await codeMirror.editor) as any;

        // if (target === editor.display.input.textarea) {
        //     return api;
        // }

        return null;
    }

    export const api: PlainTextInputAPI = {
        name: "plain-text",
        focus,
        focusable: !hidden,
        moveCaretToEnd,
        refocus,
        toggle,
        getInputAPI,
    };

    /**
     * Communicate to editing area that input is not focusable
     */
    function pushUpdate(isFocusable: boolean): void {
        api.focusable = isFocusable;
        $editingInputs = $editingInputs;
    }

    async function refresh(): Promise<void> {
        // const editor = await codeMirror.editor;
        // editor.refresh();
    }

    $: {
        pushUpdate(!hidden);
        tick().then(() => {
            refresh();
            if (focusFlag.checkAndReset()) {
                refocus();
            }
        });
    }

    function onChange({ detail: html }: CustomEvent<string>): void {
        // code.set(removeProhibitedTags(html));
        if (focused) {
            fieldStore.set({ content: html });
        }
    }

    onMount(() => {
        $editingInputs.push(api);
        $editingInputs = $editingInputs;

        // return singleCallback(
        //     content.subscribe((html: string): void =>
        //         /* We call `removeProhibitedTags` here, because content might
        //          * have been changed outside the editor, and we need to parse
        //          * it to get the "neutral" value. Otherwise, there might be
        //          * conflicts with other editing inputs */
        //         code.set(removeProhibitedTags(storedToUndecorated(html))),
        //     ),
        //     code.subscribe((html: string): void =>
        //         content.set(undecoratedToStored(html)),
        //     ),
        // );
    });

    setupLifecycleHooks(api);

    let focused = false;

    const unsubscribeFromContent = fieldStore.subscribe(({ content, force }) => {
        if (force || !focused) {
            codeMirror?.setValue(content);
        }
    });
    onDestroy(() => unsubscribeFromContent());

    const langCompartment = new Compartment();
    const restParams: Parameters<typeof html>[0] = { matchClosingTags: true };
    const langExtension = langCompartment.of(
        html({ autoCloseTags: $closeHTMLTags, ...restParams }),
    );

    // Reconfigure when 'Auto-close HTML tags' option is toggled
    $: codeMirror?.maybeGetView()?.dispatch({
        effects: langCompartment.reconfigure(
            html({ autoCloseTags: $closeHTMLTags, ...restParams }),
        ),
    });

    const keyBindings = [...standardKeymap];

    const cm = new CodeMirrorManager({onChange:()=>void,gutterEnabled=false})

</script>

<div
    class="plain-text-input"
    class:light-theme={!$pageTheme.isDark}
    on:focusin={() => {
        $focusedInput = api;
        focused = true;
    }}
    on:focusout={() => (focused = false)}
    {hidden}
>
    <div use:cm.createView />
    <CodeMirror6
        initialValue={$fieldStore.content}
        {hidden}
        {langExtension}
        {keyBindings}
        on:change={onChange}
        bind:this={codeMirror}
    />
</div>

<style lang="scss">
    // .plain-text-input {
    //     height: 100%;

    //     :global(.CodeMirror) {
    //         height: 100%;
    //         background: var(--canvas-code);
    //         padding-inline: 4px;
    //     }

    //     :global(.CodeMirror-lines) {
    //         padding: 8px 0;
    //     }

    //     :global(.CodeMirror-gutters) {
    //         background: var(--canvas-code);
    //     }
    // }
</style>
