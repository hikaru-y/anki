// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

import { preloadExternalCSSs } from "./css";
import { preloadCustomFonts } from "./fonts";
import { preloadImages } from "./images";

const htmlDoc = document.implementation.createHTMLDocument();
const template = document.createElement("template");

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

// export async function preloadCustomFonts(html: string): Promise<void> {
//     template.innerHTML = html;
//     const styles = template.content.querySelectorAll("style");
//     const urls: string[] = [];
//     for (const style of styles) {
//         for (const rule of extractFontFaceRules(style)) {
//             urls.push(...extractUrls(rule));
//         }
//     }
//     if (urls.length) {
//         await Promise.race([
//             Promise.all(urls.map(loadElementPromise)),
//             new Promise((r) => setTimeout(r, 2000)),
//         ]);
//     }
// }

export function extractUrls(rule: CSSFontFaceRule): string[] {
    // todo: # ?
    const regex = /url\s*\(\s*(?<quote>["']?)(?<url>\S.*?)\k<quote>\s*\)/g;
    const src = rule.style.getPropertyValue("src");
    const matches = src.matchAll(regex);
    return [...matches].map((m) => (m.groups?.url ? m.groups.url : "")).filter(Boolean);
}

function createPreloadLink(
    { url, as }: { url: string; as: "image" | "font" },
): HTMLLinkElement {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = url;
    link.as = as;
    if (as === "font") {
        link.crossOrigin = "";
    }
    return link;
}

function loadElementPromise(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
        function onLoad() {
            resolve();
            document.head.removeChild(element);
        }
        element.addEventListener("load", onLoad);
        element.addEventListener("error", onLoad);
        document.head.appendChild(element);
    });
}

function loadElement(element: HTMLElement): void {
    function onLoad() {
        document.head.removeChild(element);
    }
    element.addEventListener("load", onLoad);
    element.addEventListener("error", onLoad);
    document.head.appendChild(element);
}

// ///////////////////////////////////////////

export function allImagesLoaded(): Promise<void[]> {
    return Promise.all(
        Array.from(document.getElementsByTagName("img")).map(imageLoaded),
    );
}

function imageLoaded(img: HTMLImageElement): Promise<void> {
    return img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", () => resolve());
            img.addEventListener("error", () => resolve());
        });
}

function extractImageSrcs(fragment: DocumentFragment): string[] {
    const srcs = ([...fragment.querySelectorAll("img[src]")] as HTMLImageElement[])
        .map(img => img.src);
    return srcs;
}

// export function preloadAnswerImages(html: string): void {
//     template.innerHTML = html;
//     extractImageSrcs(template.content).forEach((src) => loadImage(src, false));
// }

// export async function preloadImages(fragment: DocumentFragment): Promise<void> {
//     await Promise.all(
//         (<HTMLImageElement[]> [...fragment.querySelectorAll("img[src]")]).map((img) => {
//             const newimg = new Image();
//             newimg.src = img.src;
//             return imageLoaded(newimg);
//         }),
//     );
// }
