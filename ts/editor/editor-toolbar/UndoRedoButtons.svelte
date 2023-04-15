<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import IconButton from "../../components/IconButton.svelte";
    import { context as noteEditorContext } from "../NoteEditor.svelte";
    import { redoIcon, undoIcon } from "./icons";

    const { focusedField } = noteEditorContext.get();
    $: undoStack = $focusedField?.undoStack;
</script>

<span on:mousedown|preventDefault>
    <IconButton
        tooltip="Undo"
        disabled={!$focusedField || !$undoStack?.canUndo}
        on:click={() => $focusedField?.undoStack.undo()}
        --border-left-radius="5px"
    >
        {@html undoIcon}
    </IconButton>
</span>
<span on:mousedown|preventDefault>
    <IconButton
        tooltip="Redo"
        disabled={!$focusedField || !$undoStack?.canRedo}
        on:click={() => $focusedField?.undoStack.redo()}
        --border-right-radius="5px"
    >
        {@html redoIcon}
    </IconButton>
</span>
