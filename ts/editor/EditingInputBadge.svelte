<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import * as tr from "@tslib/ftl";
    import { getPlatformString, registerShortcut } from "@tslib/shortcuts";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";

    import Badge from "../components/Badge.svelte";
    import { context as editorFieldContext } from "./EditorField.svelte";
    import { plainTextIcon, richTextIcon } from "./icons";

    const editorField = editorFieldContext.get();
    const keyCombination = "Control+Shift+K";
    const dispatch = createEventDispatcher();

    export let plainTextByDefault;
    export let off = false;

    export let highlighted = false;
    $: console.log(plainTextByDefault);

    function toggle() {
        dispatch("toggle");
    }

    let deregister: ReturnType<typeof registerShortcut> | undefined = undefined;

    editorField.element.then((target) => {
        deregister = registerShortcut(toggle, keyCombination, { target });
    });

    onDestroy(() => deregister?.());
</script>

<button
    class={plainTextByDefault ? "plain-text-badge" : "rich-text-badge"}
    class:highlighted={!off}
    on:click|stopPropagation={toggle}
>
    <Badge
        tooltip="{tr.editingToggleHtmlEditor()} ({getPlatformString(keyCombination)})"
        iconSize={80}
    >
        {@html plainTextByDefault ? richTextIcon : plainTextIcon}
    </Badge>
</button>

<style lang="scss">
    button {
        cursor: pointer;

        opacity: 0.4;
        &:hover {
            opacity: 0.8;
        }
        &.highlighted {
            opacity: 1;
        }
    }
</style>
