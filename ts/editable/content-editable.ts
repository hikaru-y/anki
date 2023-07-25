// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { bridgeCommand } from "@tslib/bridgecommand";
import { getSelection } from "@tslib/cross-browser";
import { preventDefault } from "@tslib/events";
import { isApplePlatform } from "@tslib/platform";
import { registerShortcut } from "@tslib/shortcuts";

if (isApplePlatform()) {
    registerShortcut(() => bridgeCommand("paste"), "Control+Shift+V");
}

export function preventBuiltinShortcuts(editable: HTMLElement): void {
    for (const keyCombination of ["Control+B", "Control+U", "Control+I"]) {
        registerShortcut(preventDefault, keyCombination, { target: editable });
    }
}

declare global {
    interface Selection {
        modify(s: string, t: string, u: string): void;
    }
}

// Fix inverted Ctrl+right/left handling in RTL fields
export function fixRTLKeyboardNav(editable: HTMLElement): void {
    editable.addEventListener("keydown", (evt: KeyboardEvent) => {
        if (window.getComputedStyle(editable).direction === "rtl") {
            const selection = getSelection(editable)!;
            let granularity = "character";
            let alter = "move";
            if (evt.ctrlKey) {
                granularity = "word";
            }
            if (evt.shiftKey) {
                alter = "extend";
            }
            if (evt.code === "ArrowRight") {
                selection.modify(alter, "right", granularity);
                evt.preventDefault();
                return;
            } else if (evt.code === "ArrowLeft") {
                selection.modify(alter, "left", granularity);
                evt.preventDefault();
                return;
            }
        }
    });
}
