// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

const htmlDoc = document.implementation.createHTMLDocument();
const template = document.createElement("template");

export function preloadCustomFonts(fragment: DocumentFragment): Promise<void>[] {
    const styles = fragment.querySelectorAll("style");
    const urls: string[] = [];
    for (const style of styles) {
        const clonedStyle = style.cloneNode(true) as HTMLStyleElement;
        for (const rule of extractFontFaceRules(style)) {
            urls.push(...extractUrls(rule));
        }
    }
    return urls.map(injectPreloadLinkPromise);
}

export function extractCustomFontUrls(html: string): string[] {
    template.innerHTML = html;
    const styles = template.content.querySelectorAll("style");
    const urls: string[] = [];
    for (const style of styles) {
        for (const rule of extractFontFaceRules(style)) {
            urls.push(...extractUrls(rule));
        }
    }
    return urls;
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

function extractUrls(rule: CSSFontFaceRule): string[] {
    const regex = /url\s*\(\s*(?<quote>["']?)(?<url>\S.*?)\k<quote>\s*\)/g;
    const src = rule.style.getPropertyValue("src");
    const matches = src.matchAll(regex);
    return [...matches].map((m) => (m.groups?.url ? m.groups.url : "")).filter(Boolean);
}

function createPreloadLink(href: string, as: string): HTMLLinkElement {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = href;
    link.as = as;
    link.crossOrigin = "";
    return link;
}

export async function injectPreloadLinkPromise(href: string): Promise<void> {
    return new Promise((resolve) => {
        const link = createPreloadLink(href, "font");
        link.addEventListener("load", () => {
            resolve();
            document.head.removeChild(link);
        });
        link.addEventListener("error", () => {
            resolve();
            document.head.removeChild(link);
        });
        document.head.appendChild(link);
    });
}
