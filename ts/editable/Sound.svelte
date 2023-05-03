<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    import { onMount } from "svelte";
    import type { ActionReturn } from "svelte/action";

    import { playIcon, stopIcon } from "./icons";

    export let filename: string;

    export function updateFilename(newName: string): void {
        filename = newName;
    }
    onMount(() => {
        console.log("mount");
    });
    function observe(span: HTMLSpanElement): ActionReturn {
        console.log("@@@", span.innerHTML);
        const observer = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                console.log(mutation);
                if (mutation.type === "characterData") {
                    console.log(mutation.target);
                }
            }
        });

        observer.observe(span, { childList: true, subtree: true, characterData: true });
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }
</script>

<span class="sound" contenteditable="false">
    <span use:observe contenteditable="true">{filename}</span>
    <span >{@html playIcon}</span>
</span>

<style lang="scss">
</style>
