// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import type { EventTargetToMap } from "@tslib/events";
import { on } from "@tslib/events";
import type { Callback } from "@tslib/typing";
import type { Readable, Subscriber } from "svelte/store";
import { readable } from "svelte/store";

type Init<T> = { new(type: string): T; prototype: T };

/**
 * A store wrapping an event. Automatically adds/removes event handler upon
 * first/last subscriber. If `{capture: true}` is passed to `options`, we can
 * cancel Qt's default behavior by calling `stopPropagation()`.
 *
 * @remarks
 * Should probably always be used in conjunction with `subscribeToUpdates`.
 */
function eventStore<T extends EventTarget, K extends keyof EventTargetToMap<T>>(
    target: T,
    eventType: Exclude<K, symbol | number>,
    /**
     * Store needs an initial value. This should probably be a freshly
     * constructed event, e.g. `new MouseEvent("click")`.
     */
    constructor: Init<EventTargetToMap<T>[K]>,
    options?: AddEventListenerOptions,
): Readable<EventTargetToMap<T>[K]> {
    const initEvent = new constructor(eventType);
    return readable(
        initEvent,
        (set: Subscriber<EventTargetToMap<T>[K]>): Callback => on(target, eventType, set, options),
    );
}

export default eventStore;

/**
 * A click event that fires only if the mouse has not appreciably moved since the button
 * was pressed down. This was added so that if the user clicks inside a floating area and
 * drags the mouse outside the area while selecting text, it doesn't end up closing the
 * floating area.
 */
function mouseClickWithoutDragStore(): Readable<MouseEvent> {
    const initEvent = new MouseEvent("click");

    return readable(
        initEvent,
        (set: Subscriber<MouseEvent>): Callback => {
            let startingX: number;
            let startingY: number;
            function onMouseDown(evt: MouseEvent): void {
                startingX = evt.clientX;
                startingY = evt.clientY;
            }
            function onClick(evt: MouseEvent): void {
                if (Math.abs(startingX - evt.clientX) < 5 && Math.abs(startingY - evt.clientY) < 5) {
                    set(evt);
                }
            }
            document.addEventListener("mousedown", onMouseDown);
            document.addEventListener("click", onClick);
            return () => {
                console.log("mouseClickWithoutDragStore");
                document.removeEventListener("click", onClick);
                document.removeEventListener("mousedown", onMouseDown);
            };
        },
    );
}

/**
 * Returns a store that allows subscribers to handle keydown event of the escape key
 * in the capturing phase. Intended to be used to override Qt's default behavior by
 * calling stopPropagation() in the handler.
 */
// function keydownEscapeInCapturingPhaseStore(): Readable<KeyboardEvent> {
//     const initEvent = new KeyboardEvent("keydown");

//     return readable(
//         initEvent,
//         (set: Subscriber<KeyboardEvent>) => {
//             function onKeydown(evt: KeyboardEvent) {
//                 if (evt.key === "Escape") {
//                     set(evt);
//                 }
//             }
//             const opts: EventListenerOptions = { capture: true };
//             document.addEventListener("keydown", onKeydown, opts);
//             return () => {
//                 document.removeEventListener("keydown", onKeydown, opts);
//             };
//         },
//     );
// }

const documentClick = mouseClickWithoutDragStore();
const documentKeyup = eventStore(document, "keyup", KeyboardEvent);
const documentKeydownInCapturingPhase = eventStore(document, "keydown", KeyboardEvent, { capture: true });

export { documentClick, documentKeydownInCapturingPhase, documentKeyup };
