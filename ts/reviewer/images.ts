// Copyright: Ankitects Pty Ltd and contributors
// License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

function injectPreloadLink(href: string, as: string): void {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
}

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

function clearPreloadLinks(): void {
    document.head
        .querySelectorAll("link[rel='preload']")
        .forEach((link) => link.remove());
}

function extractImageSrcs(html: string): string[] {
    const tmpl = document.createElement("template");
    tmpl.innerHTML = html;
    const fragment = tmpl.content;
    const srcs = [...fragment.querySelectorAll("img[src]")].map(
        (img) => (img as HTMLImageElement).src,
    );
    return srcs;
}

export function preloadAnswerImages(qHtml: string, aHtml: string): void {
    clearPreloadLinks();
    const aSrcs = extractImageSrcs(aHtml);
    if (aSrcs.length) {
        const qSrcs = extractImageSrcs(qHtml);
        const diff = aSrcs.filter((src) => !qSrcs.includes(src));
        diff.forEach((src) => injectPreloadLink(src, "image"));
    }
}

export async function maybePreloadImages(html: string): Promise<void> {
    const srcs = extractImageSrcs(html);
    await Promise.race([
        Promise.all(
            srcs.map((src) => {
                const img = new Image();
                img.src = src;
                return imageLoaded(img);
            }),
        ),
        new Promise((r) => setTimeout(r, 100)),
    ]);
}

export function loadImage(src: string, promise = true): Promise<void> | void {
    const img = new Image();
    img.src = src;
    if (promise) {
        return imageLoaded(img);
    }
}

// export async function preloadImages(fragment: DocumentFragment): Promise<void> {
//     await Promise.all(
//         (<HTMLImageElement[]> [...fragment.querySelectorAll("img[src]")]).map((img) => {
//             const newimg = new Image();
//             newimg.src = img.src;
//             return imageLoaded(newimg);
//         }),
//     );
// }

/**
 * prevent flickering & layout shift on image load
 */
export function preloadImages(fragment: DocumentFragment): Promise<void>[] {
    const imgs = [...fragment.querySelectorAll("img[src]")] as HTMLImageElement[];
    return imgs.map((img) => {
        const newimg = new Image();
        newimg.src = img.src;
        return imageLoaded(newimg);
    });
}
