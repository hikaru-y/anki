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
    import { html } from "@codemirror/lang-html";
    import { Compartment } from "@codemirror/state";
    import { promiseWithResolver } from "@tslib/promise";
    import type { CodeMirrorManager } from "editor/code-mirror";
    import { onMount, tick } from "svelte";
    import { writable } from "svelte/store";

    import { pageTheme } from "../../sveltelib/theme";
    import CodeMirror from "../CodeMirror.svelte";
    import { context as editingAreaContext } from "../EditingArea.svelte";
    import { Flag } from "../helpers";
    import { context as noteEditorContext } from "../NoteEditor.svelte";
    import removeProhibitedTags from "./remove-prohibited";

    export let hidden = false;
    export let fieldCollapsed = false;
    export const focusFlag = new Flag();

    const { focusedInput } = noteEditorContext.get();
    const { editingInputs, fieldStore } = editingAreaContext.get();
    const code = writable($fieldStore.content);

    let focused = false;
    let codeMirror: CodeMirrorManager | undefined = undefined;

    async function focus(): Promise<void> {
        codeMirror?.focus();
    }

    async function moveCaretToEnd(): Promise<void> {
        codeMirror?.moveCaretToEnd();
    }

    async function refocus(): Promise<void> {
        codeMirror?.blur();
        moveCaretToEnd();
    }

    function toggle(): boolean {
        hidden = !hidden;
        return hidden;
    }

    async function getInputAPI(target: EventTarget): Promise<FocusableInputAPI | null> {
        if (target === (await codeMirror?.maybeContentDOM())) {
            return api;
        } else {
            return null;
        }
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

    $: {
        pushUpdate(!(hidden || fieldCollapsed));
        if (focusFlag.checkAndReset()) {
            tick().then(refocus);
        }
    }

    function onChange({ detail: html }: CustomEvent<string>): void {
        // code.set(removeProhibitedTags(html));
        if (focused) {
            fieldStore.set({ content: removeProhibitedTags(html) });
        }
    }

    const keyBindings = [...standardKeymap];
    const langCompartment = new Compartment();
    const restParams: Parameters<typeof html>[0] = { matchClosingTags: true };
    const langExtension = langCompartment.of(
        html({ autoCloseTags: $closeHTMLTags, ...restParams }),
    );
    function reconfigure(autoCloseTags: boolean): void {
        codeMirror?.maybeDispatch({
            effects: langCompartment.reconfigure(
                html({ autoCloseTags, ...restParams }),
            ),
        });
    }

    // Reconfigure when 'Auto-close HTML tags' option is toggled
    $: reconfigure($closeHTMLTags);

    onMount(() => {
        $editingInputs.push(api);
        $editingInputs = $editingInputs;

        return fieldStore.subscribe(async ({ content, noteLoaded }) => {
            if (!hidden && (noteLoaded || !focused)) {
                codeMirror?.setValue(content);
            }
        });
    });

    function updateCodeMirrorValue(): void {
        codeMirror?.setValue($fieldStore.content);
    }

    $: if (!hidden) {
        updateCodeMirrorValue();
    }

    setupLifecycleHooks(api);
</script>

<div
    class="plain-text-input"
    class:light-theme={!$pageTheme.isDark}
    on:focusin={() => ($focusedInput = api)}
    {hidden}
>
    <CodeMirror
        {code}
        {langExtension}
        {keyBindings}
        withGutter
        domListener
        bind:codeMirror
        on:change={onChange}
        on:focusin={() => (focused = true)}
        on:focusout={() => (focused = false)}
    />
</div>

<style lang="scss">
    .plain-text-input {
        height: 100%;

        :global(.CodeMirror) {
            height: 100%;
            background: var(--canvas-code);
            padding-inline: 4px;
        }

        :global(.CodeMirror-lines) {
            padding: 8px 0;
        }

        :global(.CodeMirror-gutters) {
            background: var(--canvas-code);
        }
    }
</style>
