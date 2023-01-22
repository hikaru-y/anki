<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import * as tr from "@tslib/ftl";
    import { createEventDispatcher } from "svelte";

    import ButtonGroup from "../../components/ButtonGroup.svelte";
    import ButtonToolbar from "../../components/ButtonToolbar.svelte";
    import IconButton from "../../components/IconButton.svelte";
    import ClozeButtons from "../ClozeButtons.svelte";
    import { blockIcon, deleteIcon, inlineIcon } from "./icons";

    export let isBlock: boolean;

    const dispatch = createEventDispatcher();
</script>

<ButtonToolbar size={1.6} wrap={false}>
    <ButtonGroup>
        <IconButton
            tooltip={tr.editingMathjaxInline()}
            active={!isBlock}
            on:click={() => dispatch("setinline")}
        >
            {@html inlineIcon}
        </IconButton>

        <IconButton
            tooltip={tr.editingMathjaxBlock()}
            active={isBlock}
            on:click={() => dispatch("setblock")}
        >
            {@html blockIcon}
        </IconButton>
    </ButtonGroup>

    <ClozeButtons on:surround alwaysEnabled={true} />

    <ButtonGroup>
        <IconButton tooltip={tr.actionsDelete()} on:click={() => dispatch("delete")}>
            {@html deleteIcon}
        </IconButton>
    </ButtonGroup>
</ButtonToolbar>
