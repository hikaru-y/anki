// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { preloadImages } from "./images";

type CSSElement = HTMLStyleElement | HTMLLinkElement;

const htmlDoc = document.implementation.createHTMLDocument();
const template = document.createElement("template");

/**
 * Prevent FOUC
 */
function preloadExternalCSSs(fragment: DocumentFragment): Promise<void>[] {
    const promises = extractExternalCSSs(fragment).map((css) => {
        // prevents the css from affecting the page rendering
        css.media = "print";

        return loadResource(css);
    });
    return promises;
}

function extractExternalCSSs(fragment: DocumentFragment): CSSElement[] {
    return ([...fragment.querySelectorAll("style, link")] as CSSElement[]).filter(
        (css) =>
            (css instanceof HTMLStyleElement
                && css.innerHTML.includes("@import"))
            || (css instanceof HTMLLinkElement && css.rel === "stylesheet"),
    );
}

function loadResource(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        function resolveAndDelete() {
            resolve();
            document.head.removeChild(element);
        }
        element.addEventListener("load", resolveAndDelete);
        element.addEventListener("error", resolveAndDelete);
        document.head.appendChild(element);
    });
}

export async function preloadExternalResources(html: string): Promise<void> {
    template.innerHTML = html;
    const fragment = template.content;
    const cssPromises = preloadExternalCSSs(fragment);
    const fontPromises = preloadCustomFonts(fragment);
    const imgPromises = preloadImages(fragment);
    let timeout = 0;
    if (fontPromises.length) {
        timeout = 800;
    } else if (cssPromises.length) {
        timeout = 500;
    } else if (imgPromises.length) {
        timeout = 200;
    }
    const promises = [...cssPromises, ...fontPromises, ...imgPromises];
    if (promises.length) {
        await Promise.race(
            [Promise.all(promises), new Promise((r) => setTimeout(r, timeout))],
        );
    }
}

function extractURLs(rule: CSSFontFaceRule): string[] {
    // todo: # ?
    const pattern = /url\s*\(\s*(?<quote>["']?)(?<url>\S.*?)\k<quote>\s*\)/g;
    const src = rule.style.getPropertyValue("src");
    const matches = src.matchAll(pattern);
    return [...matches].map((m) => (m.groups?.url ? m.groups.url : "")).filter(Boolean);
}

function createPreloadLink(href: string, as: string): HTMLLinkElement {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = href;
    link.as = as;
    if (as === "font") {
        link.crossOrigin = "";
    }
    return link;
}

function preloadCustomFonts(fragment: DocumentFragment): Promise<void>[] {
    const styles = fragment.querySelectorAll("style");
    const urls: string[] = [];
    for (const style of styles) {
        for (const rule of extractFontFaceRules(style)) {
            urls.push(...extractURLs(rule));
        }
    }
    const promises = urls.map((url) => {
        const link = createPreloadLink(url, "font");
        return loadResource(link);
    });
    return promises;
}

function extractFontFaceRules(style: HTMLStyleElement): CSSFontFaceRule[] {
    htmlDoc.head.innerHTML = "";

    // Needs to be attached to an HTMLDocument before accessing 'sheet' property
    htmlDoc.head.appendChild(style);

    const fontFaceRules: CSSFontFaceRule[] = [];
    if (style.sheet) {
        for (const rule of style.sheet.cssRules) {
            if (rule instanceof CSSFontFaceRule) {
                fontFaceRules.push(rule);
            }
        }
    }
    return fontFaceRules;
}
