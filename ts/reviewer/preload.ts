// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

type CSSElement = HTMLStyleElement | HTMLLinkElement;

const template = document.createElement("template");

export async function preloadExternalResources(html: string): Promise<void> {
    template.innerHTML = html;
    const fragment = template.content;
    const cssPromises = preloadExternalCSSs(fragment);
    if (cssPromises.length) {
        await Promise.race(
            [Promise.all(cssPromises), new Promise((r) => setTimeout(r, 400))],
        );
    }
}

function loadResource(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        function resolveAndDelete(): void {
            resolve();
            document.head.removeChild(element);
        }
        element.addEventListener("load", resolveAndDelete);
        element.addEventListener("error", resolveAndDelete);
        document.head.appendChild(element);
    });
}

// CSS preloading

function extractExternalCSSs(fragment: DocumentFragment): CSSElement[] {
    return ([...fragment.querySelectorAll("style, link")] as CSSElement[]).filter(
        (css) =>
            (css instanceof HTMLStyleElement
                && css.innerHTML.includes("@import"))
            || (css instanceof HTMLLinkElement && css.rel === "stylesheet"),
    );
}

/** Prevent FOUC */
function preloadExternalCSSs(fragment: DocumentFragment): Promise<void>[] {
    const promises = extractExternalCSSs(fragment).map((css) => {
        // prevent the CSS from affecting the page rendering
        css.media = "print";

        return loadResource(css);
    });
    return promises;
}
