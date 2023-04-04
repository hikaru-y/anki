<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import * as tr from "@tslib/ftl";
    import { getPlatformString } from "@tslib/shortcuts";
    import { onMount } from "svelte";
    import type { Writable } from "svelte/store";
    
    import ButtonGroup from "../../components/ButtonGroup.svelte";
    import DynamicallySlottable from "../../components/DynamicallySlottable.svelte";
    import IconButton from "../../components/IconButton.svelte";
    import Item from "../../components/Item.svelte";
    import Shortcut from "../../components/Shortcut.svelte";
    import WithState from "../../components/WithState.svelte";
    import { updateStateByKey } from "../../components/WithState.svelte";
    import { context as noteEditorContext } from "../NoteEditor.svelte";
    import type { Stack } from "../UndoStack.svelte";
    import { redoIcon,undoIcon } from "./icons";
    
    const { focusedField } = noteEditorContext.get();
    $: currentFieldUndoStack = $focusedField?.undoStack;
</script>

<span on:click|preventDefault on:mousedown|preventDefault>
    <IconButton
        tooltip="Undo"
        disabled={!$focusedField || $currentFieldUndoStack?.first}
        on:click={() => $focusedField?.undoStack.undo()}
        --border-left-radius="5px"
    >
        {@html undoIcon}
    </IconButton>
</span>
<span on:click|preventDefault on:mousedown|preventDefault>
    <IconButton
        tooltip="Redo"
        disabled={!$focusedField || $currentFieldUndoStack?.last}
        on:click={() => $focusedField?.undoStack.redo()}
        --border-right-radius="5px"
    >
        {@html redoIcon}
    </IconButton>
</span>