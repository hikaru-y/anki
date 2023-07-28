<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import * as tr from "@tslib/ftl";
    import { getPlatformString } from "@tslib/shortcuts";

    import IconButton from "../../components/IconButton.svelte";
    import Shortcut from "../../components/Shortcut.svelte";
    import { context as noteEditorContext } from "../NoteEditor.svelte";
    import { redoIcon, undoIcon } from "./icons";

    const { focusedField } = noteEditorContext.get();
    $: currentUndoStack = $focusedField?.undoStack;

    function undo(): void {
        $focusedField?.undoStack.undo();
    }

    function redo(): void {
        $focusedField?.undoStack.redo();
    }

    const undoShortcut = "Control+Z";
    const redoShortcut = "Control+Y";
</script>

<!-- <Shortcut keyCombination={undoShortcut} on:action={undo} />
<Shortcut keyCombination={redoShortcut} on:action={redo} /> -->

<IconButton
    tooltip="({getPlatformString(undoShortcut)})"
    disabled={!$focusedField || !$currentUndoStack?.canUndo}
    on:click={undo}
    --border-left-radius="5px"
>
    {@html undoIcon}
</IconButton>
<IconButton
    tooltip="({getPlatformString(redoShortcut)})"
    disabled={!$focusedField || !$currentUndoStack?.canRedo}
    on:click={redo}
    --border-right-radius="5px"
>
    {@html redoIcon}
</IconButton>
