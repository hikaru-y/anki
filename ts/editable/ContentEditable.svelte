<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import { updateAllState } from "../components/WithState.svelte";
    import actionList from "../sveltelib/action-list";
    import type { SetupInputHandlerAction } from "../sveltelib/input-handler";
    import { fixRTLKeyboardNav, preventBuiltinShortcuts } from "./content-editable";

    export let resolve: (editable: HTMLElement) => void;
    export let inputHandlers: SetupInputHandlerAction[];

    const inputHandlerAction = actionList(inputHandlers);
</script>

<anki-editable
    contenteditable="true"
    role="textbox"
    tabindex="0"
    use:resolve
    use:preventBuiltinShortcuts
    use:fixRTLKeyboardNav
    use:inputHandlerAction={{}}
    on:focus
    on:blur
    on:click={updateAllState}
    on:keyup={updateAllState}
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
