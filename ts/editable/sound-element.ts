// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { on } from "@tslib/events";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";

import type { DecoratedElement, DecoratedElementConstructor } from "./decorated";
import Sound_svelte from "./Sound.svelte";

const tagName = "anki-sound";
const filenamePattern = new RegExp(`<${tagName}>(.*)</${tagName}>`, "gu");
const startingDelimiter = "\\[sound:";
const endingDelimiter = "\\]";
const soundPattern = new RegExp(`${startingDelimiter}(.*?)${endingDelimiter}`, "gu");

export const Sound: DecoratedElementConstructor = class Sound extends HTMLElement implements DecoratedElement {
    static tagName = tagName;

    static toStored(undecorated: string): string {
        const stored = undecorated.replace(filenamePattern, (_match: string, text: string) => {
            return `[sound:${text}]`;
        });
        return stored;
    }

    static toUndecorated(stored: string): string {
        return stored.replace(soundPattern, (_match: string, filename: string) => {
            return `<${tagName}>${filename}</${tagName}>`;
        });
    }

    component?: Sound_svelte;

    // constructor() {
    //     super();
    //     this.filename = writable(this.innerHTML);
    //     this.filename.subscribe((filename) => {
    //         this.dataset.filename = filename;
    //         console.log("filename", filename);
    //     });
    // }

    connectedCallback(): void {
        this.decorate();
        // this.addEventListeners();
    }

    disconnectedCallback(): void {
        // this.removeEventListeners();
    }

    // attributeChangedCallback(name: string, old: string, newValue: string): void {
    //     if (newValue === old) {
    //         return;
    //     }

    //     switch (name) {
    //         case "block":
    //             this.block = newValue !== "false";
    //             this.component?.$set({ block: this.block });
    //             this.frame?.setAttribute("block", String(this.block));
    //             break;

    //         case "data-mathjax":
    //             if (typeof newValue !== "string") {
    //                 return;
    //             }
    //             this.component?.$set({ mathjax: newValue });
    //             break;
    //     }
    // }

    decorate(): void {
        console.log("deco");
        if (this.hasAttribute("decorated")) {
            // this.undecorate();
            return;
        }

        // if (this.parentElement?.tagName === FrameElement.tagName.toUpperCase()) {
        //     this.frame = this.parentElement as FrameElement;
        // } else {
        //     frameElement(this, this.block);
        //     /* Framing will place this element inside of an anki-frame element,
        //      * causing the connectedCallback to be called again.
        //      * If we'd continue decorating at this point, we'd loose all the information */
        //     return;
        // }

        this.dataset.filename = this.innerHTML;
        this.innerHTML = "";
        // this.style.display = "inline-block";

        this.component = new Sound_svelte({
            target: this,
            props: {
                filename: this.dataset.filename,
            },
        });

        // if (this.hasAttribute("focusonmount")) {
        //     let position: [number, number] | undefined = undefined;

        //     if (this.getAttribute("focusonmount")!.length > 0) {
        //         position = this.getAttribute("focusonmount")!
        //             .split(",")
        //             .map(Number) as [number, number];
        //     }

        //     this.component.moveCaretAfter(position);
        // }

        // this.setAttribute("contentEditable", "false");
        this.setAttribute("decorated", "true");
    }

    undecorate(): void {
        console.log("undeco");
        // if (this.parentElement?.tagName === FrameElement.tagName.toUpperCase()) {
        //     this.parentElement.replaceWith(this);
        // }

        // this.innerHTML = this.dataset.filename ?? "";
        // delete this.dataset.mathjax;
        // this.removeAttribute("style");
        // this.removeAttribute("focusonmount");

        // if (this.block) {
        //     this.setAttribute("block", "true");
        // } else {
        //     this.removeAttribute("block");
        // }

        this.removeAttribute("contentEditable");
        this.removeAttribute("decorated");
    }

    removeMoveInStart?: () => void;
    removeMoveInEnd?: () => void;

    addEventListeners(): void {
        // this.removeMoveInStart = on(
        //     this,
        //     "moveinstart" as keyof HTMLElementEventMap,
        //     () => this.component!.selectAll(),
        // );

        // this.removeMoveInEnd = on(this, "moveinend" as keyof HTMLElementEventMap, () => this.component!.selectAll());
    }

    removeEventListeners(): void {
        // this.removeMoveInStart?.();
        // this.removeMoveInStart = undefined;

        // this.removeMoveInEnd?.();
        // this.removeMoveInEnd = undefined;
    }
};
