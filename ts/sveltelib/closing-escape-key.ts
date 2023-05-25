import { readable } from "svelte/store";

import type { EventPredicateResult } from "./event-predicate";

const reason = "escape key";

/**
 * A store that notifies subscribers that the escape key has been pressed so the
 * floating element should be closed, and also allows subscribers to override Qt's
 * default behavior by calling `stopPropagation()`.
 */
export const closingEscapeKey = readable<EventPredicateResult>(
    { reason, originalEvent: new KeyboardEvent("keydown") },
    (set) => {
        function onKeydown(evt: KeyboardEvent) {
            if (evt.key === "Escape") {
                set({ reason, originalEvent: evt });
            }
        }
        const opts: EventListenerOptions = { capture: true };
        document.addEventListener("keydown", onKeydown, opts);
        return () => {
            console.log("no subscribers");
            document.removeEventListener("keydown", onKeydown, opts);
        };
    },
);
