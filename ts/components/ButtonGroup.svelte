<!--
Copyright: Ankitects Pty Ltd and contributors
License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
-->
<script lang="ts">
    export let id: string | undefined = undefined;
    let className: string = "";
    export { className as class };

    export let size: number | undefined = undefined;
    export let wrap: boolean | undefined = undefined;

    $: buttonSize = size ? `--buttons-size: ${size}rem; ` : "";
    let buttonWrap: string;
    $: if (wrap === undefined) {
        buttonWrap = "";
    } else {
        buttonWrap = wrap ? `--buttons-wrap: wrap; ` : `--buttons-wrap: nowrap; `;
    }

    $: style = buttonSize + buttonWrap;
    function borderRadii(node: HTMLDivElement) {
        const btns = [...node.querySelectorAll("button")];
        // const value = "var(--border-radius)";
        btns[0].classList.add("first-button");
        btns[btns.length - 1].classList.add("last-button");
        // btns[0].style.setProperty("--border-left-radius", value);
        // btns[btns.length - 1].style.setProperty("--border-right-radius", value);
    }
</script>

<div
    {id}
    class="button-group btn-group {className}"
    {style}
    dir="ltr"
    role="group"
    use:borderRadii
>
    <slot />
</div>

<style lang="scss">
    .button-group {
        display: flex;
        flex-flow: row var(--buttons-wrap);
    }
</style>
