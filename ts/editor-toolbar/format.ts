import CommandIconButton from "./CommandIconButton.svelte";
import type { CommandIconButtonProps } from "./CommandIconButton";
import ButtonGroup from "./ButtonGroup.svelte";
import type { ButtonGroupProps } from "./ButtonGroup";

import { dynamicComponent } from "sveltelib/dynamicComponent";
import * as tr from "anki/i18n";

import boldIcon from "./type-bold.svg";
import italicIcon from "./type-italic.svg";
import underlineIcon from "./type-underline.svg";
import superscriptIcon from "./format-superscript.svg";
import subscriptIcon from "./format-subscript.svg";
import eraserIcon from "./eraser.svg";

const commandIconButton = dynamicComponent<
    typeof CommandIconButton,
    CommandIconButtonProps
>(CommandIconButton);
const buttonGroup = dynamicComponent<typeof ButtonGroup, ButtonGroupProps>(ButtonGroup);

export function getFormatGroup() {
    const boldButton = commandIconButton({
        icon: boldIcon,
        command: "bold",
        tooltip: tr.editingBoldTextCtrlandb(),
    });

    const italicButton = commandIconButton({
        icon: italicIcon,
        command: "italic",
        tooltip: tr.editingItalicTextCtrlandi(),
    });

    const underlineButton = commandIconButton({
        icon: underlineIcon,
        command: "underline",
        tooltip: tr.editingUnderlineTextCtrlandu(),
    });

    const superscriptButton = commandIconButton({
        icon: superscriptIcon,
        command: "superscript",
        tooltip: tr.editingSuperscriptCtrlandand(),
    });

    const subscriptButton = commandIconButton({
        icon: subscriptIcon,
        command: "subscript",
        tooltip: tr.editingSubscriptCtrland(),
    });

    const removeFormatButton = commandIconButton({
        icon: eraserIcon,
        command: "removeFormat",
        activatable: false,
        tooltip: tr.editingRemoveFormattingCtrlandr(),
    });

    return buttonGroup({
        id: "format",
        buttons: [
            boldButton,
            italicButton,
            underlineButton,
            superscriptButton,
            subscriptButton,
            removeFormatButton,
        ],
    });
}